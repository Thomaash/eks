import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { execEkssScripts } from "./exec.ts";

async function withTempDir<T>(fn: (tempDir: string) => Promise<T>): Promise<T> {
  const tempDir = await Deno.makeTempDir();
  try {
    return await fn(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

Deno.test("execEkssScripts opens failure logs with the resolved editor", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail.sh");
    await Deno.writeTextFile(scriptFile, `echo out; echo err >&2; exit 1\n`);

    // Fake editor writes its argv to a probe file so we can confirm it ran with log paths
    const probe = join(tempDir, "editor-argv.txt");
    const editor = join(tempDir, "fake-editor.sh");
    await Deno.writeTextFile(
      editor,
      `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${probe}"\nexit 0\n`,
    );
    await Deno.chmod(editor, 0o755);

    const error = await assertRejects(
      () => execEkssScripts(tempDir, scriptFile, { editor }),
      Error,
    );
    assertStringIncludes(error.message, "Command failed");

    const captured = (await Deno.readTextFile(probe)).trim().split("\n");
    assert(captured.length >= 1, "editor should have been invoked with at least one log path");
    for (const path of captured) {
      assert(
        path.endsWith(".stdout.log") || path.endsWith(".stderr.log"),
        `each argv entry should be a log path, got: ${path}`,
      );
    }
  });
});

Deno.test("execEkssScripts re-throws original error when the editor cannot be launched", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail2.sh");
    await Deno.writeTextFile(scriptFile, `exit 9\n`);

    // Editor path that does not exist — Deno.Command rejects before output()
    const editor = join(tempDir, "nonexistent-editor-binary");

    const error = await assertRejects(
      () => execEkssScripts(tempDir, scriptFile, { editor }),
      Error,
    );
    assertStringIncludes(error.message, "Command failed with 9");
  });
});

Deno.test("execEkssScripts cleans up its temp dir even when editor launch fails", async () => {
  const tmpRoot = Deno.env.get("TMPDIR") ?? "/tmp";
  const dirsBefore = new Set(
    Array.from(Deno.readDirSync(tmpRoot))
      .filter((e) => e.isDirectory)
      .map((e) => e.name),
  );

  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail3.sh");
    await Deno.writeTextFile(scriptFile, `exit 1\n`);
    const editor = join(tempDir, "nonexistent-editor-binary");
    try {
      await execEkssScripts(tempDir, scriptFile, { editor });
    } catch {
      // expected
    }
  });

  const dirsAfter = Array.from(Deno.readDirSync(tmpRoot))
    .filter((e) => e.isDirectory)
    .map((e) => e.name);
  const leaked = dirsAfter.filter((d) => !dirsBefore.has(d));
  assertEquals(leaked.length, 0, `should not leak temp dirs when editor launch fails: ${leaked.join(", ")}`);
});
