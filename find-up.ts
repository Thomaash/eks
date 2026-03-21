import { dirname, join } from "@std/path";
import { exists } from "@std/fs/exists";

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
