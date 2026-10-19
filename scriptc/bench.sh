#!/usr/bin/env bash
# Compares the scriptc binary with bun's release build of better-pm.
# usage: scriptc/bench.sh
# needs: hyperfine >= 2.0 (peak RSS and CPU time in its JSON), jq, bun,
# and dist/pm-scriptc (pnpm run build:scriptc).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scriptc_bin="$root/dist/pm-scriptc"
bun_bin="$root/dist/pm-bun"
fixture="$root/scriptc/fixtures/workspace"

[ -x "$scriptc_bin" ] || { echo "missing $scriptc_bin; run: pnpm run build:scriptc" >&2; exit 1; }

# Same flags as scripts/build-npm.ts, for the host platform only.
(cd "$root" && bun build --compile --sourcemap --minify --bytecode --format=esm \
  entries/cli.ts --outfile "$bun_bin") >&2

"$root/scriptc/make-fixture.sh" "$fixture" >&2

file_size_bytes() {
  if [ "$(uname)" = Darwin ]; then stat -f %z "$1"; else stat -c %s "$1"; fi
}

echo "## Environment"
echo
echo "- machine: $(uname -m), $(if [ "$(uname)" = Darwin ]; then sysctl -n machdep.cpu.brand_string; else grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs; fi)"
echo "- os: $(if [ "$(uname)" = Darwin ]; then echo "macOS $(sw_vers -productVersion)"; else . /etc/os-release && echo "$PRETTY_NAME"; fi) ($(uname -sr))"
echo "- bun: $(bun --version), hyperfine: $(hyperfine --version | cut -d' ' -f2)"
echo "- load average at start: $(uptime | sed 's/.*load averages*: //')"
echo "- binary size: scriptc $(file_size_bytes "$scriptc_bin" | awk '{ printf "%.1f", $1 / 1048576 }') MiB, bun $(file_size_bytes "$bun_bin" | awk '{ printf "%.1f", $1 / 1048576 }') MiB"
echo

cd "$fixture"
results="$(mktemp)"
trap 'rm -f "$results"' EXIT

echo "## Startup (hyperfine -N, warmup 5, 50 runs, in $(basename "$fixture"))"
echo
echo "Wall time and CPU time in ms, peak RSS in MiB. Ratio is scriptc / bun on the wall-time median."
echo
echo "| command | binary | wall mean ± σ | wall median | CPU time | peak RSS | ratio |"
echo "|---|---|---|---|---|---|---|"
for args in "--help" "--version" "cd --completions" "run --completions"; do
  hyperfine -N --warmup 5 --runs 50 \
    "$scriptc_bin $args" "$bun_bin $args" \
    --export-json "$results" >/dev/null 2>&1
  jq -r --arg args "$args" '
    def ms: . * 1000 * 10 | round / 10;
    def mib: . / 1048576 * 10 | round / 10;
    def row($name; $s; $ratio):
      "| `pm \($args)` | \($name) | \($s.time_wall_clock.mean | ms) ± \($s.time_wall_clock.stddev | ms) | \($s.time_wall_clock.median | ms) | \($s.time_cpu.mean | ms) | \($s.memory_peak_resident.max | mib) | \($ratio) |";
    (.results[0].summary) as $sc
    | (.results[1].summary) as $bun
    | row("scriptc"; $sc; "\(($sc.time_wall_clock.median / $bun.time_wall_clock.median) * 100 | round / 100)x"),
      row("bun"; $bun; "")
  ' "$results"
done
