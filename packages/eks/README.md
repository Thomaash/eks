# eks

Execute known scripts from any project directory.

## Usage

```
eks [--multiple] [--editor <executable>]
```

- `--multiple` opens the discovered scripts in your editor as a batch file. Uncommented lines are then executed; blank lines separate sequential batches and lines within a batch run concurrently.
- `--editor <executable>` selects the editor used for the multi-select batch file and for opening failure logs after a batched run.

### Editor resolution

The editor executable is resolved once at startup, in this precedence order:

1. `--editor <executable>`
2. `$VISUAL`
3. `$EDITOR`
4. `nano`

The resolved value is passed directly to the OS as a single executable name. Multi-word command strings such as `code --wait` are **not** parsed as shell commands and are not supported — pass a single executable like `nvim`, `vim`, `nano`, or `code`.

If the resolved editor cannot be launched while opening failure logs, `eks` continues its existing cleanup and re-throws the original execution error.

## Package Structure

| Directory   | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| `mod.ts`    | CLI entry point (single entry point for the package).                |
| `*.ts`      | Internal modules (all files at root level).                          |
| `fixtures/` | Example projects for testing.                                        |
