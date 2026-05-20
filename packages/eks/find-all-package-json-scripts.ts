import type { CommandEntry } from "./find-all-scripts-types.ts";
import { walk } from "@std/fs/walk";
import { dirname } from "@std/path/dirname";
import { relative } from "@std/path/relative";

const DEFAULT_SKIP_DIRS = [
  ".git",
  "node_modules",
  ".pnpm-store",
  ".cache",
  ".output",
  "dist",
];

/**
 * Builds the directory-skip regex used by the walker. Unions the caller-
 * supplied extras with {@link DEFAULT_SKIP_DIRS}, drops empty/whitespace-
 * only entries, and escapes each name so matches are literal.
 */
function buildSkipPattern(extraDirs: string[]): RegExp {
  const escapedDirs = [...DEFAULT_SKIP_DIRS, ...extraDirs]
    .filter((dir): boolean => dir.trim() !== "")
    .map((dir): string => RegExp.escape(dir));
  return new RegExp(`(^|[\\\\/])(${escapedDirs.join("|")})$`);
}

/**
 * Discovers all npm/pnpm scripts across a project and its workspaces.
 *
 * Starting from the given root `package.json`, this function walks the
 * filesystem in-process to find every nested `package.json` and collects
 * their `"scripts"` entries. Directories matching {@link DEFAULT_SKIP_DIRS}
 * (`.git`, `node_modules`, `.pnpm-store`, `.cache`, `.output`, `dist`) plus
 * any names supplied via `skipDirs` are pruned pre-descent; matching is
 * literal (each entry is `RegExp.escape`d). It auto-detects whether the
 * project uses pnpm (via `pnpm-lock.yaml`) and adjusts the generated
 * command accordingly.
 *
 * @param mainPackageJSONPath - Absolute path to the root `package.json`.
 * @param skipDirs - Additional directory names to skip, unioned with the
 *   built-in defaults. Empty/whitespace entries are ignored.
 * @returns An array of {@link CommandEntry} items, one per script.
 *
 * @example
 * ```ts
 * const entries = await findAllPackageJSONScripts("/project/package.json");
 * // entries[0].commandParts → ["pnpm run", "--filter ./packages/app", "dev"]
 * ```
 */
export async function findAllPackageJSONScripts(
  mainPackageJSONPath: string,
  skipDirs: string[] = [],
): Promise<CommandEntry[]> {
  const rootDir = dirname(mainPackageJSONPath);
  const skipPattern = buildSkipPattern(skipDirs);

  const subPackageJSONPaths: string[] = [];
  for await (
    const entry of walk(rootDir, {
      match: [/(^|[\\/])package\.json$/],
      // `skip` is applied pre-descent: matched directories are never opened.
      skip: [skipPattern],
      includeDirs: false,
      includeSymlinks: false,
      followSymlinks: false,
    })
  ) {
    if (entry.path !== mainPackageJSONPath) {
      subPackageJSONPaths.push(entry.path);
    }
  }
  subPackageJSONPaths.sort();

  interface ScriptEntry {
    name: string;
    script: string;
    workspace: string;
  }

  const scriptEntries: ScriptEntry[] = [
    ...Object.entries(
      JSON.parse(await Deno.readTextFile(mainPackageJSONPath)).scripts ?? {},
    ).map(
      ([name, script]): ScriptEntry => ({
        name,
        script: String(script),
        workspace: "",
      }),
    ),
    ...(
      await Promise.all(
        subPackageJSONPaths.map(
          async (subPackageJSONPath): Promise<ScriptEntry[]> =>
            Object.entries(
              JSON.parse(await Deno.readTextFile(subPackageJSONPath)).scripts ??
                {},
            ).map(
              ([name, script]): ScriptEntry => ({
                name,
                script: String(script),
                workspace: relative(rootDir, dirname(subPackageJSONPath)),
              }),
            ),
        ),
      )
    ).flat(1),
  ];

  const mainPackageRootFiles = (
    await Array.fromAsync(Deno.readDir(rootDir))
  ).map(({ name }): string => name);
  const isPnpm = mainPackageRootFiles.includes("pnpm-lock.yaml");

  return scriptEntries.map(
    ({ name, script, workspace }): CommandEntry => ({
      commandParts: [
        isPnpm ? "pnpm run" : "npm run",
        workspace === "" ? "" : `--filter ./${workspace}`,
        name,
      ],
      descriptionParts: [script],
    }),
  );
}
