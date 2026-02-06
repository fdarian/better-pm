import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';

const shellArg = cli.Args.text({ name: 'shell' });

export const activateCmd = cli.Command.make(
	'activate',
	{ shell: shellArg },
	(args) =>
		Effect.gen(function* () {
			yield* Console.log(`pm() {
  if [ "$1" = "cd" ]; then
    shift;
    if [ $# -eq 0 ]; then
      command pm cd;
      return;
    fi;
    local dir;
    dir=$(command pm cd "$@");
    if [ $? -eq 0 ] && [ -n "$dir" ]; then
      builtin cd "$dir";
    fi;
  else
    command pm "$@";
  fi;
};

eval "$(command pm --completions ${args.shell})"`);
		}),
);
