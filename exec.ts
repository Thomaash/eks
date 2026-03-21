import { resolve } from "@std/path/resolve";

export async function execNpfsScripts(
  cwd: string,
  todoFileArg: string,
): Promise<void> {
  const tempDirPath = await Deno.makeTempDir();
  try {
    const todoFile = resolve(todoFileArg);

    const todos = (await Deno.readTextFile(todoFile))
      .trim()
      .split("\n")
      .map((line): string => line.trimStart())
      .filter((line): boolean => !line.startsWith("#"))
      .map((line): string => line.split("#")[0])
      .map((line): string => line.trimEnd())
      .map((line): string =>
        /^\s*$/.test(line) ? "" : `LC_ALL=en_US.UTF-8 ${line}`,
      )
      .join("\n")
      .split(/\n{2,}/)
      .map((block): string[] => block.split("\n"));

    console.info("[PLAN]", todos);
    console.info("");

    const textDecoder = new TextDecoder();

    for (const serial of todos) {
      const promises = serial.map(async (command, i): Promise<void> => {
        console.info("[EXEC]", command);
        try {
          const command2 = new Deno.Command("dash", {
            args: ["-c", command],
            cwd,
            stdin: "null",
            stdout: "piped",
            stderr: "piped",
          });
          const output = await command2.output();

          if (!output.success) {
            await Deno.writeTextFile(
              resolve(tempDirPath, i + ".stdout.log"),
              command + "\n\n" + textDecoder.decode(output.stdout),
            );
            await Deno.writeTextFile(
              resolve(tempDirPath, i + ".stderr.log"),
              command + "\n\n" + textDecoder.decode(output.stderr),
            );

            throw new Error(`Command failed with ${output.code}: ${command}`);
          }

          console.info("[OKAY]", command);
        } catch (error) {
          console.info("[FAIL]", command);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      await Promise.all(promises);

      console.info("");
    }

    console.info("[DONE]");
    console.info("");
  } catch (error) {
    const logFilePaths = Array.from(Deno.readDirSync(tempDirPath))
      .filter((entry) => entry.isFile)
      .map((entry) => `${tempDirPath}/${entry.name}`);
    if (logFilePaths.length > 0) {
      const command = new Deno.Command("vw", {
        args: ["--", ...logFilePaths],
        cwd: tempDirPath,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      await command.output();
    }

    throw error;
  } finally {
    await Deno.remove(tempDirPath, { recursive: true });
  }
}
