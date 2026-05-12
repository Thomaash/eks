import type { CommandEntry } from "./find-all-scripts-types.ts";

/**
 * Extracts a description from comment lines immediately above a Makefile target.
 * Skips any `.PHONY:` declaration.
 *
 * @param commandLineIndex - The line index of the Makefile target.
 * @param lines - All lines of the Makefile.
 * @returns A pipe-delimited description string, or `""` if no preceding comment block is found.
 */
function getDescriptionFromPrecedingLines(
  commandLineIndex: number,
  lines: string[],
): string {
  let lastCommentLineIndex = commandLineIndex - 1;

  if (lastCommentLineIndex < 0) {
    return "";
  }

  if (lines[lastCommentLineIndex].startsWith(".PHONY:")) {
    --lastCommentLineIndex;
  }

  if (!lines[lastCommentLineIndex].startsWith("#")) {
    return "";
  }

  const firstCommentLineIndex =
    lines
      .slice(0, lastCommentLineIndex + 1)
      .findLastIndex((line): boolean => !line.startsWith("#")) + 1;

  return lines
    .slice(firstCommentLineIndex, lastCommentLineIndex + 1)
    .map((line) => line.replace(/^#+\s*/, ""))
    .join(" | ");
}

/**
 * Parses a Makefile and returns all discoverable targets as {@link CommandEntry} items.
 *
 * Targets are extracted by matching lines of the form `target-name:`.
 * Descriptions are taken from an inline `## comment` on the target line, or from a contiguous comment block above the target.
 *
 * @param makefilePath - Absolute path to the Makefile to parse.
 * @returns An array of {@link CommandEntry} items, one per target.
 *
 * @example
 * ```ts
 * const entries = await findAllMakefileScripts("/project/Makefile");
 * // entries[0].commandParts → ["make", "", "build"]
 * ```
 */
export async function findAllMakefileScripts(
  makefilePath: string,
): Promise<CommandEntry[]> {
  return (await Deno.readTextFile(makefilePath))
    .split("\n")
    .flatMap((line, index, lines): CommandEntry[] => {
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
              getDescriptionFromPrecedingLines(index, lines),
          ],
        },
      ];
    });
}
