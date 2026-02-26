const PM_NAMES = ['npm', 'pnpm', 'bun'] as const;
const SUBCOMMANDS = ['install', 'add', 'i'] as const;

function isPmName(token: string): boolean {
	return (PM_NAMES as ReadonlyArray<string>).includes(token);
}

function isSubcommand(token: string): boolean {
	return (SUBCOMMANDS as ReadonlyArray<string>).includes(token);
}

function extractFromTokens(tokens: Array<string>): {
	packages: Array<string>;
	dev: boolean;
} {
	const rest = tokens.slice(2);
	const packages = rest.filter((t) => !t.startsWith('-'));
	const dev = rest.some((t) => t === '-D' || t === '--save-dev');
	return { packages, dev };
}

export function resolveAddArgs(
	rawPackages: Array<string>,
	devFlag: boolean,
): { packages: Array<string>; dev: boolean } {
	const tokens =
		rawPackages.length === 1 && rawPackages[0].includes(' ')
			? rawPackages[0].split(/\s+/)
			: rawPackages;

	const isPmCommand =
		tokens.length >= 2 && isPmName(tokens[0]) && isSubcommand(tokens[1]);

	if (!isPmCommand) {
		return { packages: rawPackages, dev: devFlag };
	}

	const extracted = extractFromTokens(tokens);

	if (extracted.packages.length === 0) {
		throw new Error(
			'No packages specified in pasted command. To install dependencies, use: pm i',
		);
	}

	return { packages: extracted.packages, dev: devFlag || extracted.dev };
}
