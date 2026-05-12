import { assertEquals } from "@std/assert";
import { findAllMakefileScripts } from "./find-all-makefile-scripts.ts";

const fixturesDir = new URL("./fixtures", import.meta.url).pathname;

Deno.test("findAllMakefileScripts parses Makefile targets into CommandEntry array", async () => {
  const makefilePath = `${fixturesDir}/makefile-only/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries.length, 5, "should find exactly 5 targets");

  assertEquals(entries[0].commandParts, ["make", "", "build"]);
  assertEquals(entries[0].descriptionParts, ["Build the project"]);

  assertEquals(entries[1].commandParts, ["make", "", "test"]);
  assertEquals(entries[1].descriptionParts, [
    "Run the full test suite | including unit and integration tests",
  ]);

  assertEquals(entries[2].commandParts, ["make", "", "lint"]);
  assertEquals(entries[2].descriptionParts, [""]);

  assertEquals(entries[3].commandParts, ["make", "", "dev"]);
  assertEquals(entries[3].descriptionParts, [
    "Start development server with hot reload",
  ]);

  assertEquals(entries[4].commandParts, ["make", "", "clean"]);
  assertEquals(entries[4].descriptionParts, ["Remove build artifacts"]);
});

Deno.test("findAllMakefileScripts returns empty array for empty Makefile", async () => {
  const makefilePath = `${fixturesDir}/makefile-empty/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries, []);
});

Deno.test("findAllMakefileScripts returns empty array for Makefile with only .PHONY lines", async () => {
  const makefilePath = `${fixturesDir}/makefile-phony-only/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries, []);
});

Deno.test("findAllMakefileScripts excludes recipe lines and blank lines", async () => {
  const makefilePath = `${fixturesDir}/makefile-recipes-only/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries.length, 1);
  assertEquals(entries[0].commandParts, ["make", "", "build"]);
  assertEquals(entries[0].descriptionParts, ["Build it"]);
});

Deno.test("findAllMakefileScripts returns empty description for target on first line with no comments", async () => {
  const makefilePath = `${fixturesDir}/makefile-target-first-line/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries.length, 2, "should find 2 targets");
  assertEquals(entries[0].commandParts[2], "build");
  assertEquals(entries[0].descriptionParts, [""], "target on first line should have empty description");
  assertEquals(entries[1].commandParts[2], "test");
  assertEquals(entries[1].descriptionParts, ["With a comment"], "target preceded by comment should have that description");
});

Deno.test("findAllMakefileScripts joins multi-line comments with pipe separator", async () => {
  const makefilePath = `${fixturesDir}/makefile-only/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  const testEntry = entries.find((e) => e.commandParts[2] === "test")!;
  assertEquals(
    testEntry.descriptionParts[0].includes(" | "),
    true,
    "multi-line comments should be joined with ' | '",
  );
});

Deno.test("findAllMakefileScripts extracts description from comment on the very first line of the file", async () => {
  const makefilePath = `${fixturesDir}/makefile-comment-first-line/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries.length, 1, "should find exactly 1 target");
  assertEquals(entries[0].commandParts, ["make", "", "build"]);
  assertEquals(entries[0].descriptionParts, ["Build everything"], "comment at line 0 should be used as description");
});

Deno.test("findAllMakefileScripts returns empty description when a non-comment line precedes the target", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const makefilePath = `${tempDir}/Makefile`;
    await Deno.writeTextFile(makefilePath, "SOME_VAR=value\nbuild:\n\t@echo done\n");

    const entries = await findAllMakefileScripts(makefilePath);

    assertEquals(entries.length, 1);
    assertEquals(entries[0].descriptionParts, [""], "non-comment line above target should yield empty description");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllMakefileScripts strips hash prefixes with varying counts and whitespace from comment lines", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const makefilePath = `${tempDir}/Makefile`;
    await Deno.writeTextFile(makefilePath, "## Double hash with space\n### Triple hash\nbuild:\n\t@echo done\n");

    const entries = await findAllMakefileScripts(makefilePath);

    assertEquals(entries.length, 1);
    assertEquals(
      entries[0].descriptionParts,
      ["Double hash with space | Triple hash"],
      "multiple hashes and varying whitespace should be stripped correctly",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllMakefileScripts skips .PHONY between comment and target", async () => {
  const makefilePath = `${fixturesDir}/makefile-phony-comment/Makefile`;

  const entries = await findAllMakefileScripts(makefilePath);

  assertEquals(entries.length, 1);
  assertEquals(entries[0].commandParts, ["make", "", "check"]);
  assertEquals(entries[0].descriptionParts, ["Run all checks"]);
});
