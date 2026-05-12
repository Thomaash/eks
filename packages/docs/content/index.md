# Eks Documentation

`eks` is a Deno CLI that discovers `Makefile` targets and `package.json` scripts in a project and lets you pick one — or several — to run from a fuzzy-searchable picker.

## Highlights

- Walks up from the current directory to find a `Makefile` and/or `package.json`.
- Fuzzy picker for single-script execution.
- `--multiple` batch mode: edit the script list in your editor, then run sequential batches with intra-batch concurrency.
- Configurable editor (`--editor`, `$VISUAL`, `$EDITOR`, `nano`) used for both the batch file and the failure-log viewer.

## Pages

- [Install](/eks/install) — install via `deno install` and required Deno permissions.
- [Usage](/eks/usage) — single-pick and `--multiple` walkthroughs.
- [Configuration](/eks/configuration) — `--editor` flag and environment variables.
- [Troubleshooting](/eks/troubleshooting) — common errors and how to recover.

## Package

Published on JSR as [`@tomina/eks`](https://jsr.io/@tomina/eks).
