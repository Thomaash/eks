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

Deno.test("findAllPackageJSONScripts detects npm in mixed fixture with Makefile present", async () => {
  const packageJSONPath = `${fixturesDir}/mixed/package.json`;

  const entries = await findAllPackageJSONScripts(packageJSONPath);

  assertEquals(entries.length, 2, "should find exactly 2 scripts");

  assertEquals(entries[0].commandParts, ["npm run", "", "dev"]);
  assertEquals(entries[0].descriptionParts, ["nodemon src/index.ts"]);

  assertEquals(entries[1].commandParts, ["npm run", "", "format"]);
  assertEquals(entries[1].descriptionParts, ["prettier --write ."]);
});
