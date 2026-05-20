import { assert, assertEquals } from "@std/assert";
import { findAllPackageJSONScripts } from "./find-all-package-json-scripts.ts";

const fixturesDir = new URL("./fixtures", import.meta.url).pathname;

Deno.test("findAllPackageJSONScripts parses npm package.json scripts into CommandEntry array", async () => {
  const packageJSONPath = `${fixturesDir}/package-json-only/package.json`;

  const entries = await findAllPackageJSONScripts(packageJSONPath);

  assertEquals(entries.length, 4, "should find exactly 4 scripts");

  assertEquals(entries[0].commandParts, ["npm run", "", "build"]);
  assertEquals(entries[0].descriptionParts, ["tsc --build"]);

  assertEquals(entries[1].commandParts, ["npm run", "", "test"]);
  assertEquals(entries[1].descriptionParts, ["vitest run"]);

  assertEquals(entries[2].commandParts, ["npm run", "", "lint"]);
  assertEquals(entries[2].descriptionParts, ["eslint src/"]);

  assertEquals(entries[3].commandParts, ["npm run", "", "start"]);
  assertEquals(entries[3].descriptionParts, ["node dist/index.js"]);
});

Deno.test("findAllPackageJSONScripts parses pnpm workspace scripts into CommandEntry array", async () => {
  const packageJSONPath = `${fixturesDir}/pnpm-workspace/package.json`;

  const entries = await findAllPackageJSONScripts(packageJSONPath);

  const rootEntries = entries.filter(
    (entry) => entry.commandParts[1] === "",
  );
  const subPkgEntries = entries.filter(
    (entry) => entry.commandParts[1] !== "",
  );

  assertEquals(rootEntries.length, 3, "should find 3 root scripts");
  assertEquals(subPkgEntries.length, 3, "should find 3 sub-pkg scripts");

  // Root scripts use "pnpm run" with empty filter
  assertEquals(rootEntries[0].commandParts, ["pnpm run", "", "build"]);
  assertEquals(rootEntries[0].descriptionParts, ["pnpm -r build"]);

  assertEquals(rootEntries[1].commandParts, ["pnpm run", "", "test"]);
  assertEquals(rootEntries[1].descriptionParts, ["pnpm -r test"]);

  assertEquals(rootEntries[2].commandParts, ["pnpm run", "", "lint"]);
  assertEquals(rootEntries[2].descriptionParts, ["pnpm -r lint"]);

  // Sub-package scripts use "--filter ./{relative-path}"
  assertEquals(subPkgEntries[0].commandParts, [
    "pnpm run",
    "--filter ./packages/sub-pkg",
    "build",
  ]);
  assertEquals(subPkgEntries[0].descriptionParts, ["tsc --build"]);

  assertEquals(subPkgEntries[1].commandParts, [
    "pnpm run",
    "--filter ./packages/sub-pkg",
    "test",
  ]);
  assertEquals(subPkgEntries[1].descriptionParts, ["vitest run"]);

  assertEquals(subPkgEntries[2].commandParts, [
    "pnpm run",
    "--filter ./packages/sub-pkg",
    "dev",
  ]);
  assertEquals(subPkgEntries[2].descriptionParts, ["tsc --watch"]);
});

Deno.test("findAllPackageJSONScripts returns empty array for package.json with no scripts field", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const packageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      packageJSONPath,
      JSON.stringify({ name: "no-scripts", version: "1.0.0" }),
    );

    const entries = await findAllPackageJSONScripts(packageJSONPath);

    assertEquals(entries, []);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts returns sub-package scripts in sorted path order", async () => {
  const packageJSONPath = `${fixturesDir}/pnpm-workspace/package.json`;

  const entries = await findAllPackageJSONScripts(packageJSONPath);

  const subPkgEntries = entries.filter(
    (entry) => entry.commandParts[1] !== "",
  );

  // Sub-package entries should be sorted by their workspace path
  for (let i = 1; i < subPkgEntries.length; i++) {
    const prevFilter = subPkgEntries[i - 1].commandParts[1];
    const currFilter = subPkgEntries[i].commandParts[1];
    assert(
      prevFilter <= currFilter,
      `sub-package entries should be in sorted order: "${prevFilter}" should come before "${currFilter}"`,
    );
  }
});

// Passes under the original `find(1)` implementation (`find -name node_modules` is basename-anchored). Kept as a regression guard for the @std/fs/walk rewrite, whose `skip` regex must remain basename-anchored.
Deno.test("findAllPackageJSONScripts prunes node_modules/.cache/.output/dist by basename, not substring", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    await Deno.mkdir(`${tempDir}/node_modules/inner`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/node_modules/inner/package.json`,
      JSON.stringify({ name: "inner", scripts: { x: "echo x" } }),
    );

    await Deno.mkdir(`${tempDir}/dist`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/dist/package.json`,
      JSON.stringify({ name: "dist", scripts: { y: "echo y" } }),
    );

    await Deno.mkdir(`${tempDir}/my-node_modules-helper`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/my-node_modules-helper/package.json`,
      JSON.stringify({ name: "helper", scripts: { z: "echo z" } }),
    );

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath);

    assertEquals(entries.length, 2, "root + helper scripts only");
    assertEquals(entries[0].commandParts, ["npm run", "", "build"]);
    assertEquals(entries[1].commandParts, [
      "npm run",
      "--filter ./my-node_modules-helper",
      "z",
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts default skip set excludes .git/node_modules/.pnpm-store/.cache/.output/dist with empty skipDirs", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    const defaultDirs = [
      ".git",
      "node_modules",
      ".pnpm-store",
      ".cache",
      ".output",
      "dist",
    ];
    for (const dir of defaultDirs) {
      await Deno.mkdir(`${tempDir}/${dir}/inner`, { recursive: true });
      await Deno.writeTextFile(
        `${tempDir}/${dir}/inner/package.json`,
        JSON.stringify({ name: dir, scripts: { x: "echo x" } }),
      );
    }

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath, []);

    assertEquals(entries.length, 1, "only the root script should be discovered");
    assertEquals(entries[0].commandParts, ["npm run", "", "build"]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts with skipDirs ['foo'] excludes scripts inside foo/", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    await Deno.mkdir(`${tempDir}/foo/inner`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/foo/inner/package.json`,
      JSON.stringify({ name: "foo-inner", scripts: { f: "echo f" } }),
    );

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath, [
      "foo",
    ]);

    assertEquals(entries.length, 1);
    assertEquals(entries[0].commandParts, ["npm run", "", "build"]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts with skipDirs ['foo[1]'] does not throw and excludes literal foo[1]/", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    await Deno.mkdir(`${tempDir}/foo[1]/inner`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/foo[1]/inner/package.json`,
      JSON.stringify({ name: "foo1", scripts: { x: "echo x" } }),
    );

    // A directory named "f" must NOT be excluded by the regex-character-class
    // interpretation of "foo[1]"; assert it is still walked.
    await Deno.mkdir(`${tempDir}/f`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/f/package.json`,
      JSON.stringify({ name: "f", scripts: { y: "echo y" } }),
    );

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath, [
      "foo[1]",
    ]);

    // Root + f/, but NOT foo[1]/inner
    assertEquals(entries.length, 2);
    const commands = entries.map((e) => e.commandParts.join(" "));
    assert(commands.some((c) => c.includes("build")));
    assert(commands.some((c) => c.includes("--filter ./f")));
    assert(
      !commands.some((c) => c.includes("foo[1]")),
      "scripts under foo[1]/ should be excluded",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts with skipDirs ['.cache'] does NOT exclude Xcache/ (literal-only matching)", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    // .cache is a built-in default; Xcache is a different basename and must remain.
    await Deno.mkdir(`${tempDir}/Xcache`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/Xcache/package.json`,
      JSON.stringify({ name: "xcache", scripts: { z: "echo z" } }),
    );

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath, [
      ".cache",
    ]);

    assertEquals(entries.length, 2);
    const commands = entries.map((e) => e.commandParts.join(" "));
    assert(commands.some((c) => c.includes("--filter ./Xcache")));
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts with skipDirs ['.idea'] excludes .idea/x/ while keeping defaults excluded", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const rootPackageJSONPath = `${tempDir}/package.json`;
    await Deno.writeTextFile(
      rootPackageJSONPath,
      JSON.stringify({ name: "root", scripts: { build: "echo build" } }),
    );

    await Deno.mkdir(`${tempDir}/.idea/x`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/.idea/x/package.json`,
      JSON.stringify({ name: "idea-x", scripts: { i: "echo i" } }),
    );

    await Deno.mkdir(`${tempDir}/node_modules/y`, { recursive: true });
    await Deno.writeTextFile(
      `${tempDir}/node_modules/y/package.json`,
      JSON.stringify({ name: "nm-y", scripts: { n: "echo n" } }),
    );

    const entries = await findAllPackageJSONScripts(rootPackageJSONPath, [
      ".idea",
    ]);

    assertEquals(entries.length, 1, "only root script remains");
    assertEquals(entries[0].commandParts, ["npm run", "", "build"]);
    const commands = entries.map((e) => e.commandParts.join(" "));
    assert(
      !commands.some((c) => c.includes(".idea")),
      "scripts under .idea/ should be excluded",
    );
    assert(
      !commands.some((c) => c.includes("node_modules")),
      "scripts under node_modules/ should remain excluded by defaults",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllPackageJSONScripts detects npm in mixed fixture with Makefile present", async () => {
  const packageJSONPath = `${fixturesDir}/mixed/package.json`;

  const entries = await findAllPackageJSONScripts(packageJSONPath);

  assertEquals(entries.length, 2, "should find exactly 2 scripts");

  assertEquals(entries[0].commandParts, ["npm run", "", "dev"]);
  assertEquals(entries[0].descriptionParts, ["nodemon src/index.ts"]);

  assertEquals(entries[1].commandParts, ["npm run", "", "format"]);
  assertEquals(entries[1].descriptionParts, ["prettier --write ."]);
});
