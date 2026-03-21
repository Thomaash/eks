import type { CommandEntry } from "./find-all-scripts-types.ts";
import { dirname } from "@std/path/dirname";
import { relative } from "@std/path/relative";

export async function findAllPackageJSONScripts(
  mainPackageJSONPath: string,
): Promise<CommandEntry[]> {
  const command = new Deno.Command("find", {
    args: [
      dirname(mainPackageJSONPath),

      "(",
      "-name",
      "package.json",
      "-a",
      "-type",
      "f",
      ")",

      "-print0",

      "-o",

      "(",
      "-name",
      "node_modules",
      "-o",
      "-name",
      ".cache",
      "-o",
      "-name",
      ".output",
      "-o",
      "-name",
      "dist",
      ")",

      "-prune",
    ],
    stdin: "inherit",
    stdout: "piped",
    stderr: "inherit",
  });
  const output = await command.output();
  const repoDirsStdout = new TextDecoder().decode(output.stdout);
  const subPackageJSONPaths = repoDirsStdout
    .split("\0")
    .filter((path): boolean => path !== mainPackageJSONPath && path !== "")
    .sort();

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
                workspace: relative(
                  dirname(mainPackageJSONPath),
                  dirname(subPackageJSONPath),
                ),
              }),
            ),
        ),
      )
    ).flat(1),
  ];

  const mainPackageRootFiles = (
    await Array.fromAsync(Deno.readDir(dirname(mainPackageJSONPath)))
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
      managerParts: [isPnpm ? "pnpm" : "npm"],
    }),
  );
}
