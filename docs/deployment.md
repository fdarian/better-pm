# Deployment

## Pipeline

1. Create a changeset: `pnpm exec changeset`
2. Push to main — the release workflow triggers on `.changeset/**` changes
3. Changesets action creates a "Version Packages" PR with bumped versions
4. Merging the PR triggers publish:
   - Builds binaries for 4 platforms (darwin-arm64, darwin-x64, linux-x64, linux-arm64)
   - Publishes platform-specific npm packages (`better-pm-{platform}`)
   - Publishes the main `better-pm` package via `changeset publish`
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
- `scripts/publish-npm.ts` — Publishes platform packages then runs changeset publish
- `scripts/sync-versions.ts` — Syncs optionalDependencies versions with package version
