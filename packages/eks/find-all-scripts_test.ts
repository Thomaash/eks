import { assert, assertEquals } from "@std/assert";
import { findAllScripts } from "./find-all-scripts.ts";

const fixturesDir = new URL("./fixtures", import.meta.url).pathname;

async function withFixtureCwd<T>(
  fixture: string,
  fn: () => Promise<T>,
): Promise<T> {
  const originalCwd = Deno.cwd();
  try {
    Deno.chdir(`${fixturesDir}/${fixture}`);
    return await fn();
  } finally {
    Deno.chdir(originalCwd);
  }
}

Deno.test("findAllScripts combines Makefile and package.json sources into aligned formatted output", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();

    assertEquals(lines.length, 4, "should have 4 entries (2 Makefile + 2 package.json)");

    const makeEntries = lines.filter((line) => line.startsWith("make"));
    const npmEntries = lines.filter((line) => line.startsWith("npm"));
    assertEquals(makeEntries.length, 2, "should have 2 Makefile entries");
    assertEquals(npmEntries.length, 2, "should have 2 package.json entries");

    for (const line of lines) {
      assertEquals(line.includes("#"), true, `each line should contain '#' separator: ${line}`);
    }
  });
});

Deno.test("findAllScripts produces lines with consistent column alignment", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();

    const separatorPositions = lines.map((line) => line.indexOf("#"));
    const firstPosition = separatorPositions[0];

    for (let i = 1; i < separatorPositions.length; i++) {
      assertEquals(
        separatorPositions[i],
        firstPosition,
        `all lines should have '#' at the same column position, but line ${i} has it at ${separatorPositions[i]} instead of ${firstPosition}`,
      );
    }
  });
});

Deno.test("findAllScripts includes expected commands and descriptions from both sources", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();
    const joinedOutput = lines.join("\n");

    const expectedCommands = ["make", "build", "test", "npm run", "dev", "format"];
    for (const command of expectedCommands) {
      assertEquals(
        joinedOutput.includes(command),
        true,
        `output should contain command '${command}'`,
      );
    }

    const expectedDescriptions = [
      "Compile all packages",
      "Run tests across the workspace",
      "nodemon src/index.ts",
      "prettier --write .",
    ];
    for (const description of expectedDescriptions) {
      assertEquals(
        joinedOutput.includes(description),
        true,
        `output should contain description '${description}'`,
      );
    }
  });
});

Deno.test("findAllScripts returns empty array when no Makefile or package.json exists", async () => {
  const tempDir = await Deno.makeTempDir();
  const originalCwd = Deno.cwd();
  try {
    Deno.chdir(tempDir);
    const lines = await findAllScripts();
    assertEquals(lines, [], "should return empty array when no config files found");
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findAllScripts separates columns with triple-space padding", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();

    for (const line of lines) {
      assertEquals(
        line.includes("   "),
        true,
        `each line should contain triple-space column separator: "${line}"`,
      );
    }
  });
});

Deno.test("findAllScripts uses triple-space as the column separator between all parts", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();
    for (const line of lines) {
      // Split on the # separator and check that both sides have triple-space padding
      const hashIndex = line.indexOf("#");
      const commandSide = line.slice(0, hashIndex);
      const descriptionSide = line.slice(hashIndex + 1);
      // The # should be preceded and followed by exactly 3 spaces
      assert(commandSide.endsWith("   "), `command side should end with triple space: "${commandSide}"`);
      assert(descriptionSide.startsWith("   "), `description side should start with triple space: "${descriptionSide}"`);
    }
  });
});

Deno.test("findAllScripts produces lines of equal total length", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();
    const lineLengths = lines.map((line) => line.length);
    const expectedLength = lineLengths[0];

    for (let i = 1; i < lineLengths.length; i++) {
      assertEquals(
        lineLengths[i],
        expectedLength,
        `all lines should have equal length ${expectedLength}, but line ${i} has length ${lineLengths[i]}`,
      );
    }
  });
});
