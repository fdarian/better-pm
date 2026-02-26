# pm

A CLI for smarter package manager operations (especially in monorepos).

- **Package manager agnostic** — works with pnpm and bun, no need to remember which one your project uses
- **Scoped installs by default** — automatically installs only the current package, no more accidental full-monorepo installs
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
pm i                     Install (monorepo-aware)
pm i -F <pkg>            Install specific workspace package(s)
pm add <pkg>             Add a dependency (-D for dev)
pm remove <pkg>          Remove a dependency
pm ls                    List workspace packages as a tree
pm cd <pkg>              cd into a workspace package
```

## Monorepo-aware install

From inside a workspace package, `pm i` automatically scopes to that package:

```bash
pm i                        # installs only the current package
pm i -F @myapp/web          # target a specific package
pm i -F @myapp/web -F @myapp/api   # target multiple
```

From the monorepo root, `pm i` won't blindly install everything — it shows a warning and lists your workspace packages:

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
  pm i --sure
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

