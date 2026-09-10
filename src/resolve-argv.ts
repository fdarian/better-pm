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

function normalizeRunArgs(args: readonly string[]): readonly string[] {
	if (args.includes('--')) return args;

	const options: Array<string> = [];
	const passthrough: Array<string> = [];
	for (let index = 0; index < args.length; index += 1) {
		const token = args[index];
		if (isFilterFlag(token)) {
			options.push(token);
			if (!hasInlineFilterValue(token)) {
				const value = args[index + 1];
				if (value !== undefined) {
					options.push(value);
					index += 1;
				}
			}
			continue;
		}

		if (token === '--completions') {
			options.push(token);
			continue;
		}

		passthrough.push(token);
	}

	const script = passthrough[0];
	if (script === undefined) return options;
	if (passthrough.length === 1) return [...options, script];

	return [...options, script, '--', ...passthrough.slice(1)];
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
	// Look past any leading -F/--filter flags to find the token that names the
	// subcommand (or, for the bare-script shorthand, would-be subcommand) —
	// but effect/unstable/cli's Command.runWith only recognizes a subcommand
	// sitting right at argv[2]. Whichever token belongs there gets hoisted into
	// that spot, with the scanned filter flags (and their values) re-emitted
	// right after it, where that subcommand's own `filter` option picks them up.
	const scriptIndex = skipLeadingFilterFlags(argv, 2);
	const scriptToken = argv[scriptIndex];
	if (scriptToken === undefined || scriptToken.startsWith('-')) {
		return argv;
	}

	const leadingFilterArgs = argv.slice(2, scriptIndex);
	const remainingArgs = argv.slice(scriptIndex + 1);

	if (knownCommands.has(scriptToken)) {
		if (scriptToken === 'run') {
			return [
				...argv.slice(0, 2),
				'run',
				...normalizeRunArgs([...leadingFilterArgs, ...remainingArgs]),
			];
		}

		return [
			...argv.slice(0, 2),
			scriptToken,
			...leadingFilterArgs,
			...remainingArgs,
		];
	}

	return [
		...argv.slice(0, 2),
		'run',
		...normalizeRunArgs([...leadingFilterArgs, scriptToken, ...remainingArgs]),
	];
}
