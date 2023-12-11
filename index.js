const express = require("express");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const port = 3000;
const cluster = require("cluster");
const totalCPUs = require("os").availableParallelism();
const ErrorClass = require("./services/error");
const { validateRequest } = require("./services/common.utils");
const languages = [
  "C++",
  "Python",
  "Java",
  "C",
  "C#",
  "JavaScript",
  "Ruby",
  "Go",
  "Kotlin",
];

if (cluster.isPrimary) {
  console.log(`Number of CPUs is ${totalCPUs}`);
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    console.log("Let's fork another worker!");
    cluster.fork();
  });
} else {
  const app = express();
  const urlencodedParser = bodyParser.urlencoded({ extended: false });

  app.use(bodyParser.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.json({ message: "Server is working..." });
  });

  app.post("/runcode", async (req, res) => {
    const isInvalidRequest = validateRequest(req.query, {
      code: true,
      input: true,
      language: true,
    });

    if (isInvalidRequest)
      throw new ErrorClass("Invalid request, check payload", 400);

    const language = req.body.language;
    if (!languages.includes(language))
      throw new ErrorClass(`${language} language, Not found!`, 400);

    const codeFileName = getCodeFileName(language);
    const inputFileContent = req.body.input;

    fs.writeFileSync(codeFileName, req.body.code);
    fs.writeFileSync("input.txt", inputFileContent);

    const compileCommand = getCompileCommand(language, codeFileName);

    if (compileCommand) {
      exec(compileCommand, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          handleError(res, "Compilation error", compileStderr, req.body);
        } else {
          executeRunCommand(
            res,
            language,
            codeFileName,
            inputFileContent,
            req.body
          );
        }
      });
    } else {
      executeRunCommand(
        res,
        language,
        codeFileName,
        inputFileContent,
        req.body
      );
    }
  });

  function getCodeFileName(language) {
    return {
      "C++": "code.cpp",
      Python: "code.py",
      Java: "Main.java",
      C: "code.c",
      "C#": "Program.cs",
      JavaScript: "code.js",
      Ruby: "program.rb",
      Go: "main.go",
      Kotlin: "Program.kt",
    }[language];
  }

  function getCompileCommand(language, codeFileName) {
    return {
      "C++": `g++ ${codeFileName} -o output`,
      Java: `javac ${codeFileName}`,
      C: `gcc ${codeFileName} -o output`,
      Go: `go build ${codeFileName}`,
      Kotlin: `kotlinc ${codeFileName} -include-runtime -d Program.jar`,
    }[language];
  }

  function executeRunCommand(
    res,
    language,
    codeFileName,
    inputFileContent,
    requestBody
  ) {
    const runCommand = getRunCommand(language, codeFileName);
    exec(runCommand, (runError, runStdout, runStderr) => {
      if (runError) {
        handleError(res, "Runtime error", runStderr, requestBody);
      } else {
        res.json({
          success: true,
          output: runStdout,
          code: requestBody.code,
          input: inputFileContent,
          language,
        });
      }
    });
  }

  function getRunCommand(language, codeFileName) {
    return {
      "C++": "output < input.txt",
      Python: `python ${codeFileName} < input.txt`,
      Java: `java ${codeFileName.replace(".java", "")} < input.txt`,
      C: "output < input.txt",
      "C#": `dotnet script ${codeFileName} < input.txt`,
      JavaScript: `node ${codeFileName}`,
      Ruby: `ruby ${codeFileName} < input.txt`,
      Go: `${codeFileName.replace(".go", "")} < input.txt`,
      Kotlin: `java -jar Program.jar < input.txt`,
    }[language];
  }

  function handleError(res, errorType, details, requestBody) {
    res.status(200).json({
      success: false,
      errorType,
      output: details,
      code: requestBody.code,
      input: requestBody.input,
      language: requestBody.language,
    });
  }

  // Handling all other routes with a 404 error
  app.all("*", (req, res, next) => {
    next(new ErrorClass(`Requested URL ${req.path} not found!`, 404));
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    const errorCode = err.code || 500;
    res.status(errorCode).send({
      message: err.message || "Internal Server Error. Something went wrong!",
      status: errorCode,
    });
  });

  app.listen(port, () => {
    // console.log(`App listening on port ${port}`);
  });
}
