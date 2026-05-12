import { assertEquals } from "@std/assert";
import { findAllDenoTasks } from "./find-all-deno-tasks.ts";

const fixturesDir = new URL("./fixtures", import.meta.url).pathname;

Deno.test("findAllDenoTasks parses .jsonc with comments and all task value forms", async () => {
  const denoConfigPath = `${fixturesDir}/deno-only/deno.jsonc`;

  const entries = await findAllDenoTasks(denoConfigPath);

  assertEquals(entries.length, 3, "should find exactly 3 tasks");

  // String form: command also acts as description.
  assertEquals(entries[0].commandParts, ["deno task", "", "dev"]);
  assertEquals(entries[0].descriptionParts, ["deno run -A mod.ts"]);

  // Object form with explicit description: description wins.
  assertEquals(entries[1].commandParts, ["deno task", "", "build"]);
  assertEquals(entries[1].descriptionParts, ["Build the project"]);

  // Object form without description: command is used as the description.
  assertEquals(entries[2].commandParts, ["deno task", "", "lint"]);
  assertEquals(entries[2].descriptionParts, ["deno lint"]);
});

Deno.test("findAllDenoTasks parses deno.json containing JSONC-style comments (JSONC-capable parser)", async () => {
  const denoConfigPath = `${fixturesDir}/deno-json/deno.json`;

  // A strict JSON.parse would throw here because of the `//` comments.
  // findAllDenoTasks must use a JSONC-capable parser uniformly across .json and .jsonc.
  const entries = await findAllDenoTasks(denoConfigPath);

  assertEquals(entries.length, 2, "should find exactly 2 tasks");

  assertEquals(entries[0].commandParts, ["deno task", "", "test"]);
  assertEquals(entries[0].descriptionParts, ["deno test -A"]);

  assertEquals(entries[1].commandParts, ["deno task", "", "fmt"]);
  assertEquals(entries[1].descriptionParts, ["deno fmt"]);
});

Deno.test("findAllDenoTasks: string task value uses command string as description", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const denoConfigPath = `${tempDir}/deno.json`;
    await Deno.writeTextFile(
      denoConfigPath,
      JSON.stringify({
        tasks: { serve: "deno run -A server.ts" },
      }),
    );

    const entries = await findAllDenoTasks(denoConfigPath);

    assertEquals(entries.length, 1);
    assertEquals(entries[0].commandParts, ["deno task", "", "serve"]);
    assertEquals(entries[0].descriptionParts, ["deno run -A server.ts"]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllDenoTasks: object task with description uses the description", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const denoConfigPath = `${tempDir}/deno.json`;
    await Deno.writeTextFile(
      denoConfigPath,
      JSON.stringify({
        tasks: {
          start: {
            command: "deno run -A main.ts",
            description: "Start the application",
          },
        },
      }),
    );

    const entries = await findAllDenoTasks(denoConfigPath);

    assertEquals(entries.length, 1);
    assertEquals(entries[0].commandParts, ["deno task", "", "start"]);
    assertEquals(entries[0].descriptionParts, ["Start the application"]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllDenoTasks: object task without description falls back to command", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const denoConfigPath = `${tempDir}/deno.json`;
    await Deno.writeTextFile(
      denoConfigPath,
      JSON.stringify({
        tasks: {
          check: { command: "deno check mod.ts" },
        },
      }),
    );

    const entries = await findAllDenoTasks(denoConfigPath);

    assertEquals(entries.length, 1);
    assertEquals(entries[0].commandParts, ["deno task", "", "check"]);
    assertEquals(entries[0].descriptionParts, ["deno check mod.ts"]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllDenoTasks returns empty array when tasks field is absent", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const denoConfigPath = `${tempDir}/deno.json`;
    await Deno.writeTextFile(
      denoConfigPath,
      JSON.stringify({ name: "no-tasks", version: "1.0.0" }),
    );

    const entries = await findAllDenoTasks(denoConfigPath);

    assertEquals(entries, []);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllDenoTasks renders root tasks as 3-part commandParts with empty modifier slot", async () => {
  const denoConfigPath = `${fixturesDir}/deno-only/deno.jsonc`;

  const entries = await findAllDenoTasks(denoConfigPath);

  for (const entry of entries) {
    assertEquals(
      entry.commandParts.length,
      3,
      "root Deno tasks must have 3 commandParts so columns align with future member tasks",
    );
    assertEquals(
      entry.commandParts[0],
      "deno task",
      "first commandPart must be the tool string 'deno task'",
    );
    assertEquals(
      entry.commandParts[1],
      "",
      "second commandPart (modifier slot) must be empty for root tasks",
    );
  }
});

Deno.test("findAllDenoTasks on a workspace root returns root tasks AND member tasks", async () => {
  const denoConfigPath = `${fixturesDir}/deno-workspace/deno.jsonc`;

  const entries = await findAllDenoTasks(denoConfigPath);

  // Root task with empty modifier slot (Slice 1 preserved).
  const rootEntries = entries.filter(
    (entry) => entry.commandParts[2] === "root-task",
  );
  assertEquals(rootEntries.length, 1, "should include the root task");
  assertEquals(rootEntries[0].commandParts, ["deno task", "", "root-task"]);
  assertEquals(rootEntries[0].descriptionParts, ["echo root"]);

  // Web member: string and object task forms, rendered with --cwd.
  const webDev = entries.find(
    (entry) =>
      entry.commandParts[1] === "--cwd ./packages/web" &&
      entry.commandParts[2] === "dev",
  );
  assertEquals(
    webDev?.commandParts,
    ["deno task", "--cwd ./packages/web", "dev"],
    "web 'dev' task should be rendered with --cwd ./packages/web",
  );
  assertEquals(webDev?.descriptionParts, ["deno run -A mod.ts"]);

  const webBuild = entries.find(
    (entry) =>
      entry.commandParts[1] === "--cwd ./packages/web" &&
      entry.commandParts[2] === "build",
  );
  assertEquals(
    webBuild?.commandParts,
    ["deno task", "--cwd ./packages/web", "build"],
    "web 'build' task should be rendered with --cwd ./packages/web",
  );
  assertEquals(webBuild?.descriptionParts, ["Build the web package"]);

  // Api member (deno.json, not .jsonc): rendered with --cwd.
  const apiServe = entries.find(
    (entry) =>
      entry.commandParts[1] === "--cwd ./packages/api" &&
      entry.commandParts[2] === "serve",
  );
  assertEquals(
    apiServe?.commandParts,
    ["deno task", "--cwd ./packages/api", "serve"],
    "api 'serve' task should be rendered with --cwd ./packages/api",
  );
  assertEquals(apiServe?.descriptionParts, ["deno run -A server.ts"]);

  // Empty member (config without tasks) contributes nothing.
  const emptyEntries = entries.filter(
    (entry) => entry.commandParts[1] === "--cwd ./packages/empty",
  );
  assertEquals(
    emptyEntries.length,
    0,
    "workspace member with a config but no tasks should contribute no entries",
  );

  // Missing member (no config at all) contributes nothing and does not error.
  const missingEntries = entries.filter(
    (entry) => entry.commandParts[1] === "--cwd ./packages/missing",
  );
  assertEquals(
    missingEntries.length,
    0,
    "workspace member without a Deno config should contribute no entries",
  );

  // Total: 1 root + 2 web + 1 api = 4.
  assertEquals(
    entries.length,
    4,
    "should find exactly 4 tasks (1 root + 2 web + 1 api)",
  );
});

Deno.test("findAllDenoTasks: empty workspace array yields only root tasks", async () => {
  const denoConfigPath = `${fixturesDir}/deno-workspace-no-members/deno.jsonc`;

  const entries = await findAllDenoTasks(denoConfigPath);

  assertEquals(entries.length, 1, "should include only the root task");
  assertEquals(entries[0].commandParts, ["deno task", "", "solo"]);
  assertEquals(entries[0].descriptionParts, ["echo solo"]);
});

Deno.test("findAllDenoTasks: non-workspace config returns only the file's own tasks", async () => {
  const denoConfigPath = `${fixturesDir}/deno-only/deno.jsonc`;

  const entries = await findAllDenoTasks(denoConfigPath);

  // Slice 1 behavior: no member entries should appear because there is no workspace array.
  for (const entry of entries) {
    assertEquals(
      entry.commandParts[1],
      "",
      `non-workspace config should not produce --cwd entries, but got: ${entry.commandParts.join(" ")}`,
    );
  }
  assertEquals(entries.length, 3, "deno-only fixture has exactly 3 tasks");
});
