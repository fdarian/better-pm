import { Console, Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';

const shellArg = Argument.string('shell');

const shellWrapper = `pm() {
  if [ "$1" = "cd" ]; then
    shift;
    for arg in "$@"; do
      case "$arg" in
        -*) command pm cd "$@"; return;;
      esac;
    done;
    local dir;
    dir=$(command pm cd "$@");
    if [ $? -eq 0 ] && [ -d "$dir" ]; then
      builtin cd "$dir";
    fi;
  else
    command pm "$@";
  fi;
};`;

// v4's `--completions` generator emits a self-contained script that defines
// the completion function as \`_<executableName>\` (i.e. \`_pm\`), registered
// via \`compdef\`/\`complete -F\` — unlike v3's \`_pm_zsh_completions\` /
// \`_pm_bash_completions\` naming. Wrap that v4 function name instead.
const zshCompletions = `eval "$(command pm --completions zsh)";
# Emits workspace package names, one per line.
__pm_workspace_packages() {
  command pm cd --completions 2>/dev/null;
};
if (( $+functions[_pm] )); then
  functions[_pm_base]=$functions[_pm];
  _pm() {
    if [[ $words[CURRENT-1] == "-F" || $words[CURRENT-1] == "--filter" ]] || { [[ $words[2] == cd ]] && (( CURRENT == 3 )); }; then
      compadd -- \${(f)"$(__pm_workspace_packages)"};
    else
      _pm_base "$@";
    fi;
  };
fi;`;

const bashCompletions = `eval "$(command pm --completions bash)";
# Emits workspace package names, one per line.
__pm_workspace_packages() {
  command pm cd --completions 2>/dev/null;
};
_pm_custom_completions() {
  local prev="\${COMP_WORDS[COMP_CWORD-1]}";
  if [[ "$prev" == "-F" || "$prev" == "--filter" ]] || { [[ "\${COMP_WORDS[1]}" == "cd" ]] && [[ $COMP_CWORD -eq 2 ]]; }; then
    COMPREPLY=($(compgen -W "$(__pm_workspace_packages)" -- "\${COMP_WORDS[$COMP_CWORD]}"));
    return;
  fi;
  _pm;
};
complete -F _pm_custom_completions -o nosort -o bashdefault -o default pm;`;

export const completionsForShell = (shell: string) => {
	switch (shell) {
		case 'zsh':
			return zshCompletions;
		case 'bash':
			return bashCompletions;
		default:
			return `eval "$(command pm --completions ${shell})"`;
	}
};

export const activateCmd = Command.make(
	'activate',
	{ shell: shellArg },
	(args) =>
		Effect.gen(function* () {
			yield* Console.log(
				`${shellWrapper}\n\n${completionsForShell(args.shell)}`,
			);
		}),
);
