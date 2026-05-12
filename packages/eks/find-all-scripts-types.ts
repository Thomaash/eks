/**
 * Represents a discovered script command from a project's task runner (e.g. Make, npm, pnpm).
 * Each entry is split into aligned column parts for formatted terminal output.
 */
export interface CommandEntry {
  /**
   * The parts of the shell command.
   * Joined with padded spaces to align all entries into columns.
   *
   * @example ["pnpm run", "--filter ./packages/docs", "dev"]
   */
  commandParts: string[];
  /**
   * The parts of the description, rendered as a trailing shell comment (after `#`).
   * Joined with padded spaces to align into columns.
   */
  descriptionParts: string[];
}
