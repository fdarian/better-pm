# Deployment

## Pipeline

1. Create a changeset: `pnpm exec changeset`
2. Push to main — the release workflow triggers on `.changeset/**` changes
3. Changesets action creates a "Version Packages" PR with bumped versions
4. Merging the PR triggers publish:
   - Builds binaries for 4 platforms (darwin-arm64, darwin-x64, linux-x64, linux-arm64)
   - Publishes platform-specific npm packages (`better-pm-{platform}`)
   - Pins those platform packages as `optionalDependencies` on the main package (only once they're actually published — see Scripts below) and publishes it via `changeset publish`
   - Uploads tar'd binaries to a GitHub Release
   - Updates the Homebrew formula in `fdarian/homebrew-tap`

## Secrets

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | npm publish access |
| `HOMEBREW_TAP_TOKEN` | Push to `fdarian/homebrew-tap` repo |

## Manual Trigger

The workflow can also be triggered manually via `workflow_dispatch` in the Actions tab.

## Scripts

- `scripts/build-npm.ts` — Compiles binaries and generates platform npm packages
- `scripts/publish-npm.ts` — Publishes platform packages, then injects `optionalDependencies` (pinning them to the current version) into `package.json` just before `changeset publish`, restoring the original `package.json` afterward. Root `package.json` must never carry that block outside of this window — the platform packages aren't published yet earlier in the pipeline, and pnpm silently drops unresolvable optional deps instead of erroring, which produces a lockfile inconsistent with `package.json`
