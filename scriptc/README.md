# better-pm compiled with scriptc

[better-pm](../README.md) is an Effect v4 CLI (`effect`, `effect/unstable/cli`, `@effect/platform-node`). This branch compiles it to a native binary with [scriptc](https://github.com/vercel-labs/scriptc), unmodified npm packages included. It needs a scriptc built with seven small patches, and a handful of rewrites in better-pm's own code (listed below).

Tested on macOS 27 / Apple M1 Pro only, with the scriptc patches below applied on top of upstream `main`.

scriptc patches (one branch each, see the PR for the corpus tests and rationale):

- `fix/get-own-property-descriptors-class-instance`: <PR: fix/get-own-property-descriptors-class-instance>
- `fix/process-stdio-stream-state`: <PR: fix/process-stdio-stream-state>
- `fix/process-alias-null-check`: <PR: fix/process-alias-null-check>
- `fix/math-minmax-unknown-spread`: <PR: fix/math-minmax-unknown-spread>
- `fix/child-process-undefined-options`: <PR: fix/child-process-undefined-options>
- `fix/fs-readdir-undefined-options`: <PR: fix/fs-readdir-undefined-options>
- `fix/set-map-maybe-undefined-receiver`: <PR: fix/set-map-maybe-undefined-receiver>

All seven are combined on the `better-pm-effect-v4` branch of [fdarian/scriptc](https://github.com/fdarian/scriptc), which is what the steps below build.

## Reproduce

### 1. Build scriptc from source

Requirements: Node 24+, pnpm, CMake, Ninja, Xcode command line tools, [mise](https://mise.jdx.dev). The native helper requires LLVM 22.1.8 exactly (`find_package(LLVM 22.1.8 EXACT)`, so Homebrew's current `llvm` is rejected) and Zig 0.16.0. `mise.toml` pins both; this is the one used here (macOS arm64):

```toml
[tools]
zig = "0.16.0"
# bin_path points at a directory with no executables on purpose: LLVM's bin/clang has no macOS
# sysroot and would shadow Apple clang for scriptc's own C compile and link steps.
"github:llvm/llvm-project" = { version = "llvmorg-22.1.8", asset_pattern = "LLVM-22.1.8-macOS-ARM64.tar.xz", bin_path = "share" }

[env]
LLVM_DIR = { value = "{{ tools['github:llvm/llvm-project'].path }}/lib/cmake/llvm", tools = true }
# The official LLVM archives are LTO bitcode; Apple's ld can't read them without LLVM's own libLTO.
LDFLAGS = { value = "-Wl,-lto_library,{{ tools['github:llvm/llvm-project'].path }}/lib/libLTO.dylib", tools = true }
```

Without the `LDFLAGS` line the native helper fails to link because Apple's `ld` cannot read the LTO bitcode in the prebuilt LLVM archives. Put the file in the scriptc checkout (or any parent directory) and run every command below under `mise exec --`. Other hosts need another `asset_pattern` and the matching `@scriptc/llvm-<platform>` and `@scriptc/runtime-<platform>` package names; they are untested here.

```sh
git clone --branch better-pm-effect-v4 https://github.com/fdarian/scriptc
cd scriptc
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm -r build
mise exec -- pnpm --filter @scriptc/llvm-darwin-arm64 run build:native
mise exec -- pnpm --filter @scriptc/runtime-darwin-arm64 run build:native
mise exec -- pnpm build:native-compiler   # about 7 minutes
export SCRIPTC="$PWD/.scriptc/native-cli/bin/scriptc"
```

### 2. Build better-pm

Needs pnpm 12 (the repo pins `pnpm@12.3.3`). The build uses the repo's own `node_modules`; no separate project is needed, and pnpm's global virtual store (`enableGlobalVirtualStore: true`) and its symlinks are fine for scriptc.

```sh
git clone --branch spike/scriptc-compat https://github.com/fdarian/better-pm
cd better-pm
pnpm install --frozen-lockfile
pnpm run build:scriptc        # runs: ${SCRIPTC:-scriptc} build entries/cli-node.ts -o dist/pm-scriptc
```

`build:scriptc` uses `$SCRIPTC`, or a `scriptc` found on `PATH` if the variable is unset, and fails with `command not found` if neither exists. It takes 1 to 2 minutes and produces a self-contained 27 MB executable (`dist/pm-scriptc`; it also leaves a 150 MB `dist/cli-node.ll`, safe to delete). `entries/cli-node.ts` is `entries/cli.ts` on `NodeServices`/`NodeRuntime`; `entries/cli-node.test.ts` keeps the two in sync.

### 3. Run it

```sh
scriptc/make-fixture.sh                       # synthetic pnpm workspace: root + 20 packages
cd scriptc/fixtures/workspace
../../../dist/pm-scriptc --help
../../../dist/pm-scriptc ls
../../../dist/pm-scriptc cd --completions
```

## Smoke tests against the bun build

`scriptc/smoke.sh` runs these in the fixture and compares stdout and exit code with `bun entries/cli.ts`:

| command | result |
|---|---|
| `--version`, `--help`, `i --help` | identical |
| `activate zsh/bash/fish`, `--completions zsh/bash/fish` | identical |
| `cd --completions`, `run --completions`, `run --completions -F <pkg>` | identical (sorted; listing order varies per run in both) |
| `cd <pkg>`, `cd -p <pkg>` | identical |
| `cd nosuch` | same exit code and message; scriptc prints no stack frame (see gaps) |

The following were run once with a throwaway harness (a copy of a small pnpm workspace per binary, comparing output, exit code, `package.json`, lockfile and `node_modules` afterwards). That harness is not in the repo:

| command | result |
|---|---|
| `i -y` at root, `i` in a package, `i -F <pkg>`, `install --sure` | same output, exit code, lockfile and `node_modules` |
| `add`, `add -D`, `add -F <pkg>`, `-F <pkg> add` | same state |
| `remove`, `remove -D`, `remove -F <pkg>`, remove of a missing dependency | same state; `remove -D` of a missing dependency exits 1 in both |
| `run <script>`, `<script>`, `-F <pkg> run <script>`, extra args after the script | same |
| `run nosuch` | same (`ERR_PNPM_NO_SCRIPT`, same exit code) |
| Ctrl+C (`kill -INT`) during a long `run` | same: child gets SIGTERM, pm exits 130, no leftover processes |
| `ls`, `doctor`, `w`, `up`, `exec`, `why`, `x`, `link`, `unlink` | same |

## Benchmarks

`scriptc/bench.sh` builds bun's release binary with the flags from `scripts/build-npm.ts` (`bun build --compile --sourcemap --minify --bytecode --format=esm entries/cli.ts`, host platform only), regenerates the fixture, and runs `hyperfine -N --warmup 5 --runs 50` for each command inside the fixture. It needs `hyperfine` 2.0 or newer (peak RSS and CPU time come from its JSON), `jq`, `bun` and `dist/pm-scriptc`.

```sh
scriptc/bench.sh
```

Machine: Apple M1 Pro, 16 GiB, macOS 27.0.1 (Darwin 27.0.0), bun 1.4.3, hyperfine 2.0.0. Fixture: root plus 20 packages. Binary size: scriptc 26.5 MiB, bun 71.8 MiB.

| command | binary | wall mean ± σ (ms) | wall median (ms) | instructions (M) | peak RSS (MiB) | scriptc / bun, median |
|---|---|---|---|---|---|---|
| `pm --help` | scriptc | 25.3 ± 5.0 | 23.8 | 194 | 23.1 | 1.4x |
| `pm --help` | bun | 17.7 ± 2.3 | 17.0 | 124 | 26.8 | |
| `pm --version` | scriptc | 24.4 ± 1.9 | 23.9 | 193 | 22.8 | 1.2x |
| `pm --version` | bun | 24.0 ± 12.5 | 19.9 | 122 | 27.0 | |
| `pm cd --completions` | scriptc | 39.1 ± 6.6 | 37.4 | 301 | 25.3 | 1.8x |
| `pm cd --completions` | bun | 21.9 ± 2.5 | 21.2 | 166 | 31.6 | |
| `pm run --completions` | scriptc | 30.0 ± 3.1 | 28.8 | 217 | 24.6 | 1.4x |
| `pm run --completions` | bun | 20.8 ± 2.1 | 20.2 | 133 | 28.5 | |

Caveat on these numbers: the benchmark machine was shared with other heavy processes (load average 10.9 at the start of the run the wall times come from, and 20 to 60 in later runs), so wall times carry noise and the bun `--version` σ is inflated by it. Instruction counts and peak RSS are stable between runs (within about 2%, apart from bun's `--help`/`--version` instruction counts, which ranged from 120M to 150M under load). `bench.sh` also prints CPU time and the minimum wall time; rerun it on an idle machine before quoting wall times.

For a private 21-package workspace (earlier run, same method, scriptc / bun release, wall time): `--version` 23.6 / 16.9 ms, `--help` 23.5 / 18.9 ms, `cd --completions` 38.1 / 21.9 ms, `run --completions` 27.1 / 18.2 ms. `--optimization speed` did not change these.

scriptc starts faster than bun's runtime floor (an empty program takes 2.2 ms against bun's 10.6 ms) but spends more on module initialisation and on the command itself, so a binary that does real Effect work currently loses to bun by 1.2x to 1.8x on wall time. The binary is 2.7x smaller and uses less memory.

## Where scriptc's time goes

Workload: `cd --completions` in the 21-package private workspace, 38.1 ms per run.

| bucket | ms | share |
|---|---|---|
| process start and teardown (dyld, runtime init, `atexit`) | 6.6 | 17% |
| module initialisation (top-level evaluation of effect, Schema, platform-node, cli) | 15.5 | 41% |
| fs and syscalls (kernel time about 1 ms) | 3.5 | 9% |
| Schema decode of 21 `package.json` files | 2.4 | 6% |
| Effect runtime and the rest (readdirs, yaml, fibers, console output, CLI parsing) | 10.1 | 27% |

Bun's equivalent split is 10.6 ms floor, 6.3 ms module initialisation and 5.0 ms for the command.

Sampled CPU shows 67% of time in the dynamic tier (values typed only at runtime), against 8% in statically compiled code, 3% in kernel fs/io and 4% in dyld. Inside the dynamic tier:

- Class dispatch chains take 29%. `sc_bf_dyn_class_staticProperties`, `sc_f_dyn_class_properties` and `readPropertiesOrEmpty` are linear chains that test about 267 classes each, and `scr_dyn_typed_ref_is_key` alone is 8% of self time. A class id or per-instance lookup would replace them.
- Dynamic object, property and call operations take 19%, refcounting, allocation and dispose 14%, the cycle collector 5%.
- effect's `dual()` (`Function.js`, built on `arguments` and `apply`) accounts for about 19% of `--version` in a dev build. Lowering it statically would help every effect program.
- `scriptc coverage entries/cli-node.ts` reports 99% of statements compiled statically, but 9830 of 19563 statements are in the dynamic tier. None of the 90 deferred sites run on this path.
- `atexit` registration through `dladdr` costs about 0.8 ms at exit (2.2% of samples).

Method: `--version`, `--help`, `cd --completions` and `run --completions` timed with `hyperfine -N`; per-phase wall time from scratch binaries with `performance.now()` around each phase and with parts stubbed out; sampled CPU from `xctrace` Time Profiler over a 200-run loop of a release build, grouped by symbol; syscall counts from the xctrace System Trace (scriptc 526 syscalls, bun 904 across 9 threads); module-init cost by layer from binaries that import progressively more (hello 2.2 ms, plus effect core 5.1, plus Schema 10.6, plus platform-node 16.3, plus `unstable/cli` 20.2, full `--version` 23.3). Instruction counts: 429M against bun's 249M.

## TypeScript changes in better-pm

These constructs are valid TypeScript that scriptc could not compile (or resolved to `any`); the behavior is unchanged.

- [`af06013`](https://github.com/fdarian/better-pm/commit/af06013): `Omit<(typeof PackageManagerService)['Service'], 'lockDir'>` resolved to `any` and broke array element typing, so named `PackageManagerImplementation` and `PackageManagerShape` types replace it. `.flat()` becomes typed loops; `Object.entries` over a spread of two records becomes a `Map` built from `Object.keys`.
- [`417008c`](https://github.com/fdarian/better-pm/commit/417008c): `string.match(re)` indexing becomes `RegExp.exec` with `!== null`; `split().filter()` becomes a loop; `${filenames} not found` (implicit array stringification) becomes a precomputed `candidates.join(',')` message.
- [`2e01367`](https://github.com/fdarian/better-pm/commit/2e01367): `{ ...process.env, ...cmd.options.env }` (spread of `unknown`) becomes a typed `mergeEnv` helper; `new Set(x.flatMap(...))` becomes nested loops adding to a `Set<string>`.
- [`68efd61`](https://github.com/fdarian/better-pm/commit/68efd61): `Schema.Type<typeof PmConfig>` resolved to `any`, so `PmConfig` is an explicit type and the schema is annotated `Schema.Codec<PmConfig>`; `spawn`'s `shell` option must be a boolean literal, so `spawnInheritingStdio` branches on `true` and `false`.
- [`033a3d6`](https://github.com/fdarian/better-pm/commit/033a3d6): `Object.fromEntries(...) as PmConfig` merge becomes explicit per-field merging; with `shell: true` the full command string is passed with empty args, as Node does internally.

A custom shell path (`shell` as a string) now throws; no call site sets it.

## Known gaps

- Interactive paths are untested: `--wizard` and the prompts built on `effect/unstable/cli` `Prompt`.
- `pm x` (needs the network) and `pm run` with a `shell` override were not exercised.
- Errors print without a stack frame (bun adds an `at ...` line and repeats the message), and the fiber id in the log prefix is `(#1)` where bun prints `(#2)`.
- Only macOS arm64 was built and run. Linux and Intel macOS are untested.
- Output ordering of completion lists follows directory read order, which differs between runs under both runtimes.
- Unrelated scriptc observations from this work: a build whose output is named `Runtime` fails to link on case-insensitive APFS because scriptc's temp directory `runtime/` collides with it; scratch programs using `Effect.all` over mixed-type arrays failed with `expected number at $, got object` (not investigated).
