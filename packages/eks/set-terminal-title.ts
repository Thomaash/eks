/**
 * Sets the terminal title using an ANSI escape sequence (OSC 2).
 *
 * Writes directly to stdout.
 * Has no effect in terminals that do not support the OSC 2 escape sequence.
 *
 * @param title - The string to set as the terminal title.
 *
 * @example
 * ```ts
 * setTerminalTitle("EKS | ~/projects/my-app");
 * ```
 */
export function setTerminalTitle(title: string): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(`\x1b]2;${title}\x07`);
  Deno.stdout.write(data);
}
