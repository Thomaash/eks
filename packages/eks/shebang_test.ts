import { assert, assertEquals, assertStringIncludes } from "@std/assert";

const decoder = new TextDecoder("utf-8");
const eksDir = new URL(".", import.meta.url).pathname;
const rootDir = new URL("../../", import.meta.url).pathname;

const entryPoints = [
  { file: "mod.ts", expectedFlags: ["--allow-env", "--allow-read", "--allow-run", "--allow-sys", "--allow-write"] },
];

for (const { file, expectedFlags } of entryPoints) {
  Deno.test(`${file} has a deno run shebang line`, async () => {
    const content = await Deno.readTextFile(`${eksDir}${file}`);
    const firstLine = content.split("\n")[0];

    assert(
      firstLine.startsWith("#!/usr/bin/env -S deno run"),
      `${file} must start with a deno run shebang, got: ${firstLine}`,
    );

    for (const flag of expectedFlags) {
      assertStringIncludes(
        firstLine,
        flag,
        `${file} shebang must include ${flag}`,
      );
    }
  });

  Deno.test(`${file} has executable permission`, async () => {
    const fileInfo = await Deno.stat(`${eksDir}${file}`);

    assert(fileInfo.mode !== null, `${file} mode must be available`);
    // Check owner execute bit (0o100)
    assert(
      (fileInfo.mode! & 0o111) !== 0,
      `${file} must have executable permission, got mode: ${(fileInfo.mode!).toString(8)}`,
    );
  });

  Deno.test(`${file} resolves imports without errors when checked from project root`, async () => {
    const command = new Deno.Command("deno", {
      args: ["check", `packages/eks/${file}`],
      cwd: rootDir,
      stdout: "piped",
      stderr: "piped",
    });

    const result = await command.output();
    const stderr = decoder.decode(result.stderr);

    assertEquals(
      result.code,
      0,
      `deno check from project root failed for ${file}: ${stderr}`,
    );
  });
}
