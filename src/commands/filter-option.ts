import { Flag } from 'effect/unstable/cli';

/** Shared `-F/--filter` CLI option, reused by every command that shells out to a package manager. */
export const filterOption = Flag.string('filter').pipe(
	Flag.withAlias('F'),
	Flag.atLeast(0),
);
