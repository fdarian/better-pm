import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const platformSpecific = /Bun|Node|^\s*\/\//;

const withoutPlatformLines = (file: string) =>
	readFileSync(new URL(file, import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => !platformSpecific.test(line))
		.join('\n');

test('cli-node.ts differs from cli.ts only in its platform runtime and services lines and comments', () => {
	expect(withoutPlatformLines('./cli-node.ts')).toBe(
		withoutPlatformLines('./cli.ts'),
	);
});
