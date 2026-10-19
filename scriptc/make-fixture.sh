#!/usr/bin/env bash
# Generates a synthetic pnpm workspace (root + 20 packages) to benchmark and smoke-test against.
# usage: scriptc/make-fixture.sh [target-dir]   (default: scriptc/fixtures/workspace)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:-$here/fixtures/workspace}"
count=20

rm -rf "$target"
mkdir -p "$target/packages"

cat > "$target/package.json" <<JSON
{
  "name": "fixture-root",
  "private": true,
  "version": "1.0.0",
  "packageManager": "pnpm@12.3.3"
}
JSON

printf 'packages:\n  - packages/*\n' > "$target/pnpm-workspace.yaml"
printf "lockfileVersion: '9.0'\n" > "$target/pnpm-lock.yaml"

for i in $(seq 1 "$count"); do
  name="$(printf 'pkg-%02d' "$i")"
  dir="$target/packages/$name"
  mkdir -p "$dir"
  deps=""
  if [ "$i" -gt 1 ]; then
    prev="$(printf 'pkg-%02d' $((i - 1)))"
    deps=$',\n  "dependencies": {\n    "@fixture/'"$prev"$'": "workspace:*"\n  }'
  fi
  cat > "$dir/package.json" <<JSON
{
  "name": "@fixture/$name",
  "version": "1.0.0",
  "scripts": {
    "build": "echo build $name",
    "test": "echo test $name"
  }$deps
}
JSON
done

echo "fixture: $target ($count packages)"
