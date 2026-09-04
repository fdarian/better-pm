# pm

A CLI for smarter package manager operations (especially in monorepos).

- **Package manager agnostic** — works with pnpm, bun, and nub, no need to remember which one your project uses
- **Clean signal handling** — `Ctrl+C` properly shuts down the entire process tree, no orphaned dev servers
- **Easy navigation** — jump to any workspace package from anywhere

https://github.com/user-attachments/assets/3d5496a9-91be-47dc-9e01-db8c5052c7c5

## Install

```bash
brew install fdarian/tap/better-pm
```

<details>
<summary>Or with npm</summary>

> Homebrew is recommended — it installs a native binary, so shell completions resolve in ~60ms.

```bash
npm install -g better-pm
```

</details>

Then activate shell integration:

```bash
# Add to your .zshrc (or .bashrc)
eval "$(pm activate zsh)"  # or bash
```

## Commands

```
pm i                     Install
pm add <pkg>             Add a dependency (-D for dev)
pm remove <pkg>          Remove a dependency
pm ls                    List workspace packages as a tree
pm cd <pkg>              cd into a workspace package
pm run <script>           Run a package.json script
pm <script>               Shorthand for pm run
pm exec <cmd>             Run a locally installed binary
```

Add `-F`/`--filter <pkg>` to `i`, `add`, `remove`, `run`, `up`/`update`, `exec`, `why`, `unlink`, or `ls` to scope it to specific workspace package(s), mirroring pnpm's `-F`. It chains, so you can target multiple packages in one go, and it works with the `pm <script>` shorthand too. Not available on `link`, `x`, `cd`, or `activate` — and bun doesn't support it on `exec`/`why`/`unlink`/`ls` either, so those fail loudly rather than silently ignoring the flag:

```bash
pm i -F @myapp/web -F @myapp/api
pm add -F @myapp/web lodash
pm -F @myapp/web dev
```

## Configuration

Drop a `pm.config.json` next to your lockfile to configure `pm` for your project.

### Auto-scope installs to the current package

With `scopedInstall: true`, running `pm i` from inside a workspace package installs only that package. From the monorepo root, `pm i` prompts before installing everything:

```json
{
  "scopedInstall": true
}
```

```
[WARNING] You are at the monorepo root. This will install ALL packages.

Workspace packages:
├── packages/
│   ├── core "@myapp/core"
│   └── utils "@myapp/utils"
└── apps/
    └── web "@myapp/web"

To install a specific package:
  pm i -F <package-name>

To install everything:
  pm i -y
```

## Paste-friendly add

Copied a command from a README? Just paste it:

```bash
pm add "npm install -D something"    # automatically extracts -D and the package
pm add "pnpm add foo bar"            # works with any package manager command
pm add "bun add -D @scope/pkg"       # scoped packages too
```

`pm` detects pasted `npm install`, `pnpm add`, `bun add` (and their shorthands like `npm i`) and extracts the packages and `-D` flag automatically.

## Workspace navigation

List all workspace packages as a tree:

```bash
pm ls
```

Jump to any package directory (requires [shell integration](#install)):

```bash
pm cd @myapp/web    # cd into a workspace package
pm cd               # cd to monorepo root
```

## Development

```sh
pnpm install
bun run check:tsc
bun entries/cli.ts i
```

To test shell integration and tab-completion (`pm cd`, `-F/--filter`) against local source instead of the installed `pm`, source the dev-activate script in your shell:

```sh
. scripts/dev-activate.sh
```

This points `pm` at this repo's source for the current shell session only.

## Neovim

A companion plugin opens workspace packages in [oil.nvim](https://github.com/stevearc/oil.nvim) via `:pm cd <package-name>` (a cmdline abbreviation for the underlying `:Pm` command). See [docs/nvim.md](docs/nvim.md).

