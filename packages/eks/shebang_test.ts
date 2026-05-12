import { assertEquals } from "@std/assert";

const decoder = new TextDecoder("utf-8");
const rootDir = new URL("../../", import.meta.url).pathname;

Deno.test("mod.ts resolves imports without errors when checked from project root", async () => {
  const command = new Deno.Command("deno", {
    args: ["check", "packages/eks/mod.ts"],
    cwd: rootDir,
    stdout: "piped",
    stderr: "piped",
  });

  const result = await command.output();
  const stderr = decoder.decode(result.stderr);

  assertEquals(
    result.code,
    0,
    `deno check from project root failed for mod.ts: ${stderr}`,
  );
});
