import { execEkssScripts } from "./exec.ts";
import { findAllScripts } from "./find-all-scripts.ts";

/**
 * Options for {@link pickMultiple}.
 *
 * @property editor - Editor executable used to open the temp script file for editing
 *   and, on failure, to open the generated log files.
 */
export type PickMultipleOptions = {
  editor: string;
};

/**
 * Discovers all project scripts, writes them to a temp file, and opens it in the resolved editor for the user to edit.
 * Uncommented/remaining lines are then executed as batched commands via {@link execEkssScripts}.
 *
 * @param options - See {@link PickMultipleOptions}.
 * @returns The exit code from the editor (non-zero if the user aborted), or the result of script execution.
 *
 * @example
 * ```ts
 * const exitCode = await pickMultiple({ editor: "nano" });
 * Deno.exit(exitCode);
 * ```
 */
export async function pickMultiple(
  options: PickMultipleOptions,
): Promise<number> {
  const { editor } = options;
  const scripts = await findAllScripts();

  const tempFilePath = await Deno.makeTempFile();
  try {
    await Deno.writeTextFile(tempFilePath, scripts.join("\n"));

    const command = new Deno.Command(editor, {
      args: [tempFilePath],
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
