import { assert, assertStringIncludes } from "@std/assert";

/** Parse a JSONC file by stripping comments before JSON.parse. */
function readJsonc(path: string): Record<string, unknown> {
  const text = Deno.readTextFileSync(path);
  const stripped = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(stripped);
}

const configPath = new URL("./deno.jsonc", import.meta.url).pathname;

Deno.test("deno.jsonc contains a tasks key", () => {
  const config = readJsonc(configPath);
  assert(
    "tasks" in config,
    "deno.jsonc must contain a 'tasks' key",
  );
});

Deno.test("eks task runs mod.ts with correct permission flags", () => {
  const config = readJsonc(configPath);
  const eksTask: string = (config.tasks as Record<string, string>).eks;

  assertStringIncludes(eksTask, "mod.ts", "eks task must reference mod.ts");
  assertStringIncludes(eksTask, "--allow-env", "eks task must include --allow-env");
  assertStringIncludes(eksTask, "--allow-read", "eks task must include --allow-read");
  assertStringIncludes(eksTask, "--allow-run", "eks task must include --allow-run");
  assertStringIncludes(eksTask, "--allow-sys", "eks task must include --allow-sys");
});
