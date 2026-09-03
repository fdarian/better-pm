import * as cli from '@effect/cli';

/** Shared `-F/--filter` CLI option, reused by every command that shells out to a package manager. */
export const filterOption = cli.Options.text('filter').pipe(
	cli.Options.withAlias('F'),
	cli.Options.repeated,
);
