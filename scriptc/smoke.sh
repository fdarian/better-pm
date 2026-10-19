#!/usr/bin/env bash
# Runs read-only commands through the scriptc binary and `bun entries/cli.ts`
# in the fixture workspace and compares stdout and exit codes.
# usage: scriptc/smoke.sh   (needs bun and dist/pm-scriptc)
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scriptc_bin="$root/dist/pm-scriptc"
fixture="$root/scriptc/fixtures/workspace"

[ -x "$scriptc_bin" ] || { echo "missing $scriptc_bin; run: pnpm run build:scriptc" >&2; exit 1; }
"$root/scriptc/make-fixture.sh" "$fixture" >/dev/null
cd "$fixture"

failed=0
check() {
  local mode=$1
  shift
  local scriptc_out bun_out scriptc_code bun_code
  scriptc_out="$("$scriptc_bin" "$@" 2>/dev/null)"
  scriptc_code=$?
  bun_out="$(bun "$root/entries/cli.ts" "$@" 2>/dev/null)"
  bun_code=$?
  if [ "$mode" = error ]; then
    # Timestamps, fiber ids and stack frames differ; compare the first message line only.
    scriptc_out="$(printf '%s\n' "$scriptc_out" | head -n 1 | sed -E 's/^\[[^]]*\] ERROR \(#[0-9]+\)//')"
    bun_out="$(printf '%s\n' "$bun_out" | head -n 1 | sed -E 's/^\[[^]]*\] ERROR \(#[0-9]+\)//')"
  elif [ "$mode" = sorted ]; then
    # Completions are listed in directory-read order, which varies between runs.
    scriptc_out="$(printf '%s\n' "$scriptc_out" | sort)"
    bun_out="$(printf '%s\n' "$bun_out" | sort)"
  fi
  if [ "$scriptc_out" = "$bun_out" ] && [ "$scriptc_code" = "$bun_code" ]; then
    echo "same  (exit $scriptc_code)  pm $*"
  else
    echo "DIFF  (exit scriptc=$scriptc_code bun=$bun_code)  pm $*"
    failed=1
  fi
}

check exact --version
check exact --help
check exact i --help
check exact ls
check exact activate zsh
check exact activate bash
check exact activate fish
check exact --completions zsh
check exact --completions bash
check exact --completions fish
check sorted cd --completions
check sorted run --completions
check sorted run --completions -F @fixture/pkg-03
check exact cd @fixture/pkg-03
check exact cd -p @fixture/pkg-03
check error cd nosuch

exit "$failed"
