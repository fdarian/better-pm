# pm

Standalone CLI for package manager operations in monorepos. Supports pnpm, bun, and npm.

## Structure

- `entries/cli.ts` — Effect CLI bootstrap
- `src/commands/install.ts` — Core install logic with monorepo-root safety
- `src/pm/` — Package manager abstraction (Context.Tag service, pnpm/bun implementations, detection)
- `src/project/find-upward.ts` — Upward file traversal utility
- `src/lib/errors.ts` — Tagged errors

## Commands

- `pm i` — Install with monorepo awareness
  - From package dir: auto-filters to current package
  - From monorepo root: warns and lists packages, requires `--sure` or `-F <name>`
  - `--filter <name>` / `-F <name>` — target specific workspace packages (repeatable)
  - `--sure` — confirm full monorepo install from root
- `pm add <packages...>` — Add packages
  - `-D` — add as dev dependency
- `pm remove <packages...>` — Remove packages

## Deployment

See `docs/deployment.md` for the full release pipeline.

## Development

```sh
bun install
bun run check:tsc
bun entries/cli.ts i
```
