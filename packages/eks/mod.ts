#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run --allow-sys --allow-write

import { parseEksArgs } from "./parse-eks-args.ts";
import { pickOne } from "./pick-one.ts";
import { pickMultiple } from "./pick-multiple.ts";
import { setTerminalTitle } from "./set-terminal-title.ts";

const args = parseEksArgs(Deno.args, Deno.env);

setTerminalTitle(
  `Eks | ${Deno.cwd().replace(Deno.env.get("HOME") ?? "~", "~")}`,
);

const exitCode = args.multiple
  ? await pickMultiple({ editor: args.editor })
  : await pickOne();
Deno.exit(exitCode);
