import { Command } from '@effect/cli';
import { activateCmd } from './activate.ts';
import { addCmd } from './add.ts';
import { cdCmd } from './cd.ts';
import { installCmd, installFullCmd } from './install.ts';
import { lsCmd } from './ls.ts';
import { plsCmd } from './pls.ts';
import { linkCmd } from './link.ts';
import { removeCmd } from './remove.ts';
import { runCmd } from './run.ts';
import { upCmd, updateCmd } from './up.ts';
import { whyCmd } from './why.ts';
import { xCmd } from './x.ts';
import { unlinkCmd } from './unlink.ts';

export const pmCmd = Command.make('pm').pipe(
	Command.withSubcommands([
		installCmd,
		installFullCmd,
		addCmd,
		removeCmd,
		lsCmd,
		runCmd,
		whyCmd,
		linkCmd,
		unlinkCmd,
		cdCmd,
		plsCmd,
		activateCmd,
		upCmd,
		updateCmd,
		xCmd,
	]),
);
