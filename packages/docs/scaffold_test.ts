import { assert, assertEquals } from "@std/assert";
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

const DOCS_DIR = new URL("./", import.meta.url).pathname;

// --- deno.jsonc tasks ---

Deno.test("deno.jsonc contains dev task invoking nuxt dev via deno run", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const tasks = config["tasks"] as Record<string, string>;
  assert(tasks !== undefined, "deno.jsonc must contain a 'tasks' key");
  assert(
    typeof tasks["dev"] === "string" && tasks["dev"].includes("nuxt dev"),
    "dev task must invoke nuxt dev",
  );
  assert(!tasks["dev"].includes("npx"), "dev task must not use npx");
  assert(
    tasks["dev"].includes("deno run"),
    "dev task must use deno run",
  );
});

Deno.test("deno.jsonc contains build task invoking nuxt build via deno run", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const tasks = config["tasks"] as Record<string, string>;
  assert(tasks !== undefined, "deno.jsonc must contain a 'tasks' key");
  assert(
    typeof tasks["build"] === "string" && tasks["build"].includes("nuxt build"),
    "build task must invoke nuxt build",
  );
  assert(!tasks["build"].includes("npx"), "build task must not use npx");
  assert(
    tasks["build"].includes("deno run"),
    "build task must use deno run",
  );
});

Deno.test("deno.jsonc contains generate task invoking nuxt generate via deno run", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const tasks = config["tasks"] as Record<string, string>;
  assert(tasks !== undefined, "deno.jsonc must contain a 'tasks' key");
  assert(
    typeof tasks["generate"] === "string" &&
      tasks["generate"].includes("nuxt generate"),
    "generate task must invoke nuxt generate",
  );
  assert(!tasks["generate"].includes("npx"), "generate task must not use npx");
  assert(
    tasks["generate"].includes("deno run"),
    "generate task must use deno run",
  );
});

// --- deno.jsonc imports ---

Deno.test("deno.jsonc imports map contains nuxt with npm: specifier", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const imports = config["imports"] as Record<string, string>;
  assert(imports !== undefined, "deno.jsonc must contain an 'imports' key");
  assert(
    typeof imports["nuxt"] === "string" &&
      imports["nuxt"].startsWith("npm:nuxt"),
    "imports must map 'nuxt' to a value starting with 'npm:nuxt'",
  );
});

Deno.test("deno.jsonc imports map contains @nuxt/content with npm: specifier", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const imports = config["imports"] as Record<string, string>;
  assert(imports !== undefined, "deno.jsonc must contain an 'imports' key");
  assert(
    typeof imports["@nuxt/content"] === "string" &&
      imports["@nuxt/content"].startsWith("npm:@nuxt/content"),
    "imports must map '@nuxt/content' to a value starting with 'npm:@nuxt/content'",
  );
});

// --- deno.jsonc deno-run tasks ---

Deno.test("deno.jsonc tasks use deno run instead of npx", () => {
  const config = readJsonc(join(DOCS_DIR, "deno.jsonc"));
  const tasks = config["tasks"] as Record<string, string>;
  assert(tasks !== undefined, "deno.jsonc must contain a 'tasks' key");
  for (const [name, command] of Object.entries(tasks)) {
    assert(
      !command.includes("npx"),
      `task '${name}' must not use npx, got: ${command}`,
    );
    assert(
      command.includes("deno run"),
      `task '${name}' must use 'deno run', got: ${command}`,
    );
  }
});

// --- nuxt.config.ts ---

Deno.test("nuxt.config.ts exists and enables @nuxt/content module", async () => {
  const configPath = join(DOCS_DIR, "nuxt.config.ts");
  assertEquals(
    await exists(configPath, { isFile: true }),
    true,
    "nuxt.config.ts must exist",
  );
  const content = await Deno.readTextFile(configPath);
  assert(
    content.includes("@nuxt/content"),
    "nuxt.config.ts must reference @nuxt/content module",
  );
  assert(
    content.includes("modules"),
    "nuxt.config.ts must have a modules configuration",
  );
});

// --- package.json (removed) ---

Deno.test("package.json does not exist (deps managed via deno.jsonc imports)", async () => {
  const packagePath = join(DOCS_DIR, "package.json");
  assertEquals(
    await exists(packagePath, { isFile: true }),
    false,
    "package.json must not exist — dependencies are managed via deno.jsonc imports",
  );
});

// --- content/index.md ---

Deno.test("content/index.md exists with introductory documentation", async () => {
  const indexPath = join(DOCS_DIR, "content", "index.md");
  assertEquals(
    await exists(indexPath, { isFile: true }),
    true,
    "content/index.md must exist",
  );
  const content = await Deno.readTextFile(indexPath);
  assert(
    content.trim().length > 0,
    "content/index.md must not be empty",
  );
  assert(
    content.includes("#"),
    "content/index.md must contain at least one markdown heading",
  );
});
