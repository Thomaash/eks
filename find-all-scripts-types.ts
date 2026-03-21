export interface CommandEntry {
  /**
   * The parts of the shell command, will be joined with (multiple) spaces to
   * align all into columns.
   */
  commandParts: string[];
  /**
   * The parts of the description, used in a single line shell comment (after
   * #), will be joined with (multiple) spaces to align all into columns.
   */
  descriptionParts: string[];
  /**
   * The parts of the manager name (typically just a single one), used in a
   * single line shell comment (after #), will be joined with (multiple) spaces
   * to align all into columns.
   */
  managerParts: string[];
}
