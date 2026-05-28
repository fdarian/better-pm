---
"better-pm": patch
---

Make scoped install opt-in via `pm.config.json`.

Previously, running `pm i` from inside a workspace package automatically scoped the install to that package. This is now opt-in: by default `pm i` runs a full workspace install (matching the underlying package manager's behavior). To restore the old behavior, add `pm.config.json` next to your lockfile with `{ "scopedInstall": true }`.
