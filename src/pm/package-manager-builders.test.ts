import { describe, expect, it } from 'vitest';
import { pnpmPackageManager } from './pnpm.ts';

const serializeCommand = (command: unknown) =>
	JSON.parse(JSON.stringify(command)) as {
		command?: string;
		args?: Array<string>;
	};

describe('package manager builders', () => {
	it('uses override prefix for add command', () => {
		const command = pnpmPackageManager.buildAddCommand(['lodash'], false, {
			bin: 'nub',
			subcommand: ['add'],
		});
		const serialized = serializeCommand(command);
		expect(serialized.command).toBe('nub');
		expect(serialized.args).toEqual(['add', 'lodash']);
	});
});
