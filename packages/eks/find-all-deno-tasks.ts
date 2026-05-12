import type { CommandEntry } from "./find-all-scripts-types.ts";
import { parse } from "@std/jsonc/parse";

/**
 * Parses a Deno config (`deno.json` or `deno.jsonc`) and returns all tasks declared under its `tasks` object as {@link CommandEntry} items.
 *
 * Task values may be a string or an object with `command` and an optional `description`. The description column prefers an explicit `description`, falling back to the `command` string.
 *
 * @param denoConfigPath - Absolute path to the Deno config file to parse.
 * @returns An array of {@link CommandEntry} items, one per task.
 *
 * @example
 * ```ts
 * const entries = await findAllDenoTasks("/project/deno.jsonc");
 * // entries[0].commandParts → ["deno task", "", "dev"]
 * ```
 */
export async function findAllDenoTasks(
  denoConfigPath: string,
): Promise<CommandEntry[]> {
  const config = parse(await Deno.readTextFile(denoConfigPath)) as {
    tasks?: Record<string, string | { command?: string; description?: string }>;
  };

  return Object.entries(config.tasks ?? {}).map(
    ([name, value]): CommandEntry => ({
      commandParts: ["deno task", "", name],
      descriptionParts: [
        typeof value === "string"
          ? value
          : (value.description ?? value.command ?? ""),
      ],
    }),
  );
}
