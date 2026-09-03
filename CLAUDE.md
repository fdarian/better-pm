# pm

Standalone CLI for package manager operations in monorepos. Supports pnpm, bun, and npm.

This repo itself uses pnpm to manage dependencies (see `pnpm-workspace.yaml`, `enableGlobalVirtualStore: true`) and bun as the runtime for executing scripts (`bun scripts/*.ts`, `bun entries/cli.ts`).

## Structure

- `entries/cli.ts` — Effect CLI bootstrap
- `src/commands/` — Command implementations (install, add, remove, ls, cd, activate)
- `src/pm/` — Package manager abstraction (pnpm/bun/npm implementations, detection)
- `src/pm/filter-argv.ts` — Shared `-F/--filter` argv assembly; each PM declares a `FilterSpec` (flag spelling, position relative to the subcommand, selector-syntax support, and which operations it can't filter at all) consumed by every command that shells out
- `src/commands/run-filtered-command.ts` — Shared tail for filterable passthrough commands (run/exec/why/unlink/ls/up): assembles argv, logs it, executes it
- `src/project/find-upward.ts` — Upward file traversal utility
- `src/project/config.ts` — Config loading; merges global `~/.config/better-pm/config.json` (XDG-aware) under per-project `pm.config.json`
- `src/lib/errors.ts` — Tagged errors
- `lua/pm/` — Neovim plugin module (`:pm cd` wraps `pm cd` and opens the result in oil.nvim); see `docs/nvim.md`
- `plugin/` — Registers the `:Pm` user command and the `:pm` cmdline abbreviation that expands to it; lives at repo root (not `src/`) because lazy.nvim can't install from a subdirectory

## Commands

- `pm i` — Install with monorepo awareness (auto-filters in package dir, warns at root)
- `pm add <packages...>` — Add packages (`-D` for dev)
- `pm remove <packages...>` — Remove packages
- `pm ls` — List workspace packages as tree
- `pm cd [package-name]` — Print package dir; shell wrapper via `activate` enables actual cd
- `pm activate <shell>` — Output shell wrapper + completions (zsh/bash)
- `-F/--filter <selector>` — Scopes `i`/`add`/`remove`/`run`/`up`/`update`/`exec`/`why`/`unlink`/`ls` to specific workspace package(s); repeatable. Not offered on `link`/`x`/`cd`/`activate`; a (PM, operation) pair that can't filter (e.g. bun on `exec`/`why`/`unlink`/`ls`) fails loudly instead of being silently ignored

## Deployment

See `docs/deployment.md` for the full release pipeline.

## Development

```sh
pnpm install
bun run check:tsc
bun entries/cli.ts i
```
