const express = require("express");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const { validateRequest } = require("./services/common.utils");
const ErrorClass = require("./services/error");

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

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

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Server is working..." });
});

app.post("/", (req, res) => {
  res.json({
    body: req.body,
  });
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

  const codeToCompile = req.body.code;
  const inputFileContent = req.body.input;

  switch (language) {
    case "C++":
      fs.writeFileSync("code.cpp", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);
      const compileCommand = `g++ code.cpp -o output`;

      exec(compileCommand, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          res.status(200).json({
            status: false,
            errorType: "Compilation error",
            details: compileStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          const runCommand = "output < input.txt"; // ./output for linux and output for windows
          exec(runCommand, (runError, runStdout, runStderr) => {
            if (runError) {
              res.status(200).json({
                success: false,
                errorType: "Runtime error",
                details: runStderr,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            } else {
              res.json({
                success: true,
                output: runStdout,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            }
          });
        }
      });
      break;

    case "Python":
      fs.writeFileSync("code.py", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);
      const runCommand = `python code.py < input.txt`;

      exec(runCommand, (runError, runStdout, runStderr) => {
        if (runError) {
          res.status(200).json({
            succes: false,
            errorType: "Runtime error",
            details: runStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          res.json({
            success: true,
            output: runStdout,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        }
      });
      break;
    case "Java":
      fs.writeFileSync("Main.java", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);
      const compileCommandJava = `javac Main.java`;

      exec(compileCommandJava, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          res.status(200).json({
            success: false,
            errorType: "Compilation error",
            details: compileStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          const runCommandJava = `java Main < input.txt`;
          exec(runCommandJava, (runError, runStdout, runStderr) => {
            if (runError) {
              res.status(200).json({
                success: false,
                errorType: "Runtime error",
                details: runStderr,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            } else {
              res.json({
                success: true,
                output: runStdout,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            }
          });
        }
      });
      break;
    case "C":
      fs.writeFileSync("code.c", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);
      const compileCommandC = `g++ code.c -o output`;

      exec(compileCommandC, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          res.status(200).json({
            success: false,
            errorType: "Compilation error",
            details: compileStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          const runCommandC = "output < input.txt"; // Use "./output" for Linux, "output" for Windows
          exec(runCommandC, (runError, runStdout, runStderr) => {
            if (runError) {
              res.status(200).json({
                success: false,
                errorType: "Runtime error",
                details: runStderr,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            } else {
              res.json({
                success: true,
                output: runStdout,
                code: codeToCompile,
                input: inputFileContent,
                language,
              });
            }
          });
        }
      });
      break;
    case "C#":
      fs.writeFileSync("Program.cs", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);

      const runCommandCSharp = `dotnet script Program.cs < input.txt`;

      exec(runCommandCSharp, (runError, runStdout, runStderr) => {
        if (runError) {
          res.status(200).json({
            success: false,
            errorType: "Runtime error",
            details: runStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          res.json({
            success: true,
            output: runStdout,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        }
      });
      break;
    case "Ruby":
      fs.writeFileSync("program.rb", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);

      const runCommandRuby = `ruby program.rb < input.txt`;

      exec(runCommandRuby, (runError, runStdout, runStderr) => {
        if (runError) {
          res.status(200).json({
            success: false,
            errorType: "Runtime error",
            details: runStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          res.json({
            success: true,
            output: runStdout,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        }
      });
      break;
    case "Kotlin":
      fs.writeFileSync("Program.kt", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);

      const compileCommandKotlin = `kotlinc Program.kt -include-runtime -d Program.jar`;

      exec(
        compileCommandKotlin,
        (compileError, compileStdout, compileStderr) => {
          if (compileError) {
            res.status(200).json({
              success: false,
              errorType: "Compilation error",
              details: compileStderr,
              code: codeToCompile,
              input: inputFileContent,
              language,
            });
          } else {
            const runCommandKotlin = `java -jar Program.jar < input.txt`;
            exec(runCommandKotlin, (runError, runStdout, runStderr) => {
              if (runError) {
                res.status(200).json({
                  success: false,
                  errorType: "Runtime error",
                  details: runStderr,
                  code: codeToCompile,
                  input: inputFileContent,
                  language,
                });
              } else {
                res.json({
                  success: true,
                  output: runStdout,
                  code: codeToCompile,
                  input: inputFileContent,
                  language,
                });
              }
            });
          }
        }
      );
      break;
    case "Go":
      fs.writeFileSync("main.go", codeToCompile);
      fs.writeFileSync("input.txt", inputFileContent);

      const runCommandGo = `go run main.go < input.txt`;

      exec(runCommandGo, (runError, runStdout, runStderr) => {
        if (runError) {
          res.status(200).json({
            success: false,
            errorType: "Runtime error",
            details: runStderr,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        } else {
          res.json({
            success: true,
            output: runStdout,
            code: codeToCompile,
            input: inputFileContent,
            language,
          });
        }
      });
      break;
    case "javaScript":
      try {
        // Assuming the JavaScript code is a function for simplicity
        const runResult = eval(`(${codeToExecute})()`);

        res.json({
          success: true,
          output: runResult,
          code: codeToExecute,
          input: inputFileContent,
          language,
        });
      } catch (error) {
        res.status(200).json({
          success: false,
          errorType: "Runtime error",
          details: error.message,
          code: codeToExecute,
          input: inputFileContent,
          language,
        });
      }
      break;
  }
});

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

module.exports = app;
