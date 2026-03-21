/**
 * Sets the terminal title using an ANSI escape sequence.
 *
 * @param title - The string to set as the terminal title.
 */
export function setTerminalTitle(title: string): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(`\x1b]2;${title}\x07`);
  Deno.stdout.write(data);
}
