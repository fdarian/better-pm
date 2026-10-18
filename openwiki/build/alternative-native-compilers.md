---
type: decision-record
title: Alternative native compilers (scriptc, Perry)
description: Dated findings on compiling the pm CLI ahead of time with scriptc and Perry instead of bun build --compile. Covers what blocks each compiler, the changes each would need, measured numbers, and when to retry.
tags: [build, distribution, scriptc, perry, native-compilation]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-18T23:51:23.812Z
sources:
  - id: openwiki-source-3e3c19eabeaa1bc882ac5090
    resource: repo://entries/cli.ts
  - id: openwiki-source-150dad8f21318442bc4c319f
    resource: repo://scripts/build-npm.ts
  - id: openwiki-source-fabe3bbd9710d9a093ba58bd
    resource: repo://src/commands/run-shell-command.ts
generated: { by: "claude-code", at: "2026-10-18T23:44:46.357Z" }
---

# Alternative native compilers (scriptc, Perry)

## Current state

The CLI ships as a `bun build --compile` binary (`scripts/build-npm.ts`, one per platform; release flow in `docs/deployment.md`). Two ahead-of-time compilers were evaluated as replacements. Neither is usable today.

Bun-only APIs are not the obstacle. `src/` and `entries/` make no `Bun.*` calls, and only `entries/cli.ts` imports `@effect/platform-bun`. The blockers below come from the compilers' handling of the `effect` package, not from this repo's code.

Baseline for comparison (2026-10-16): the `bun build --compile` binary is 71.4 MB. `--help` runs in about 0.23 s through `bun entries/cli.ts`, and about 0.9 s on the first cold run of the compiled binary.

## scriptc: blocked (last tested 0.3.6, 2026-10-19)

Tested 0.3.4 (2026-10-16), 0.3.5 (2026-10-17) and 0.3.6 (2026-10-19) with `effect` 4.0.0-rc.112. All three give the same result. No binary was ever built, so there are no size or startup numbers.

- **Main blocker: most imports from `effect` fail with SC3004** ("null is not representable in the target union"), reported at the import line 1:1 with no inner location. One-line repro:

  ```ts
  import { Data } from 'effect'; console.log(typeof Data)
  ```

  This also fails for Effect, Exit, Context, Schema, Cause, Layer, Scope and Stream, and for every `@effect/platform-node` deep import. It persists on `effect` 4.0.5 and is not fixed by `--npm-static`, `--optimization dev` or a tsconfig. In a per-module count (2026-10-19), 85 of 137 `effect/<Module>` deep imports fail and 52 compile. Option, Result, Predicate, Equal, Hash, Array, HashMap and Match are among the modules that compile. No code change in this repo can fix it.

  Root cause (2026-10-19): SC3004 fires on a JS class that extends a plain function constructor. In `effect` that is `Pipeable.Class`, an IIFE returning `function PipeableBase() {}` with a reassigned prototype, which `Data.js` subclasses with `class extends Pipeable.Class`. Replacing it with a real class makes `Data.js` compile. Effect-free repro, in a `.js` file with `"type":"module"`, fails with SC3004 at 1:1:

  ```js
  function Base() {}
  class Foo extends Base {}
  console.log(typeof Foo);
  ```

  The same pattern in `.ts` (`extends (Base as any)`) gives SC1090 ("extending computed expressions are not supported yet") instead. Upstream: no matching issue in vercel-labs/scriptc as of 2026-10-19; a report is drafted but not filed yet.
- **SC1014** when importing the `@effect/platform-node` barrel (re-exports from packages are unsupported). The barrel also pulls in `@redis/client` and `undici`. Related upstream: https://github.com/vercel-labs/scriptc/issues/735 and https://github.com/vercel-labs/scriptc/issues/19 (closed, named re-exports from packages), and open https://github.com/vercel-labs/scriptc/issues/1324 and https://github.com/vercel-labs/scriptc/issues/1289 (package entry resolution).
- **SC1010 `dns/promises`** (and `node:dns/promises`) is unsupported. Upstream: https://github.com/vercel-labs/scriptc/issues/434 (closed, `node:dns/promises` not shimmed) and the open https://github.com/vercel-labs/scriptc/pull/1318, which adds `dns/promises` among other things.
- **spawn `shell` option must be a literal boolean (SC2020).** `src/commands/run-shell-command.ts` passes `cmd.options.shell`, typed `string | boolean | undefined`, so it would need to branch into separate `spawn` calls (or an `exec` path for string shells). Upstream: https://github.com/vercel-labs/scriptc/issues/370 (closed, `spawn({ shell })` had no lowering). The SC2020 check looks like a deliberate restriction, so the fix belongs in this repo. Everything else in that file's child_process pattern (spawn with `detached`, SIGINT forwarding, `process.kill(-pid)`) compiled and ran correctly in isolation as a 288 KB binary.
- Blockers are ordered: SC3004 first, then the platform-node re-exports, then the shell option. Later ones were only seen in isolation.

**Retry when** a scriptc release note mentions `effect`, SC3004 or classes extending function constructors, or when PR #1318 merges (the `dns/promises` gap). The 0.3.4 to 0.3.6 changelogs covered only `node:*` stdlib breadth and performance. As of 2026-10-19 no upstream issue matches SC3004; the report is drafted, not filed.

## Perry: builds a binary, but only `--help` and `--version` work (0.5.1520, 2026-10-16)

`effect` core, `effect/unstable/cli` and platform-bun compile and link. The binary's `--help` and `--version` output matches the bun build. Every real subcommand fails.

### Cause

When a class extends a call expression (`class X extends Base('x') {}`) in one module and another module does `new X(args)`, Perry drops the constructor arguments. In `effect`, `CliError.MissingOption` is such a class, and the CLI constructs it for every absent optional flag (such as `--filter`). The missing `option` field then surfaces as `Error: Schema validation failed` for `ls`, `cd`, `why`, `run`, `add`, `activate` and others. Upstream: PerryTS/perry#10258, closed 2026-09-14 and fixed on main after the 0.5.1520 release of 2026-09-11. The fix was not verified on main.

Effect-free repro (Perry 0.5.1520 prints `undefined` on lines 2 and 3, bun prints `a`):

```ts
// base.ts
export function Base(_tag: string) {
  return class { constructor(args: any) { Object.assign(this, args); } } as unknown as new (args: { option: string }) => { option: string };
}
```

```ts
// mod.ts
import { Base } from './base.ts';
export class Imported extends Base('x') {}
export class ImportedExplicit extends Base('x') { constructor(a: { option: string }) { super(a); } }
```

```ts
// run.ts
import { Imported, ImportedExplicit } from './mod.ts';
import * as M from './mod.ts';
import { Base } from './base.ts';
class Local extends Base('x') {}
console.log(new Local({ option: 'a' }).option);              // a
console.log(new Imported({ option: 'a' }).option);           // BUG: undefined
console.log(new M.Imported({ option: 'a' }).option);         // BUG: undefined
console.log(new M.ImportedExplicit({ option: 'a' }).option); // a
```

The same class defined in the entry module works, and an explicit constructor works. Only an imported class with no own constructor and a runtime-value parent is affected.

### Other failures

- `cd` and `ls` also segfault in about 40% of runs (SIGSEGV, exit 139, intermittent, binary stripped so no symbols). Not root-caused.
- A separate open upstream issue, #12307 ("Effect v4 CLI help and version fail at runtime: getParser is not a function"), was not hit on 0.5.1520.
- Because every subcommand failed in flag parsing, `pm run`, `pm why`, Ctrl-C and exit codes could not be exercised through the CLI. `src/commands/run-shell-command.ts` was tested separately under Perry and works unchanged: exit codes propagate, a spawn failure gives the same message as the bun build, and SIGINT is forwarded to the child group exactly as under bun. No `src/` change is expected.

### Changes the build needs

- **Deep imports instead of the `@effect/platform-bun` barrel** in `entries/cli.ts`: `BunRuntime`, `BunChildProcessSpawner`, `BunCrypto`, `BunFileSystem`, `BunPath`, `BunStdio`, `BunTerminal`. The barrel pulls in cluster, socket and redis code, and the npm package has no prebuilt `perry_ext_net`, so linking fails with undefined `_js_ext_net_*` symbols. The vitest note in `CLAUDE.md` gives the same deep-import rule for a different reason.
- **A `Layer.provideMerge` chain instead of `BunServices.layer`.** Perry miscompiles the spread call inside `Layer.mergeAll` and `Layer.merge`, so `BunServices.layer` fails at runtime with `Cannot read properties of undefined (reading 'get')`. `provideMerge`, `Layer.effect` and `Layer.succeed` are fine. Not root-caused, and possibly the same bug class as #10258.
- **A `perry.compilePackages` entry in `package.json`**, mirrored in `perry.allow.compilePackages`, listing `effect`, `@effect/platform-bun`, `@effect/platform-node-shared` and `picocolors`. The `["*"]` form also works but compiles 397 modules.
- `perry compile --platform bun` does not exist in 0.5.1520. It is documented on main only, so the default (node) platform was used.

### Numbers (2026-10-16, darwin-arm64, busy 10-core machine)

| | Perry 0.5.1520 | bun build --compile |
|---|---|---|
| Binary size | 60.9 MB (52.0 MB effect only, 14.2 MB empty program) | 71.4 MB |
| `--help` wall time | about 0.15 s over 10 runs | about 0.23 s |
| Build time | about 7 min (3.2 min for hello-effect), 8-14 min with parallel compiles | not measured |

There is no incremental cache between builds. The size reflects the prebuilt full stdlib. A source-built, size-optimized stdlib needs a Perry source checkout, `PERRY_WORKSPACE_ROOT`, a pinned Rust nightly and LLVM 22 dev files, and was not tried.

**Retry when** a Perry release newer than 0.5.1520 is out (`npm view @perryts/perry version`), or in a container or CI with the toolchain to build main. Order of expectations: the #10258 fix first, then re-check the segfaults and the `Layer.mergeAll` failure (report upstream if they persist), then try `--platform bun`.
