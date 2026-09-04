import { describe, expect, it } from 'vitest';
import { completionsForShell } from './activate.ts';

const countOccurrences = (haystack: string, needle: string) =>
	haystack.split(needle).length - 1;

describe('completionsForShell', () => {
	it('zsh output defines a shared workspace-packages helper', () => {
		const output = completionsForShell('zsh');
		expect(output).toContain('__pm_workspace_packages() {');
		expect(output).toContain('command pm cd --completions 2>/dev/null;');
	});

	it('zsh output completes package names after -F/--filter or for cd via one combined condition', () => {
		const output = completionsForShell('zsh');
		expect(output).toContain(
			`if [[ $words[CURRENT-1] == "-F" || $words[CURRENT-1] == "--filter" ]] || { [[ $words[2] == cd ]] && (( CURRENT == 3 )); }; then`,
		);
		expect(
			countOccurrences(
				output,
				`compadd -- \${(f)"$(__pm_workspace_packages)"};`,
			),
		).toBe(1);
	});

	it('bash output defines a shared workspace-packages helper', () => {
		const output = completionsForShell('bash');
		expect(output).toContain('__pm_workspace_packages() {');
		expect(output).toContain('command pm cd --completions 2>/dev/null;');
	});

	it('bash output completes package names after -F/--filter or for cd via one combined condition', () => {
		const output = completionsForShell('bash');
		expect(output).toContain(`local prev="\${COMP_WORDS[COMP_CWORD-1]}";`);
		expect(output).toContain(
			`if [[ "$prev" == "-F" || "$prev" == "--filter" ]] || { [[ "\${COMP_WORDS[1]}" == "cd" ]] && [[ $COMP_CWORD -eq 2 ]]; }; then`,
		);
		expect(
			countOccurrences(
				output,
				`COMPREPLY=($(compgen -W "$(__pm_workspace_packages)" -- "\${COMP_WORDS[$COMP_CWORD]}"));`,
			),
		).toBe(1);
	});

	it('falls back to the base completions eval for other shells', () => {
		expect(completionsForShell('fish')).toBe(
			'eval "$(command pm --completions fish)"',
		);
	});
});
