import type { CommandEntry } from "./find-all-scripts-types.ts";
import { exists } from "@std/fs/exists";
import { parse } from "@std/jsonc/parse";
import { dirname, join } from "@std/path";

interface DenoConfig {
  tasks?: Record<string, string | { command?: string; description?: string }>;
  workspace?: string[];
}

const readDenoConfig = async (configPath: string): Promise<DenoConfig> =>
  parse(await Deno.readTextFile(configPath)) as DenoConfig;

const tasksToEntries = (
  config: DenoConfig,
  modifier: string,
): CommandEntry[] =>
  Object.entries(config.tasks ?? {}).map(
    ([name, value]): CommandEntry => ({
      commandParts: ["deno task", modifier, name],
      descriptionParts: [
        typeof value === "string"
          ? value
          : (value.description ?? value.command ?? ""),
      ],
    }),
  );

/**
 * Parses a Deno config (`deno.json` or `deno.jsonc`) and returns all `tasks` as {@link CommandEntry} items, including tasks from declared workspace members rendered with `--cwd ./<member>`.
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
  const rootConfig = await readDenoConfig(denoConfigPath);
  const rootEntries = tasksToEntries(rootConfig, "");

  if (!Array.isArray(rootConfig.workspace)) {
    return rootEntries;
  }

  const rootDir = dirname(denoConfigPath);

  const memberEntries = (
    await Promise.all(
      rootConfig.workspace.flatMap((member): Promise<CommandEntry[]>[] =>
        ["deno.json", "deno.jsonc"].map(
          async (fileName): Promise<CommandEntry[]> => {
            const candidate = join(rootDir, member, fileName);
            if (!(await exists(candidate, { isFile: true }))) {
              return [];
            }
            return tasksToEntries(await readDenoConfig(candidate), `--cwd ${member}`);
          },
        ),
      ),
    )
  ).flat(1);

  return [...rootEntries, ...memberEntries];
}
