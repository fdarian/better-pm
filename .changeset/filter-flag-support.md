---
"better-pm": minor
---

Add `-F/--filter` across the CLI: `i`, `add`, `remove`, `run`, `up`/`update`, `exec`, `why`, `unlink`, `ls`, and the bare-script shorthand (`pm -F web dev`). Accepted before or after the subcommand, mirroring pnpm. Maps to each package manager's native filter flag, and fails loudly when a (package manager, operation) pair can't filter instead of silently dropping the selector. Shell completions now suggest workspace package names after `-F`/`--filter`.
