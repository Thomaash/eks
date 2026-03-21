#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run --allow-sys --allow-write

import { execNpfsScripts } from "./exec.ts";
import { findAllScripts } from "./find-all-scripts.ts";
import { setTerminalTitle } from "./set-terminal-title.ts";

setTerminalTitle(
  `NPF | ${Deno.cwd().replace(Deno.env.get("HOME") ?? "~", "~")}`,
);

const scripts = await findAllScripts();

const tempFilePath = await Deno.makeTempFile();
try {
  await Deno.writeTextFile(tempFilePath, scripts.join("\n"));

  const command = new Deno.Command("vw", {
    args: ["--", tempFilePath],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const output = await command.output();

  Deno.exitCode = output.code;
  if (output.success) {
    await execNpfsScripts(Deno.cwd(), tempFilePath);
  }
} finally {
  await Deno.remove(tempFilePath);
}
