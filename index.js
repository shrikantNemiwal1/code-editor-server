const express = require("express");
const { exec, execSync } = require("child_process");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const port = 8080;
// const cluster = require("cluster");
// const totalCPUs = require("os").availableParallelism();
const ErrorClass = require("./services/error");
const { validateRequest } = require("./services/common.utils");
const prettier = require("prettier");

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

// if (cluster.isPrimary) {
//   console.log(`Number of CPUs is ${totalCPUs}`);
//   console.log(`Primary ${process.pid} is running`);

//   // Fork workers.
//   for (let i = 0; i < totalCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on("exit", (worker, code, signal) => {
//     console.log(`worker ${worker.process.pid} died`);
//     console.log("Let's fork another worker!");
//     cluster.fork();
//   });
// } else {
const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Server is working..." });
});

const tempDir = "./temp/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.post("/formatcode", async (req, res) => {
  try {
    const isInvalidRequest = validateRequest(req.query, {
      code: true,
      language: true,
    });

    if (isInvalidRequest) {
      throw new ErrorClass("Invalid request, check payload", 400);
    }

    const language = req.body.language;
    if (!languages.includes(language)) {
      throw new ErrorClass(`${language} language, Not found!`, 400);
    }

    const { code } = req.body;
    console.log(code);

    const formattedCode = await formatCode(code, language);
    console.log(formattedCode);
    res.json({ formattedCode });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(error.statusCode || 500).send(error.message);
  }
});

async function formatCode(code, language) {
  switch (language) {
    case "Python":
      try {
        return execSync(`autopep8 --max-line-length 100 --indent-size 4 -`, {
          input: code,
          encoding: "utf-8",
        });
      } catch (error) {
        console.error("Error running autopep8:", error.message);
        throw new ErrorClass("Error formatting Python code", 500);
      }
    case "Java":
      const jarPath =
        '"C:/Program Files/Java/google-java-format-1.19.1-all-deps.jar"';
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}.java`);
      fs.writeFileSync(tempFilePath, code, "utf-8");

      try {
        execSync(`java -jar ${jarPath} --replace ${tempFilePath}`);

        const formattedContent = fs.readFileSync(tempFilePath, "utf-8");
        fs.unlinkSync(tempFilePath);
        return formattedContent;
      } catch (error) {
        console.error("Error running google-java-format:", error.message);

        fs.unlinkSync(tempFilePath);
        throw new ErrorClass("Error formatting Java code", 500);
      }
    case "C":
    case "C++":
      try {
        return execSync("clang-format -style=file", {
          input: code,
          encoding: "utf-8",
        });
      } catch (error) {
        console.error("Error running clang-format:", error.message);
        throw new ErrorClass(`Error formatting ${language} code`, 500);
      }
    case "C#":
      try {
        exec(
          `echo "${code}" | dotnet format --check -`,
          { input: code },
          (error, stdout, stderr) => {
            if (error) {
              console.error(stderr);
              throw new ErrorClass(`Error formatting ${language} code`, 500);
            } else {
              // Successful formatting
              return stdout;
            }
          }
        );
      } catch (error) {
        console.log(error);
        throw new ErrorClass(`Error formatting ${language} code`, 500);
      }
    case "JavaScript":
      try {
        const formattedCode = await prettier.format(code, {
          semi: false,
          parser: "babel",
        });
        return formattedCode;
      } catch (error) {
        console.error("Error formatting JavaScript code:", error.message);
        throw new ErrorClass("Error formatting JavaScript code", 500);
      }
    case "Go":
      try {
        return execSync("gofmt", {
          input: code,
          encoding: "utf-8",
        });
      } catch (error) {
        console.error("Error running gofmt:", error.message);
        throw new ErrorClass("Error formatting Go code", 500);
      }
  }
}

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
    executeRunCommand(res, language, codeFileName, inputFileContent, req.body);
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
    "C++": "./output < input.txt",
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

app.listen(port, "0.0.0.0", () => {
  console.log(`App listening on port ${port}`);
});
// }
