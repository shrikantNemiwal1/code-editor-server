app.post("/formatcode", async (req, res) => {
    const isInvalidRequest = validateRequest(req.query, {
      code: true,
      language: true,
    });

    if (isInvalidRequest)
      throw new ErrorClass("Invalid request, check payload", 400);

    const language = req.body.language;
    if (!languages.includes(language))
      throw new ErrorClass(`${language} language, Not found!`, 400);

    const { code } = req.body;
    console.log(code);

    const formattedCode = await formatCode(code, language);
    console.log(formattedCode);
    res.send(formattedCode);
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
          return code;
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
          return code;
        }
      case "C":
      case "C++":
        try {
          return execSync("clang-format -style=file", {
            input: code,
            encoding: "utf-8",
          });
        } catch (error) {
          console.error("Error running autopep8:", error.message);
          return code;
        }
      case "C#":
        try {
          exec(
            `echo "${code}" | dotnet format --check -`,
            { input: code },
            (error, stdout, stderr) => {
              if (error) {
                console.error(stderr);
                return "Error";
              } else {
                // Successful formatting
                return stdout;
              }
            }
          );
        } catch (error) {
          return error;
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
          return code;
        }
      case "Go":
        try {
          return execSync("gofmt", {
            input: code,
            encoding: "utf-8",
          });
        } catch (error) {
          console.error("Error formatting JavaScript code:", error.message);
          return code;
        }
    }

    return code;
  }