# pm

Standalone CLI for package manager operations in monorepos. Supports pnpm, bun, and npm.

## Structure

- `entries/cli.ts` — Effect CLI bootstrap
- `src/commands/` — Command implementations (install, add, remove, ls, cd, activate)
- `src/pm/` — Package manager abstraction (pnpm/bun/npm implementations, detection)
- `src/project/find-upward.ts` — Upward file traversal utility
- `src/lib/errors.ts` — Tagged errors

## Commands

- `pm i` — Install with monorepo awareness (auto-filters in package dir, warns at root)
- `pm add <packages...>` — Add packages (`-D` for dev)
- `pm remove <packages...>` — Remove packages
- `pm ls` — List workspace packages as tree
- `pm cd [package-name]` — Print package dir; shell wrapper via `activate` enables actual cd
- `pm activate <shell>` — Output shell wrapper + completions (zsh/bash)

## Deployment

See `docs/deployment.md` for the full release pipeline.

## Development

```sh
bun install
bun run check:tsc
bun entries/cli.ts i
```
