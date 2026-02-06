import { Command } from '@effect/cli';
import { addCmd } from './add.ts';
import { installCmd, installFullCmd } from './install.ts';
import { removeCmd } from './remove.ts';

export const pmCmd = Command.make('pm').pipe(
	Command.withSubcommands([installCmd, installFullCmd, addCmd, removeCmd]),
);
