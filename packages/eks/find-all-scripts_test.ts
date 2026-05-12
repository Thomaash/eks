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

Deno.test("findAllScripts combines Makefile, package.json, and Deno task sources into aligned formatted output", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();

    assertEquals(
      lines.length,
      6,
      "should have 6 entries (2 Makefile + 2 package.json + 2 Deno tasks)",
    );

    const makeEntries = lines.filter((line) => line.startsWith("make"));
    const npmEntries = lines.filter((line) => line.startsWith("npm"));
    const denoEntries = lines.filter((line) => line.startsWith("deno task"));
    assertEquals(makeEntries.length, 2, "should have 2 Makefile entries");
    assertEquals(npmEntries.length, 2, "should have 2 package.json entries");
    assertEquals(denoEntries.length, 2, "should have 2 Deno task entries");

    for (const line of lines) {
      assertEquals(line.includes("#"), true, `each line should contain '#' separator: ${line}`);
    }
  });
});

Deno.test("findAllScripts includes a 'deno task ...' line in the mixed fixture", async () => {
  await withFixtureCwd("mixed", async () => {
    const lines = await findAllScripts();
    const joinedOutput = lines.join("\n");

    assertEquals(
      joinedOutput.includes("deno task"),
      true,
      "output should contain a 'deno task' line",
    );
    assertEquals(
      joinedOutput.includes("check"),
      true,
      "output should include the 'check' Deno task name",
    );
    assertEquals(
      joinedOutput.includes("Run Deno benchmarks"),
      true,
      "output should include the Deno task object-form description",
    );
  });
});

Deno.test("findAllScripts in a deno-only fixture returns only Deno task entries", async () => {
  await withFixtureCwd("deno-only", async () => {
    const lines = await findAllScripts();

    assertEquals(lines.length, 3, "deno-only fixture has 3 Deno tasks");

    for (const line of lines) {
      assert(
        line.startsWith("deno task"),
        `every line should start with 'deno task' in a deno-only fixture: "${line}"`,
      );
      assert(
        !line.includes("make "),
        `no line should reference Make in a deno-only fixture: "${line}"`,
      );
      assert(
        !line.includes("npm run") && !line.includes("pnpm run"),
        `no line should reference npm/pnpm in a deno-only fixture: "${line}"`,
      );
    }

    // Alignment: all '#' separators should be at the same column.
    const separatorPositions = lines.map((line) => line.indexOf("#"));
    const firstPosition = separatorPositions[0];
    for (let i = 1; i < separatorPositions.length; i++) {
      assertEquals(
        separatorPositions[i],
        firstPosition,
        `all deno-only lines should align on '#', line ${i} at ${separatorPositions[i]} vs ${firstPosition}`,
      );
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

    const expectedCommands = ["make", "build", "test", "npm run", "dev", "format", "deno task", "check", "bench"];
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

Deno.test("findAllScripts in a deno-workspace fixture includes root and member task lines", async () => {
  await withFixtureCwd("deno-workspace", async () => {
    const lines = await findAllScripts();
    const joinedOutput = lines.join("\n");

    // Root task is rendered with an empty modifier slot.
    assert(
      joinedOutput.includes("root-task"),
      `output should include the root task name: ${joinedOutput}`,
    );

    // Member tasks render with --cwd ./<member>.
    assert(
      joinedOutput.includes("--cwd ./packages/web"),
      `output should include '--cwd ./packages/web' for the web member: ${joinedOutput}`,
    );
    assert(
      joinedOutput.includes("--cwd ./packages/api"),
      `output should include '--cwd ./packages/api' for the api member: ${joinedOutput}`,
    );

    assert(
      joinedOutput.includes("dev"),
      "output should include the web 'dev' task name",
    );
    assert(
      joinedOutput.includes("Build the web package"),
      "output should include the object-form description from the web member",
    );
    assert(
      joinedOutput.includes("serve"),
      "output should include the api 'serve' task name",
    );

    // Empty and missing members contribute nothing.
    assert(
      !joinedOutput.includes("--cwd ./packages/empty"),
      "member with config but no tasks should not appear",
    );
    assert(
      !joinedOutput.includes("--cwd ./packages/missing"),
      "missing member directory should not appear",
    );

    // Every line is still 'deno task ...' in this Deno-only fixture.
    for (const line of lines) {
      assert(
        line.startsWith("deno task"),
        `every line should start with 'deno task' in deno-workspace fixture: "${line}"`,
      );
    }

    // Expected count: 1 root + 2 web + 1 api = 4.
    assertEquals(
      lines.length,
      4,
      "deno-workspace should produce 4 entries (1 root + 2 web + 1 api)",
    );
  });
});

Deno.test("findAllScripts in deno-workspace aligns '#' across root and member entries", async () => {
  await withFixtureCwd("deno-workspace", async () => {
    const lines = await findAllScripts();

    const separatorPositions = lines.map((line) => line.indexOf("#"));
    const firstPosition = separatorPositions[0];
    for (let i = 1; i < separatorPositions.length; i++) {
      assertEquals(
        separatorPositions[i],
        firstPosition,
        `all deno-workspace lines should align on '#', line ${i} at ${separatorPositions[i]} vs ${firstPosition}`,
      );
    }

    const lineLengths = lines.map((line) => line.length);
    const expectedLength = lineLengths[0];
    for (let i = 1; i < lineLengths.length; i++) {
      assertEquals(
        lineLengths[i],
        expectedLength,
        `all deno-workspace lines should have equal length ${expectedLength}, but line ${i} has length ${lineLengths[i]}`,
      );
    }
  });
});
