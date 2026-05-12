import { execEkssScripts } from "./exec.ts";
import { findAllScripts } from "./find-all-scripts.ts";

/**
 * Discovers all project scripts, writes them to a temp file, and opens it in `vw` for the user to edit.
 * Uncommented/remaining lines are then executed as batched commands via {@link execEkssScripts}.
 *
 * @returns The exit code from `vw` (non-zero if the user aborted), or the result of script execution.
 *
 * @example
 * ```ts
 * const exitCode = await pickMultiple();
 * Deno.exit(exitCode);
 * ```
 */
export async function pickMultiple(): Promise<number> {
  const scripts = await findAllScripts();

  const tempFilePath = await Deno.makeTempFile();
  try {
    await Deno.writeTextFile(tempFilePath, scripts.join("\n"));

    const command = new Deno.Command("vw", {
      args: ["--", tempFilePath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const output = await command.output();

    if (output.success) {
      await execEkssScripts(Deno.cwd(), tempFilePath);
    }

    return output.code;
  } finally {
    await Deno.remove(tempFilePath);
  }
}
