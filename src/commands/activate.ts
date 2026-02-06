import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';

const shellArg = cli.Args.text({ name: 'shell' });

const shellWrapper = `pm() {
  if [ "$1" = "cd" ]; then
    shift;
    case "$1" in
      -*) command pm cd "$@"; return;;
    esac;
    if [ $# -eq 0 ]; then
      command pm cd;
      return;
    fi;
    local dir;
    dir=$(command pm cd "$@");
    if [ $? -eq 0 ] && [ -d "$dir" ]; then
      builtin cd "$dir";
    fi;
  else
    command pm "$@";
  fi;
};`;

const zshCompletions = `eval "$(command pm --completions zsh)";
if (( $+functions[_pm_zsh_completions] )); then
  functions[_pm_zsh_completions_base]=$functions[_pm_zsh_completions];
  _pm_zsh_completions() {
    if [[ $words[2] == cd ]] && (( CURRENT == 3 )); then
      compadd -- \${(f)"$(command pm cd 2>/dev/null)"};
    else
      _pm_zsh_completions_base "$@";
    fi;
  };
fi;`;

const bashCompletions = `eval "$(command pm --completions bash)";
_pm_custom_completions() {
  if [[ "\${COMP_WORDS[1]}" == "cd" ]] && [[ $COMP_CWORD -eq 2 ]]; then
    COMPREPLY=($(compgen -W "$(command pm cd 2>/dev/null)" -- "\${COMP_WORDS[$COMP_CWORD]}"));
    return;
  fi;
  _pm_bash_completions;
};
complete -F _pm_custom_completions -o nosort -o bashdefault -o default pm;`;

const completionsForShell = (shell: string) => {
	switch (shell) {
		case 'zsh':
			return zshCompletions;
		case 'bash':
			return bashCompletions;
		default:
			return `eval "$(command pm --completions ${shell})"`;
	}
};

export const activateCmd = cli.Command.make(
	'activate',
	{ shell: shellArg },
	(args) =>
		Effect.gen(function* () {
			yield* Console.log(
				`${shellWrapper}\n\n${completionsForShell(args.shell)}`,
			);
		}),
);
