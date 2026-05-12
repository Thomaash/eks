# eks Monorepo

A Deno workspace monorepo containing the `eks` CLI tool for running scripts and a documentation site.

## Packages

### packages/eks

CLI tool for discovering and running scripts from your project. It finds Makefile targets, package.json scripts, and other runnable tasks, then lets you pick which one to execute.

- `deno task eks` -- launch the single-pick script runner (select one script to run)
- `deno task ekss` -- launch the multi-pick script runner (select multiple scripts to run)

### packages/docs

Documentation site built with Nuxt Content.

- `deno task dev` -- start the Nuxt development server
- `deno task build` -- build the documentation site for production
- `deno task generate` -- generate a static version of the documentation site

## Project Structure

```
.
├── deno.jsonc              # Root workspace configuration
├── deno.lock               # Shared lock file
├── packages/
│   ├── eks/                # CLI tool
│   │   └── deno.jsonc      # Package config with tasks and imports
│   └── docs/               # Documentation site
│       └── deno.jsonc      # Package config with tasks
└── docs/
    └── research/           # Research documentation
```

## Deno Workspace

This project uses a [Deno workspace](https://docs.deno.com/runtime/fundamentals/workspaces/) to manage multiple packages. The root `deno.jsonc` declares the workspace members:

```jsonc
{
  "workspace": ["./packages/eks", "./packages/docs"]
}
```

Each package has its own `deno.jsonc` with package-specific tasks and import mappings. The root `deno.lock` file provides a shared lock file across all workspace members, ensuring consistent dependency versions.

Run tasks from the project root by navigating into the respective package directory, or use `deno task` within each package directory directly.
