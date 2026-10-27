# docs

Documentation site for `better-pm`, built with [Blume](https://useblume.dev) (Astro).

## Dev
- `pnpm dev` — local dev server
- `pnpm build` — static build into `dist/`

Stop the dev server before a regular build: Blume prevents concurrent use of its runtime. `pnpm build --isolated` verifies into `.blume-verify/dist/` without stopping dev.

## Layout
- blume.config.ts — site config + sidebar, wrapped in `withPreset` from `@fdarian/blume-preset`
- theme.css, components.ts — wiring only; the look and the chapter rail live in the preset (`~/code/fdarian/blume-preset`)
- src/pages/**/*.mdx — pages with `title` frontmatter; paths define URLs (`index.mdx` is the Introduction)
- .blume/ — generated runtime, gitignored
