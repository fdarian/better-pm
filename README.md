# pm

A CLI for smarter package manager operations (especially in monorepos).

- **Package manager agnostic** — works with pnpm and bun, no need to remember which one your project uses
- **Scoped installs by default** — automatically installs only the current package, no more accidental full-monorepo installs
- **Easy navigation** — jump to any workspace package from anywhere

## Install

```bash
brew install fdarian/tap/better-pm
```

<details>
<summary>Or with npm</summary>

```bash
npm install -g better-pm
```

</details>

> Homebrew is recommended — it installs a native binary, so shell completions resolve in ~60ms.

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

## How it works

1. **Detects your package manager** by walking up from the current directory looking for `pnpm-lock.yaml` or `bun.lock`/`bun.lockb`
2. **Detects monorepo context** — whether you're at the root or inside a workspace package
3. **Builds the right command** — `pnpm -F pkg... install` or `bun install --filter pkg`
