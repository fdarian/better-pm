# better-pm

## 0.3.1

### Patch Changes

- 2314dfd: Resolve workspace dependencies recursively for bun/npm install filters

## 0.3.0

### Minor Changes

- a2243e4: Add `pm link` proxy command
- ff4eb5e: Add `pm ls` proxy command (pnpm ls / bun pm ls / npm ls)
- a01d51d: Add `pm run` proxy command
- 1e5c056: Add `pm unlink` proxy command
- 45f62d1: Add `pm up` / `pm update` proxy command with `-i` and `--latest` flag forwarding
- 8e9f75f: Add `pm why` proxy command (pnpm why / bun why, unsupported for npm)
- 539d159: Add `pm x` proxy command (maps to pnpx / bunx / npx)

### Patch Changes

- d0986cb: Move PackageManagerLayer to individual commands to avoid unnecessary detection for commands that don't need it
- 3c38a20: Rename `pm ls` (workspace tree listing) to `pm pls`

## 0.2.1

### Patch Changes

- 5d72a6c: Append `...` suffix to auto-detected package filter during install to include sub-dependencies

## 0.2.0

### Minor Changes

- 8dc8f78: Add `pm cd`, `pm ls`, and `pm activate` commands for workspace package navigation
- 9ee88f5: Add `pm install` as an alias for `pm i` command

### Patch Changes

- cbf6554: Show what command is running on install

## 0.1.1

### Patch Changes

- 057d222: Add `pm add` and `pm remove` commands
- fb71ac6: Stop auto-appending `...` to filter values in `pm i -F`
- 251fe73: Add npm package manager support

## 0.1.0

### Minor Changes

- ce0b2f8: `pm i` command
