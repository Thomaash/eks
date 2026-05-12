import { assertEquals } from "@std/assert";
import { setTerminalTitle } from "./set-terminal-title.ts";

function expectedTitleBytes(title: string): Uint8Array {
  return new TextEncoder().encode(`\x1b]2;${title}\x07`);
}

function captureStdoutWrite(fn: () => void): Uint8Array {
  const chunks: Uint8Array[] = [];
  const originalWrite = Deno.stdout.write;
  // deno-lint-ignore require-await
  Deno.stdout.write = async (data: Uint8Array): Promise<number> => {
    chunks.push(new Uint8Array(data));
    return data.length;
  };
  try {
    fn();
  } finally {
    Deno.stdout.write = originalWrite;
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

Deno.test("setTerminalTitle writes ANSI escape sequence ESC]2;{title}BEL to stdout", () => {
  const title = "my terminal title";
  const actualBytes = captureStdoutWrite(() => setTerminalTitle(title));

  assertEquals(
    actualBytes,
    expectedTitleBytes(title),
    "stdout should contain the exact ANSI escape sequence ESC]2;{title}BEL",
  );
});

Deno.test("setTerminalTitle writes correct bytes for empty title string", () => {
  const actualBytes = captureStdoutWrite(() => setTerminalTitle(""));

  assertEquals(actualBytes[0], 0x1b, "first byte should be ESC (0x1b)");
  assertEquals(actualBytes[actualBytes.length - 1], 0x07, "last byte should be BEL (0x07)");
  assertEquals(
    actualBytes,
    expectedTitleBytes(""),
    "stdout should contain the exact ANSI escape sequence even with empty title",
  );
});
