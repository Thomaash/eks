import { assertEquals } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";

/** Parse a JSONC file by stripping comments before JSON.parse. */
function readJsonc(path: string): Record<string, unknown> {
  const text = Deno.readTextFileSync(path);
  const stripped = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(stripped);
}

const ROOT_DIR = new URL("../../", import.meta.url).pathname;

Deno.test("root deno.jsonc has workspace array with both package paths", () => {
  const configPath = join(ROOT_DIR, "deno.jsonc");
  const config = readJsonc(configPath);

  assertEquals(
    Array.isArray(config.workspace),
    true,
    "deno.jsonc must have a 'workspace' array",
  );

  const sortedWorkspace = [...(config.workspace as string[])].sort();
  assertEquals(sortedWorkspace, ["./packages/docs", "./packages/eks"]);
});

Deno.test("packages/eks directory exists with deno.jsonc", async () => {
  const eksDir = join(ROOT_DIR, "packages", "eks");
  const eksConfig = join(eksDir, "deno.jsonc");

  assertEquals(
    await exists(eksDir, { isDirectory: true }),
    true,
    "packages/eks/ directory must exist",
  );
  assertEquals(
    await exists(eksConfig, { isFile: true }),
    true,
    "packages/eks/deno.jsonc must exist",
  );
});

Deno.test("packages/docs directory exists with deno.jsonc", async () => {
  const docsDir = join(ROOT_DIR, "packages", "docs");
  const docsConfig = join(docsDir, "deno.jsonc");

  assertEquals(
    await exists(docsDir, { isDirectory: true }),
    true,
    "packages/docs/ directory must exist",
  );
  assertEquals(
    await exists(docsConfig, { isFile: true }),
    true,
    "packages/docs/deno.jsonc must exist",
  );
});
