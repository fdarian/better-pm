const FILTER_FLAGS = new Set(['-F', '--filter']);

function isFilterFlag(token: string | undefined): boolean {
	if (token === undefined) return false;
	return (
		FILTER_FLAGS.has(token) ||
		token.startsWith('-F=') ||
		token.startsWith('--filter=')
	);
}

function hasInlineFilterValue(token: string): boolean {
	return token.startsWith('-F=') || token.startsWith('--filter=');
}

/** Index of the first token after any leading `-F`/`--filter` flags (and their values). */
function skipLeadingFilterFlags(
	argv: readonly string[],
	start: number,
): number {
	let index = start;
	while (isFilterFlag(argv[index])) {
		index += hasInlineFilterValue(argv[index]) ? 1 : 2;
	}
	return index;
}

export function resolveArgv(
	argv: readonly string[],
	knownCommands: ReadonlySet<string>,
): readonly string[] {
	// Look past any leading -F/--filter flags to find the token that would be
	// the subcommand name — but `run` must land right at argv[2], since
	// Command.run only recognizes a subcommand in that exact position. Any
	// filter flags that preceded the script token end up after `run`, where
	// its own `filter` option picks them up.
	const scriptIndex = skipLeadingFilterFlags(argv, 2);
	const scriptToken = argv[scriptIndex];
	if (
		scriptToken &&
		!scriptToken.startsWith('-') &&
		!knownCommands.has(scriptToken)
	) {
		return [...argv.slice(0, 2), 'run', ...argv.slice(2)];
	}
	return argv;
}
