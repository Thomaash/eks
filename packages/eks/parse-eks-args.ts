import { parseArgs } from "@std/cli/parse-args";

/**
 * Resolved CLI arguments for `eks`.
 *
 * @property multiple - Whether the user requested the multi-select editing flow.
 * @property editor - The single editor executable name to use for interactive editing
 *   and failure-log viewing. Resolved from `--editor`, then `$VISUAL`, then `$EDITOR`,
 *   then `nano`. Treated as a single executable, not a shell command string.
 */
export type EksArgs = {
  multiple: boolean;
  editor: string;
};

/**
 * Parses raw CLI arguments and resolves the effective editor executable.
 *
 * Editor precedence: `--editor`, `$VISUAL`, `$EDITOR`, then `nano`.
 *
 * @param args - Raw CLI arguments (typically `Deno.args`).
 * @param env - Environment accessor (typically `Deno.env`).
 * @returns The resolved `EksArgs`.
 */
export function parseEksArgs(
  args: string[],
  env: Pick<typeof Deno.env, "get">,
): EksArgs {
  const parsed = parseArgs(args, {
    boolean: ["multiple"],
    string: ["editor"],
    default: {
      multiple: false,
      editor: env.get("VISUAL") ?? env.get("EDITOR") ?? "nano",
    },
  });

  return {
    multiple: parsed.multiple,
    editor: parsed.editor,
  };
}
