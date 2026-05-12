# eks

`eks` is a Deno CLI that discovers runnable scripts in your project — `Makefile` targets and `package.json` scripts — presents them in a fuzzy-searchable picker, and runs your selection. It is published on JSR as [`@tomina/eks`](https://jsr.io/@tomina/eks) and is meant to be installed as a global executable.

## Install

```sh
deno install \
  --global \
  --allow-env --allow-read --allow-run --allow-sys --allow-write \
  --name eks \
  jsr:@tomina/eks
```

This installs an `eks` binary on your `PATH`. The bare package spec resolves to the package's single export (`./mod.ts`).

## Usage

Run from any project directory:

```sh
eks                          # fuzzy-pick one script and run it
eks --multiple               # batch-edit and run several scripts
eks --editor nvim            # override the editor used for batch mode and failure logs
```

### Single-pick mode (default)

`eks` discovers scripts (`Makefile` targets, `package.json` scripts, etc.), shows them in a fuzzy picker, and executes the one you select.

### Multi-pick mode (`--multiple`)

`eks --multiple` opens the discovered scripts in your editor as a batch file. After you save and exit:

- Uncommented lines are executed.
- Blank lines separate **sequential batches**.
- Lines **within a batch** run concurrently.

If any command in the batch fails, `eks` opens the failure log(s) in the same editor on a best-effort basis.

### `--editor <executable>`

`--editor` selects the editor used for the `--multiple` batch file and for opening failure logs. Resolution precedence:

1. `--editor <executable>`
2. `$VISUAL`
3. `$EDITOR`
4. `nano`

The value must be a single executable name (`nvim`, `vim`, `nano`, `code`, …). It is passed directly to the OS and is **not** parsed as a shell command, so multi-word strings like `code --wait` are not supported.

## Permissions

`eks` needs the following Deno permissions:

| Flag            | Reason                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `--allow-env`   | Read `HOME` for path display, and `VISUAL`/`EDITOR` for editor resolution |
| `--allow-read`  | Read `Makefile` and `package.json` to discover scripts                    |
| `--allow-run`   | Execute the selected script                                               |
| `--allow-sys`   | Query terminal size for the picker UI                                     |
| `--allow-write` | Create the temp batch file for `--multiple` mode (unused in single-pick)  |

If a permission is missing, Deno refuses to start with a `NotCapable` error. Re-install with the missing flag to fix it.

## Documentation

More detail lives in the docs site:

- [Install](/eks/install) — full install walkthrough and permission reference
- [Documentation home](/eks/) — usage, configuration, and troubleshooting

## License

ISC
