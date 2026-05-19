import type { CommandEntry } from "./find-all-scripts-types.ts";
import { walk } from "@std/fs/walk";
import { dirname } from "@std/path/dirname";
import { relative } from "@std/path/relative";

/**
 * Discovers all npm/pnpm scripts across a project and its workspaces.
 *
 * Starting from the given root `package.json`, this function walks the
 * filesystem in-process to find every nested `package.json` (skipping
 * `node_modules`, `.cache`, `.output`, and `dist`) and collects their
 * `"scripts"` entries. It auto-detects whether the project uses pnpm
 * (via `pnpm-lock.yaml`) and adjusts the generated command accordingly.
 *
 * @param mainPackageJSONPath - Absolute path to the root `package.json`.
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
): Promise<CommandEntry[]> {
  const rootDir = dirname(mainPackageJSONPath);

  const subPackageJSONPaths: string[] = [];
  for await (
    const entry of walk(rootDir, {
      match: [/(^|[\\/])package\.json$/],
      // `skip` is applied pre-descent: matched directories are never opened.
      skip: [/(^|[\\/])(node_modules|\.cache|\.output|dist)$/],
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
