import { assert, assertEquals } from "@std/assert";
import { pickMultiple } from "./pick-multiple.ts";

/**
 * Captures argv passed to a fake editor by writing it to a probe file.
 * Returns the path of the editor script and the probe file.
 */
async function makeArgvProbe(): Promise<{ editor: string; probe: string; cleanup: () => Promise<void> }> {
  const dir = await Deno.makeTempDir();
  const probe = `${dir}/probe.txt`;
  const editor = `${dir}/fake-editor.sh`;
  // Editor writes argv to the probe file then exits 0
  await Deno.writeTextFile(
    editor,
    `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${probe}"\nexit 0\n`,
  );
  await Deno.chmod(editor, 0o755);
  return {
    editor,
    probe,
    cleanup: () => Deno.remove(dir, { recursive: true }),
  };
}

/**
 * Runs `fn` inside a fresh empty temp directory so that `findAllScripts()`,
 * which walks up from `Deno.cwd()`, discovers nothing. Restores the original
 * cwd and removes the temp directory afterwards.
 */
async function withEmptyCwd<T>(fn: () => Promise<T>): Promise<T> {
  const originalCwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    return await fn();
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
}

Deno.test("pickMultiple invokes the resolved editor with the temp script file path", async () => {
  await withEmptyCwd(async () => {
    const { editor, probe, cleanup } = await makeArgvProbe();
    try {
      const exitCode = await pickMultiple({ editor });
      assertEquals(exitCode, 0, "fake editor should exit cleanly");

      const captured = (await Deno.readTextFile(probe)).trim().split("\n");
      assertEquals(captured.length, 1, `expected exactly one argv entry, got: ${captured.join(", ")}`);
      assert(
        captured[0].length > 0 && captured[0].includes("/"),
        `argv[0] should be the absolute temp file path, got: ${captured[0]}`,
      );
    } finally {
      await cleanup();
    }
  });
});

Deno.test("pickMultiple returns the editor's non-zero exit code without executing scripts", async () => {
  await withEmptyCwd(async () => {
    const dir = await Deno.makeTempDir();
    const editor = `${dir}/abort.sh`;
    await Deno.writeTextFile(editor, `#!/bin/sh\nexit 7\n`);
    await Deno.chmod(editor, 0o755);
    try {
      const exitCode = await pickMultiple({ editor });
      assertEquals(exitCode, 7, "should propagate the editor's exit code");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});
