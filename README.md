# eks monorepo — contributor guide

This repository is a [Deno workspace](https://docs.deno.com/runtime/fundamentals/workspaces/) containing the `@tomina/eks` CLI and a Nuxt-based documentation site. This README is for contributors and coding agents working **inside** the repo. End-users should consult the published package and docs site (see [User docs](#user-docs)).

## Packages

| Path            | Name          | Purpose                                                                |
| --------------- | ------------- | ---------------------------------------------------------------------- |
| `packages/eks`  | `@tomina/eks` | The CLI source — published to JSR. Entry: `./mod.ts`.                  |
| `packages/docs` | (unpublished) | Nuxt + `@nuxt/content` documentation site, served at base URL `/eks/`. |

The workspace is wired up in `/app/deno.jsonc`:

```jsonc
{
  "nodeModulesDir": "auto",
  "lock": { "frozen": true },
  "workspace": ["./packages/eks", "./packages/docs"],
}
```

`lock` is frozen, so install/resolve steps will fail if `deno.lock` is out of sync — regenerate it intentionally when you change dependencies.

## Local development

Run tasks from within each package directory (the workspace does not define root-level aggregate tasks).

### Run `eks` from source

```sh
cd packages/eks
deno task eks            # single-pick script runner
deno task eks:multiple   # multi-pick script runner
```

Both tasks invoke `mod.ts` with the permission set used in CI (`--allow-env --allow-read --allow-run --allow-sys --allow-write`).

### Run the docs site

```sh
cd packages/docs
deno task dev        # Nuxt dev server
deno task build      # production build
deno task generate   # static site generation
```

Note `nuxt.config.ts` sets `app.baseURL = '/eks/'`, so locally the site is served under that path.

## Testing

CI (`.github/workflows/eks-validate.yml`, runs on every push and PR) executes:

```sh
deno test packages/eks/ --allow-env --allow-read --allow-run --allow-sys --allow-write
```

Run the same command locally before opening a PR. Mutation testing is available via `deno task stryker` from `packages/eks/` (uses `npx @stryker-mutator/core`).

## Linting and formatting

There are currently **no repo-level lint/fmt tasks**. Use Deno's built-ins directly from the repo root:

```sh
deno fmt        # format the workspace
deno fmt --check
deno lint       # lint the workspace
```

## Release / publish flow

`@tomina/eks` is published to JSR by `.github/workflows/eks-publish.yml`. The workflow triggers on pushes to `main` that touch `packages/eks/**` (or the workflow file itself), runs the test suite, then runs `deno publish` from `packages/eks/`.

To cut a release:

1. Bump the `version` field in `packages/eks/deno.jsonc`.
2. Land the commit on `main` (via PR).
3. The publish workflow runs automatically; JSR rejects republishing an existing version, so the version bump is what actually triggers a new release.

The docs site is not currently auto-published from this repo.

## Commit policy

Per `AGENTS.md`: [Conventional Commits](https://www.conventionalcommits.org/) with scopes, one atomic change per commit. Words like "and"/"also" in a commit subject are a signal to split. Types in use: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `style`, `perf`, `build`.

## User docs

If you're looking to **use** `eks` rather than contribute to it, see the published package on JSR (`@tomina/eks`) and the documentation site generated from `packages/docs/`.
