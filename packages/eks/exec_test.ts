import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { execEkssScripts } from "./exec.ts";

Deno.test("execEkssScripts is exported as a function from exec.ts", async () => {
  const mod = await import("./exec.ts");
  const exports = mod as Record<string, unknown>;
  assertEquals(typeof exports["execEkssScripts"], "function", "execEkssScripts should be exported as a function");
});

async function withTempDir<T>(fn: (tempDir: string) => Promise<T>): Promise<T> {
  const tempDir = await Deno.makeTempDir();
  try {
    return await fn(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

function fileExists(path: string): Promise<boolean> {
  return Deno.stat(path).then(() => true).catch(() => false);
}

function captureConsoleInfo(fn: () => Promise<void>): Promise<string[][]> {
  const captured: string[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    captured.push(args.map(String));
  };
  return fn().then(() => {
    console.info = original;
    return captured;
  }).catch((err) => {
    console.info = original;
    throw err;
  });
}

Deno.test("execEkssScripts logs [PLAN], [EXEC], [OKAY], and [DONE] markers for successful execution", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "log_test.sh");
    await Deno.writeTextFile(scriptFile, "echo hello\n");

    const logs = await captureConsoleInfo(() => execEkssScripts(tempDir, scriptFile));
    const tags = logs.map((args) => args[0]);

    assert(tags.includes("[PLAN]"), "should log [PLAN]");
    assert(tags.includes("[EXEC]"), "should log [EXEC]");
    assert(tags.includes("[OKAY]"), "should log [OKAY]");
    assert(tags.includes("[DONE]"), "should log [DONE]");
  });
});

Deno.test("execEkssScripts logs [FAIL] marker when command fails", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail_log.sh");
    await Deno.writeTextFile(scriptFile, "exit 1\n");

    const logs: string[][] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String));
    };

    try {
      await execEkssScripts(tempDir, scriptFile);
    } catch {
      // expected
    } finally {
      console.info = original;
    }

    const tags = logs.map((args) => args[0]);
    assert(tags.includes("[FAIL]"), "should log [FAIL] on failure");
  });
});

Deno.test("execEkssScripts completes without throwing for a script with a single valid command", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "valid.sh");
    await Deno.writeTextFile(scriptFile, "echo hello\n");

    await execEkssScripts(tempDir, scriptFile);
  });
});

Deno.test("execEkssScripts throws an error containing 'Command failed' for a script with a non-zero exit command", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "failing.sh");
    await Deno.writeTextFile(scriptFile, "exit 1\n");

    const error = await assertRejects(
      () => execEkssScripts(tempDir, scriptFile),
      Error,
    );
    assertStringIncludes(error.message, "Command failed");
  });
});

Deno.test("execEkssScripts skips comment lines starting with '#' and executes only non-comment commands", async () => {
  await withTempDir(async (tempDir) => {
    const markerFile = join(tempDir, "executed.marker");
    const scriptFile = join(tempDir, "comments.sh");
    await Deno.writeTextFile(
      scriptFile,
      `# This is a comment\ntouch ${markerFile}\n# Another comment\n`,
    );

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerFile), "marker file should exist after non-comment command executes");
  });
});

Deno.test("execEkssScripts strips inline comments after commands", async () => {
  await withTempDir(async (tempDir) => {
    const markerFile = join(tempDir, "inline.marker");
    const scriptFile = join(tempDir, "inline_comment.sh");
    await Deno.writeTextFile(
      scriptFile,
      `touch ${markerFile} # this is an inline comment\n`,
    );

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerFile), "command before inline # should still execute");
  });
});

Deno.test("execEkssScripts prefixes commands with LC_ALL=en_US.UTF-8", async () => {
  await withTempDir(async (tempDir) => {
    const outputFile = join(tempDir, "locale.out");
    const scriptFile = join(tempDir, "locale.sh");
    await Deno.writeTextFile(
      scriptFile,
      `printenv LC_ALL > ${outputFile}\n`,
    );

    await execEkssScripts(tempDir, scriptFile);

    const content = (await Deno.readTextFile(outputFile)).trim();
    assertEquals(content, "en_US.UTF-8", "LC_ALL should be set by command prefix");
  });
});

Deno.test("execEkssScripts trims leading whitespace from script lines", async () => {
  await withTempDir(async (tempDir) => {
    const markerFile = join(tempDir, "trimmed.marker");
    const scriptFile = join(tempDir, "indented.sh");
    await Deno.writeTextFile(
      scriptFile,
      `   touch ${markerFile}\n`,
    );

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerFile), "indented command should still execute after trimming");
  });
});

Deno.test("execEkssScripts writes error logs on command failure", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail_with_output.sh");
    await Deno.writeTextFile(
      scriptFile,
      `echo failure_output >&2; exit 42\n`,
    );

    const error = await assertRejects(
      () => execEkssScripts(tempDir, scriptFile),
      Error,
    );
    assertStringIncludes(error.message, "Command failed with 42");
  });
});

Deno.test("execEkssScripts handles script content with leading and trailing blank lines", async () => {
  await withTempDir(async (tempDir) => {
    const markerFile = join(tempDir, "trim.marker");
    const scriptFile = join(tempDir, "padded.sh");
    await Deno.writeTextFile(scriptFile, `\n\ntouch ${markerFile}\n\n`);

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerFile), "command should execute despite surrounding blank lines");
  });
});

Deno.test("execEkssScripts executes a command that ends with a hash character", async () => {
  await withTempDir(async (tempDir) => {
    const markerFile = join(tempDir, "endhash.marker");
    const scriptFile = join(tempDir, "endhash.sh");
    await Deno.writeTextFile(scriptFile, `touch ${markerFile} #\n`);

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerFile), "command ending with # should still execute");
  });
});

Deno.test("execEkssScripts groups concurrent commands in a single batch in PLAN output", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "concurrent.sh");
    // Two commands with no blank line between them = one batch
    await Deno.writeTextFile(scriptFile, `echo one\necho two\n`);

    const logs = await captureConsoleInfo(() => execEkssScripts(tempDir, scriptFile));

    // Count batches: each batch execution is followed by an empty log line
    // For a single batch of 2 commands: [PLAN], "", [EXEC]x2, [OKAY]x2, "", [DONE], ""
    // For two separate batches: [PLAN], "", [EXEC], [OKAY], "", [EXEC], [OKAY], "", [DONE], ""
    const execCount = logs.filter((args) => args[0] === "[EXEC]").length;
    assertEquals(execCount, 2, "should execute 2 commands");

    // With single batch: 3 empty lines (after PLAN, after batch, after DONE)
    // With split into 2 batches: 4 empty lines (after PLAN, after batch1, after batch2, after DONE)
    const emptyLogs = logs.filter((args) => args.length === 1 && args[0] === "");
    assertEquals(emptyLogs.length, 3, "single batch should produce 3 empty lines, not 4");
  });
});

Deno.test("execEkssScripts logs exactly 3 empty lines: after plan, after batch, and after done", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "spacing.sh");
    await Deno.writeTextFile(scriptFile, `echo hello\n`);

    const logs = await captureConsoleInfo(() => execEkssScripts(tempDir, scriptFile));
    const emptyLogs = logs.filter((args) => args.length === 1 && args[0] === "");
    assertEquals(emptyLogs.length, 3, `should have exactly 3 empty spacing lines, got ${emptyLogs.length}`);
  });
});

Deno.test("execEkssScripts cleans up its internal temporary directory after successful execution", async () => {
  const tmpRoot = Deno.env.get("TMPDIR") ?? "/tmp";
  const dirsBefore = new Set(
    Array.from(Deno.readDirSync(tmpRoot))
      .filter((e) => e.isDirectory)
      .map((e) => e.name),
  );

  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "cleanup.sh");
    await Deno.writeTextFile(scriptFile, `echo hello\n`);
    await execEkssScripts(tempDir, scriptFile);
  });

  const dirsAfter = Array.from(Deno.readDirSync(tmpRoot))
    .filter((e) => e.isDirectory)
    .map((e) => e.name);
  const leaked = dirsAfter.filter((d) => !dirsBefore.has(d));
  assertEquals(leaked.length, 0, `should not leak temp directories, but found: ${leaked.join(", ")}`);
});

Deno.test("execEkssScripts cleans up its internal temporary directory after failed execution", async () => {
  const tmpRoot = Deno.env.get("TMPDIR") ?? "/tmp";
  const dirsBefore = new Set(
    Array.from(Deno.readDirSync(tmpRoot))
      .filter((e) => e.isDirectory)
      .map((e) => e.name),
  );

  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail_cleanup.sh");
    await Deno.writeTextFile(scriptFile, `exit 1\n`);
    try {
      await execEkssScripts(tempDir, scriptFile);
    } catch {
      // expected
    }
  });

  const dirsAfter = Array.from(Deno.readDirSync(tmpRoot))
    .filter((e) => e.isDirectory)
    .map((e) => e.name);
  const leaked = dirsAfter.filter((d) => !dirsBefore.has(d));
  assertEquals(leaked.length, 0, `should not leak temp directories on failure, but found: ${leaked.join(", ")}`);
});

Deno.test("execEkssScripts writes .stdout.log and .stderr.log files on command failure", async () => {
  await withTempDir(async (tempDir) => {
    const scriptFile = join(tempDir, "fail_logs.sh");
    await Deno.writeTextFile(scriptFile, `echo out_content; echo err_content >&2; exit 1\n`);

    // Patch Deno.makeTempDir to capture the internal temp dir path
    const originalMakeTempDir = Deno.makeTempDir;
    let internalTempDir = "";
    Deno.makeTempDir = async () => {
      internalTempDir = await originalMakeTempDir();
      return internalTempDir;
    };

    // Patch Deno.remove to prevent cleanup so we can inspect logs
    const originalRemove = Deno.remove;
    const removedPaths: string[] = [];
    Deno.remove = async (path: string | URL, options?: Deno.RemoveOptions) => {
      const pathStr = path.toString();
      if (pathStr === internalTempDir) {
        removedPaths.push(pathStr);
        // Don't actually remove — we want to inspect the files
        return;
      }
      return originalRemove(path, options);
    };

    try {
      await execEkssScripts(tempDir, scriptFile);
    } catch {
      // expected
    } finally {
      Deno.makeTempDir = originalMakeTempDir;
      Deno.remove = originalRemove;
    }

    assert(internalTempDir !== "", "should have captured internal temp dir path");
    assert(removedPaths.includes(internalTempDir), "should attempt to remove the temp dir");

    // Check log files exist with correct names
    const logFiles = Array.from(Deno.readDirSync(internalTempDir))
      .map((e) => e.name)
      .sort();
    assert(logFiles.some((f) => f.endsWith(".stdout.log")), `should have .stdout.log file, got: ${logFiles}`);
    assert(logFiles.some((f) => f.endsWith(".stderr.log")), `should have .stderr.log file, got: ${logFiles}`);

    // Check content format: "command\n\noutput"
    const stdoutLog = await Deno.readTextFile(
      join(internalTempDir, logFiles.find((f) => f.endsWith(".stdout.log"))!),
    );
    assert(stdoutLog.includes("\n\n"), "stdout log should contain command\\n\\noutput format");
    assert(stdoutLog.includes("out_content"), "stdout log should contain command output");

    const stderrLog = await Deno.readTextFile(
      join(internalTempDir, logFiles.find((f) => f.endsWith(".stderr.log"))!),
    );
    assert(stderrLog.includes("\n\n"), "stderr log should contain command\\n\\noutput format");
    assert(stderrLog.includes("err_content"), "stderr log should contain stderr output");

    // Clean up manually
    await originalRemove(internalTempDir, { recursive: true });
  });
});

Deno.test("execEkssScripts executes both command batches separated by a blank line", async () => {
  await withTempDir(async (tempDir) => {
    const markerA = join(tempDir, "batch_a.marker");
    const markerB = join(tempDir, "batch_b.marker");
    const scriptFile = join(tempDir, "batches.sh");
    await Deno.writeTextFile(
      scriptFile,
      `touch ${markerA}\n\ntouch ${markerB}\n`,
    );

    await execEkssScripts(tempDir, scriptFile);

    assert(await fileExists(markerA), "first batch marker file should exist");
    assert(await fileExists(markerB), "second batch marker file should exist");
  });
});
