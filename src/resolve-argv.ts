export function resolveArgv(
	argv: readonly string[],
	knownCommands: ReadonlySet<string>,
): readonly string[] {
	const firstArg = argv[2];
	if (firstArg && !firstArg.startsWith('-') && !knownCommands.has(firstArg)) {
		return [...argv.slice(0, 2), 'run', ...argv.slice(2)];
	}
	return argv;
}
