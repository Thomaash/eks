import type { CommandEntry } from "./find-all-scripts-types.ts";

function getDescriptionFromPrecedingLines(
  commandLineIndex: number,
  arr: string[],
): string {
  let lastCommentLineIndex = commandLineIndex - 1;

  if (lastCommentLineIndex < 0) {
    return "";
  }

  if (arr[lastCommentLineIndex].startsWith(".PHONY:")) {
    --lastCommentLineIndex;
  }

  if (!arr[lastCommentLineIndex].startsWith("#")) {
    return "";
  }

  const firstCommentLineIndex =
    arr
      .slice(0, lastCommentLineIndex + 1)
      .findLastIndex((l): boolean => !l.startsWith("#")) + 1;

  return arr
    .slice(firstCommentLineIndex, lastCommentLineIndex + 1)
    .map((line) => line.replace(/^#+\s*/, ""))
    .join(" | ");
}

export async function findAllMakefileScripts(
  makefilePath: string,
): Promise<CommandEntry[]> {
  return (await Deno.readTextFile(makefilePath))
    .split("\n")
    .flatMap((line, i, arr): CommandEntry[] => {
      const match = line.match(
        /^(?<command>[a-zA-Z0-9-_]+):.*?(##(?<description>.*))?$/,
      );
      if (match?.groups?.command == null) {
        return [];
      }

      return [
        {
          commandParts: ["make", "", match.groups.command],
          descriptionParts: [
            match.groups?.description?.trim() ??
              getDescriptionFromPrecedingLines(i, arr),
          ],
          managerParts: ["Make"],
        },
      ];
    });
}
