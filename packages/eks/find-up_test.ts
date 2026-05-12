import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { findUp } from "./find-up.ts";

async function withTempCwd<T>(fn: (tmpDir: string) => Promise<T>): Promise<T> {
  const originalCwd = Deno.cwd();
  const tmpDir = await Deno.makeTempDir();
  try {
    return await fn(tmpDir);
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tmpDir, { recursive: true });
  }
}

Deno.test("findUp returns path to target file in ancestor directory when called from deeply nested subdirectory", async () => {
  await withTempCwd(async (tmpDir) => {
    const targetFile = "findup-target.txt";
    await Deno.writeTextFile(join(tmpDir, targetFile), "");

    const nestedDir = join(tmpDir, "a", "b", "c");
    await Deno.mkdir(nestedDir, { recursive: true });
    Deno.chdir(nestedDir);

    const result = await findUp(targetFile);

    assertEquals(result, join(tmpDir, targetFile));
  });
});

Deno.test("findUp returns null when target file does not exist anywhere in the hierarchy", async () => {
  await withTempCwd(async (tmpDir) => {
    const nestedDir = join(tmpDir, "a", "b", "c");
    await Deno.mkdir(nestedDir, { recursive: true });
    Deno.chdir(nestedDir);

    const result = await findUp("nonexistent-file-that-will-never-exist.txt");

    assertEquals(result, null);
  });
});

Deno.test("findUp returns path to target file when it exists in the current directory", async () => {
  await withTempCwd(async (tmpDir) => {
    const targetFile = "findup-target.txt";
    await Deno.writeTextFile(join(tmpDir, targetFile), "");
    Deno.chdir(tmpDir);

    const result = await findUp(targetFile);

    assertEquals(result, join(tmpDir, targetFile));
  });
});
