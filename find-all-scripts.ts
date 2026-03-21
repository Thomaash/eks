import type { CommandEntry } from "./find-all-scripts-types.ts";
import { findAllMakefileScripts } from "./find-all-makefile-scripts.ts";
import { findAllPackageJSONScripts } from "./find-all-package-json-scripts.ts";
import { findUp } from "./find-up.ts";

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

  const transformToScript = ({
    commandParts,
    descriptionParts,
  }: CommandEntry): string =>
    [
      ...commandParts.map((part, i): string =>
        part.padEnd(maxLengths.command[i]),
      ),
      "#",
      ...descriptionParts.map((part, i): string =>
        part.padEnd(maxLengths.description[i]),
      ),
    ].join("   ");

  const scripts = commandEntries.map(transformToScript);

  return scripts;
}
