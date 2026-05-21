import { parseArgs } from "@std/cli/parse-args";

/**
 * Resolved CLI arguments for `eks`.
 *
 * @property multiple - Whether the user requested the multi-select editing flow.
 * @property editor - The single editor executable name to use for interactive editing
 *   and failure-log viewing. Resolved from `--editor`, then `$VISUAL`, then `$EDITOR`,
 *   then `nano`. Treated as a single executable, not a shell command string.
 * @property skipDirs - Additive union of `--skip-dir` flag values (collected in order)
 *   and `EKS_SKIP_DIRS` env-var segments (PATH-style, colon-delimited), with empty
 *   entries discarded. Order is flag-first, env-second. Built-in
 *   defaults like `.git` and `node_modules` are applied separately inside the walker;
 *   this field holds only user-supplied extras.
 */
export type EksArgs = {
  multiple: boolean;
  editor: string;
  skipDirs: string[];
};

/**
 * Parses raw CLI arguments and resolves the effective editor executable.
 *
 * Editor precedence: `--editor`, `$VISUAL`, `$EDITOR`, then `nano`.
 *
 * Also reads `EKS_SKIP_DIRS` (colon-delimited, PATH-style) and combines those
 * segments with any `--skip-dir` flag values into the resolved `skipDirs` list
 * (flag entries first, env entries second).
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
    string: ["editor", "skip-dir"],
    collect: ["skip-dir"],
    default: {
      multiple: false,
      editor: env.get("VISUAL") ?? env.get("EDITOR") ?? "nano",
    },
  });

  const flagSkipDirs = normalizeSkipDirs(parsed["skip-dir"] as string[]);
  const envSkipDirs = normalizeSkipDirs(
    (env.get("EKS_SKIP_DIRS") ?? "").split(":"),
  );
  const skipDirs = [...flagSkipDirs, ...envSkipDirs];

  return {
    multiple: parsed.multiple,
    editor: parsed.editor,
    skipDirs,
  };
}

function normalizeSkipDirs(values: string[]): string[] {
  return values.filter((v) => v !== "");
}
