import { resolve } from "@std/path/resolve";

/**
 * Parses a script file into batches of shell commands.
 *
 * Lines starting with `#` are treated as comments and removed.
 * Blank lines delimit batches — commands within a batch run concurrently, while batches run sequentially.
 *
 * @param scriptContent - Raw text content of the script file.
 * @returns A two-dimensional array where each inner array is a batch of commands to run concurrently.
 */
function parseCommandBatches(scriptContent: string): string[][] {
  return scriptContent
    .trim()
    .split("\n")
    .map((line): string => line.trimStart())
    .filter((line): boolean => !line.startsWith("#"))
    .map((line): string => line.split("#")[0])
    .map((line): string => line.trimEnd())
    .join("\n")
    .split(/\n{2,}/)
    .map((block): string[] => block.split("\n"));
}

/**
 * Executes a single shell command via `dash` and logs its outcome.
 *
 * On failure, stdout and stderr are written to log files in the temp directory for later inspection.
 *
 * @param command - The shell command string to execute.
 * @param index - Numeric index used to name the log files.
 * @param cwd - Working directory for the command.
 * @param tempDirPath - Temporary directory for storing failure log files.
 * @throws {Error} If the command exits with a non-zero code.
 */
async function runCommand(
  command: string,
  index: number,
  cwd: string,
  tempDirPath: string,
): Promise<void> {
  console.info("[EXEC]", command);
  try {
    const process = new Deno.Command("dash", {
      args: ["-c", command],
      cwd,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
      env: {
        LC_ALL: "en_US.UTF-8",
      },
    });
    const output = await process.output();

    if (!output.success) {
      const textDecoder = new TextDecoder();
      await Deno.writeTextFile(
        resolve(tempDirPath, index + ".stdout.log"),
        command + "\n\n" + textDecoder.decode(output.stdout),
      );
      await Deno.writeTextFile(
        resolve(tempDirPath, index + ".stderr.log"),
        command + "\n\n" + textDecoder.decode(output.stderr),
      );

      throw new Error(`Command failed with ${output.code}: ${command}`);
    }

    console.info("[OKAY]", command);
  } catch (error) {
    console.info("[FAIL]", command);
    throw error;
  }
}

/**
 * Opens collected log files in the resolved editor, best-effort.
 *
 * If the editor cannot be launched (e.g. not installed), the function returns silently
 * so the caller can continue cleanup and re-throw the original execution error.
 *
 * @param tempDirPath - Directory containing `.stdout.log` and `.stderr.log` files.
 * @param editor - Editor executable name to launch.
 */
async function openLogViewer(
  tempDirPath: string,
  editor: string,
): Promise<void> {
  const logFilePaths = Array.from(Deno.readDirSync(tempDirPath))
    .filter((entry) => entry.isFile)
    .map((entry) => `${tempDirPath}/${entry.name}`);

  if (logFilePaths.length === 0) return;

  try {
    const command = new Deno.Command(editor, {
      args: logFilePaths,
      cwd: tempDirPath,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    await command.output();
  } catch {
    // editor not available — proceed with re-throwing original error
  }
}

/**
 * Options for {@link execEkssScripts}.
 *
 * @property editor - Editor executable used to open failure logs (best-effort).
 */
export type ExecEkssScriptsOptions = {
  editor: string;
};

/**
 * Reads a script file and executes its commands in batches.
 *
 * Commands within a batch run concurrently; batches run sequentially.
 * Comment lines (starting with `#`) are ignored, and blank lines separate batches.
 * On failure, log files are opened in the resolved editor (best-effort) before the error is re-thrown.
 *
 * @param cwd - Working directory for all commands.
 * @param scriptFileArg - Path to the script file to execute.
 * @param options - See {@link ExecEkssScriptsOptions}.
 * @throws {Error} If any command in any batch fails.
 *
 * @example
 * ```ts
 * await execEkssScripts("/project", "./scripts/deploy.sh", { editor: "nano" });
 * ```
 */
export async function execEkssScripts(
  cwd: string,
  scriptFileArg: string,
  options: ExecEkssScriptsOptions,
): Promise<void> {
  const { editor } = options;
  const tempDirPath = await Deno.makeTempDir();
  try {
    const scriptFilePath = resolve(scriptFileArg);
    const scriptContent = await Deno.readTextFile(scriptFilePath);
    const commandBatches = parseCommandBatches(scriptContent);

    console.info("[PLAN]", commandBatches);
    console.info("");

    for (const serialBatch of commandBatches) {
      const promises = serialBatch.map((command, index) =>
        runCommand(command, index, cwd, tempDirPath)
      );

      await Promise.allSettled(promises);
      await Promise.all(promises);

      console.info("");
    }

    console.info("[DONE]");
    console.info("");
  } catch (error) {
    await openLogViewer(tempDirPath, editor);
    throw error;
  } finally {
    await Deno.remove(tempDirPath, { recursive: true });
  }
}
