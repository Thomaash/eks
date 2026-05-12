import { assert, assertEquals } from "@std/assert";

/** Parse a JSONC file by stripping comments before JSON.parse. */
function readJsonc(path: string): Record<string, unknown> {
  const text = Deno.readTextFileSync(path);
  const stripped = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(stripped);
}

const decoder = new TextDecoder("utf-8");
const eksDir = new URL(".", import.meta.url).pathname;
const rootDir = new URL("../../", import.meta.url).pathname;

Deno.test("packages/eks/deno.jsonc contains the five import mappings", () => {
  const eksConfig = readJsonc(`${eksDir}deno.jsonc`);
  const imports = eksConfig["imports"] as Record<string, string>;

  assert(imports !== undefined, "imports key must exist in packages/eks/deno.jsonc");
  assertEquals(Object.keys(imports).length, 7, "must have exactly 7 import mappings");
  assertEquals(imports["@std/assert"], "jsr:@std/assert@^1.0.19");
  assertEquals(imports["@std/path"], "jsr:@std/path@^1.1.4");
  assertEquals(imports["@std/fs"], "jsr:@std/fs@^1.0.23");
  assertEquals(imports["fzf"], "npm:fzf@^0.5.2");
  assertEquals(imports["@inquirer/prompts"], "npm:@inquirer/prompts@^8.3.2");
});

Deno.test("root deno.jsonc has workspace, nodeModulesDir, and lock but no imports", () => {
  const rootConfig = readJsonc(`${rootDir}deno.jsonc`);
  const keys = Object.keys(rootConfig);

  assert(
    !keys.includes("imports"),
    "root deno.jsonc must NOT contain 'imports' key",
  );
  assert(
    keys.includes("workspace"),
    "root deno.jsonc must contain 'workspace' key",
  );
  assert(
    keys.includes("nodeModulesDir"),
    "root deno.jsonc must contain 'nodeModulesDir' key",
  );
  assert(
    keys.includes("lock"),
    "root deno.jsonc must contain 'lock' key",
  );
});

const sourceFiles = [
  "mod.ts",
  "exec.ts",
  "find-all-scripts.ts",
  "find-all-scripts-types.ts",
  "find-all-makefile-scripts.ts",
  "find-all-package-json-scripts.ts",
  "find-up.ts",
  "set-terminal-title.ts",
  "pick-one.ts",
  "pick-multiple.ts",
  "parse-eks-args.ts",
];

Deno.test("deno check passes for all source files", async () => {
  for (const file of sourceFiles) {
    const command = new Deno.Command("deno", {
      args: ["check", file],
      cwd: eksDir,
      stdout: "piped",
      stderr: "piped",
    });

    const result = await command.output();
    const stderr = decoder.decode(result.stderr);

    assertEquals(
      result.code,
      0,
      `deno check failed for ${file}: ${stderr}`,
    );
  }
});
