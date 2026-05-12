import { Fzf as FZF } from "fzf";
import { search } from "@inquirer/prompts";

import { findAllScripts } from "./find-all-scripts.ts";

type Choice<Value> = {
  value: Value;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  type?: never;
};

/**
 * Presents an interactive fuzzy-search picker in the terminal.
 * Powered by `fzf` and `@inquirer/prompts`.
 *
 * @param items - The list of selectable strings.
 * @returns The selected item, or `undefined` if the user cancels.
 */
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

/**
 * Discovers all project scripts and presents them in an interactive fuzzy-search picker.
 * The selected script is executed via `dash`.
 *
 * @returns The exit code of the executed script, or `0` if no script was selected.
 *
 * @example
 * ```ts
 * const exitCode = await pickOne();
 * Deno.exit(exitCode);
 * ```
 */
export async function pickOne(): Promise<number> {
  const scripts = await findAllScripts();

  const script = await fuzzyPicker(scripts);

  if (!script) {
    return 0;
  }

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

  return output.code;
}
