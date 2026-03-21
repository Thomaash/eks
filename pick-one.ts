#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run --allow-sys

import { Fzf as FZF } from "fzf";
import { search } from "@inquirer/prompts";

import { findAllScripts } from "./find-all-scripts.ts";
import { setTerminalTitle } from "./set-terminal-title.ts";

setTerminalTitle(
  `NPF | ${Deno.cwd().replace(Deno.env.get("HOME") ?? "~", "~")}`,
);

const scripts = await findAllScripts();

type Choice<Value> = {
  value: Value;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  type?: never;
};

async function fuzzyPicker(items: string[]): Promise<string | undefined> {
  const fzf = new FZF(items);

  const result = await search({
    message: "Filter:",
    pageSize: Deno.consoleSize().rows - 4,
    source(input: string | undefined): Choice<string>[] {
      if (input == null) {
        return items.map(
          (item): Choice<string> => ({ name: item, value: item }),
        );
      }

      const results = fzf.find(input);
      return results.map(
        (result): Choice<string> => ({ name: result.item, value: result.item }),
      );
    },
  });

  return result;
}

const script = await fuzzyPicker(scripts);

if (script) {
  setTerminalTitle(
    `NPF | ${Deno.cwd().replace(Deno.env.get("HOME") ?? "~", "~")} | ${script.replace(/#.*/, "")}`,
  );

  const command = new Deno.Command("dash", {
    args: ["-c", script],
    cwd: Deno.cwd(),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      LC_ALL: "en_US.UTF-8",
    },
  });
  const output = await command.output();

  Deno.exitCode = output.code;

  // TODO: The line above should be enough. There is something hanging and
  // reading stdin though and I can't figure out what.
  Deno.exit(output.code);
}
