#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run --allow-sys --allow-write

import { parseArgs } from "@std/cli/parse-args";
import { pickOne } from "./pick-one.ts";
import { pickMultiple } from "./pick-multiple.ts";
import { setTerminalTitle } from "./set-terminal-title.ts";

const parsedArgs = parseArgs(Deno.args, {
  boolean: ["multiple"],
  default: { multiple: false },
});

setTerminalTitle(
  `Eks | ${Deno.cwd().replace(Deno.env.get("HOME") ?? "~", "~")}`,
);

const exitCode = parsedArgs.multiple ? await pickMultiple() : await pickOne();
Deno.exit(exitCode);
