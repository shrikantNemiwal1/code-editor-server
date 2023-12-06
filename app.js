const express = require("express");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

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

app.post("/runcode", (req, res) => {
  const codeToCompile = req.body.code;
  const inputFileContent = req.body.input;

  fs.writeFileSync("code.cpp", codeToCompile);
  fs.writeFileSync("input.txt", inputFileContent);

  const compileCommand = `g++ code.cpp -o output`;
  exec(compileCommand, (compileError, compileStdout, compileStderr) => {
    if (compileError) {
      res
        .status(500)
        .json({ error: "Compilation error", details: compileStderr });
    } else {
      const runCommand = "./output < input.txt";
      exec(runCommand, (runError, runStdout, runStderr) => {
        if (runError) {
          res.status(500).json({ error: "Runtime error", details: runStderr });
        } else {
          res.json({ output: runStdout });
        }
      });
    }
  });
});

module.exports = app;
