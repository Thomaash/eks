import type { CommandEntry } from "./find-all-scripts-types.ts";
import { findAllMakefileScripts } from "./find-all-makefile-scripts.ts";
import { findAllPackageJSONScripts } from "./find-all-package-json-scripts.ts";
import { findUp } from "./find-up.ts";

/**
 * Discovers all runnable scripts in the current project by searching up the directory tree for a `Makefile` and/or `package.json`.
 * Aggregates their targets/scripts into column-aligned, human-readable strings.
 *
 * Each returned string has the format:
 * ```
 * <command>   # <description>
 * ```
 *
 * @returns An array of formatted, column-aligned script strings ready for display in a terminal picker.
 * Returns an empty array if no task runners are found.
 *
 * @example
 * ```ts
 * const scripts = await findAllScripts();
 * // ["pnpm run   dev   # nuxt dev", "make   build   # Build the project"]
 * ```
 */
export async function findAllScripts(): Promise<string[]> {
  const commandEntries: CommandEntry[] = [
    ...(await findUp("Makefile").then((path): Promise<CommandEntry[]> | [] =>
      path ? findAllMakefileScripts(path) : [],
    )),
    ...(await findUp("package.json").then(
      (path): Promise<CommandEntry[]> | [] =>
        path ? findAllPackageJSONScripts(path) : [],
    )),
  ];

  if (commandEntries.length === 0) {
    return [];
  }

  interface MaxLengths {
    command: number[];
    description: number[];
  }

  const maxLengths: MaxLengths = {
    command: commandEntries[0].commandParts.map((_, index): number =>
      Math.max(
        ...commandEntries.map((entry) => entry.commandParts[index].length),
      ),
    ),
    description: commandEntries[0].descriptionParts.map((_, index): number =>
      Math.max(
        ...commandEntries.map((entry) => entry.descriptionParts[index].length),
      ),
    ),
  };

  const formatAsAlignedScript = ({
    commandParts,
    descriptionParts,
  }: CommandEntry): string =>
    [
      ...commandParts.map((part, column): string =>
        part.padEnd(maxLengths.command[column]),
      ),
      "#",
      ...descriptionParts.map((part, column): string =>
        part.padEnd(maxLengths.description[column]),
      ),
    ].join("   ");

  return commandEntries.map(formatAsAlignedScript);
}
