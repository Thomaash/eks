import { dirname, join } from "@std/path";
import { exists } from "@std/fs/exists";

/**
 * Walks up the directory tree from the current working directory, looking for a file with the given name.
 *
 * @param filename - The filename to search for (e.g. `"Makefile"`, `"package.json"`).
 * @returns The absolute path to the first matching file, or `null` if the filesystem root is reached without finding a match.
 *
 * @example
 * ```ts
 * const makefilePath = await findUp("Makefile");
 * if (makefilePath) {
 *   console.log("Found Makefile at", makefilePath);
 * }
 * ```
 */
export async function findUp(filename: string): Promise<string | null> {
  let path = Deno.cwd();
  while (!(await exists(`${path}/${filename}`))) {
    if (path === "/") {
      return null;
    }

    path = dirname(path);
  }

  return join(path, filename);
}
