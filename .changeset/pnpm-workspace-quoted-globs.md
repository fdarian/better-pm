---
"better-pm": patch
---

Fix `pm cd <package>` returning no packages when `pnpm-workspace.yaml` quotes its glob entries (e.g. `- "packages/*"`)
