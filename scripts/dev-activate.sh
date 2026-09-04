#!/bin/sh
# Point `pm` at this worktree's local source, for the current shell only.
#
# Must be *sourced*, not executed — it exports PATH and defines shell
# functions in your interactive shell, which a child process can't do
# (hence .sh instead of the repo's usual bun/.ts scripts):
#   . scripts/dev-activate.sh

_dev_activate_sourced=0
if [ -n "$ZSH_VERSION" ]; then
	case ":$ZSH_EVAL_CONTEXT:" in
		*:file:*) _dev_activate_sourced=1 ;;
	esac
	script_path="${(%):-%N}"
elif [ -n "$BASH_VERSION" ]; then
	[ "${BASH_SOURCE[0]}" != "$0" ] && _dev_activate_sourced=1
	script_path="${BASH_SOURCE[0]}"
fi

if [ "$_dev_activate_sourced" -ne 1 ]; then
	echo "dev-activate.sh must be sourced, not executed: '. scripts/dev-activate.sh'" >&2
	exit 1
fi

shell_name=""
[ -n "$ZSH_VERSION" ] && shell_name=zsh
[ -n "$BASH_VERSION" ] && shell_name=bash
if [ -z "$shell_name" ]; then
	echo "dev-activate.sh: unsupported shell, source from bash or zsh" >&2
	return 1
fi

repo_root=$(cd "$(dirname "$script_path")/.." && pwd)
shim_dir="${TMPDIR:-/tmp}/pm-dev-bin"
mkdir -p "$shim_dir"
cat > "$shim_dir/pm" <<EOF
#!/bin/sh
exec bun "$repo_root/entries/cli.ts" "\$@"
EOF
chmod +x "$shim_dir/pm"

case ":$PATH:" in
	*":$shim_dir:"*) ;;
	*) export PATH="$shim_dir:$PATH" ;;
esac

eval "$(bun "$repo_root/entries/cli.ts" activate "$shell_name")"

echo "pm now resolves to local source at $repo_root (this shell only)" >&2

unset _dev_activate_sourced shell_name repo_root shim_dir script_path
