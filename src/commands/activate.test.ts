import { describe, expect, it } from 'vitest';
import { completionsForShell } from './activate.ts';

describe('completionsForShell', () => {
	it('zsh output defines a shared workspace-packages helper', () => {
		const output = completionsForShell('zsh');
		expect(output).toContain('__pm_workspace_packages() {');
		expect(output).toContain('command pm cd --completions 2>/dev/null;');
	});

	it('zsh output completes package names after -F/--filter', () => {
		const output = completionsForShell('zsh');
		expect(output).toContain(
			'if [[ $words[CURRENT-1] == "-F" || $words[CURRENT-1] == "--filter" ]]; then',
		);
		expect(output).toContain(`compadd -- \${(f)"$(__pm_workspace_packages)"};`);
	});

	it('zsh output still completes package names for cd', () => {
		const output = completionsForShell('zsh');
		expect(output).toContain(
			'elif [[ $words[2] == cd ]] && (( CURRENT == 3 )); then',
		);
	});

	it('bash output defines a shared workspace-packages helper', () => {
		const output = completionsForShell('bash');
		expect(output).toContain('__pm_workspace_packages() {');
		expect(output).toContain('command pm cd --completions 2>/dev/null;');
	});

	it('bash output completes package names after -F/--filter', () => {
		const output = completionsForShell('bash');
		expect(output).toContain(`local prev="\${COMP_WORDS[COMP_CWORD-1]}";`);
		expect(output).toContain(
			'if [[ "$prev" == "-F" || "$prev" == "--filter" ]]; then',
		);
		expect(output).toContain(
			`COMPREPLY=($(compgen -W "$(__pm_workspace_packages)" -- "\${COMP_WORDS[$COMP_CWORD]}"));`,
		);
	});

	it('bash output still completes package names for cd', () => {
		const output = completionsForShell('bash');
		expect(output).toContain(
			`if [[ "\${COMP_WORDS[1]}" == "cd" ]] && [[ $COMP_CWORD -eq 2 ]]; then`,
		);
	});

	it('falls back to the base completions eval for other shells', () => {
		expect(completionsForShell('fish')).toBe(
			'eval "$(command pm --completions fish)"',
		);
	});
});
