import { withPreset } from '@fdarian/blume-preset';
import { defineConfig } from 'blume';
import { filesystem } from 'blume/sources';

export default defineConfig(
	withPreset({
		title: 'Better PM',
		description: 'A CLI for smarter package manager operations in monorepos',
		content: { sources: [filesystem({ root: 'src/pages' })] },
		navigation: {
			sidebar: [
				{
					label: 'Get Started',
					items: [
						{ label: 'Introduction', href: '/' },
						'/installation',
						'/quickstart',
					],
				},
				{
					label: 'Core Concepts',
					items: [
						'/concepts/monorepo-aware-install',
						'/concepts/package-manager-agnostic',
						'/concepts/workspace-navigation',
					],
				},
				{
					label: 'Commands',
					items: [
						'/commands/install',
						'/commands/add',
						'/commands/remove',
						'/commands/run',
						'/commands/pls',
						'/commands/cd',
						'/commands/ls',
						'/commands/up',
						'/commands/link',
						'/commands/unlink',
						'/commands/why',
						'/commands/x',
						'/commands/activate',
					],
				},
				{
					label: 'Guides',
					items: [
						'/guides/monorepo-setup',
						'/guides/shell-integration',
						'/guides/paste-friendly-commands',
						'/guides/troubleshooting',
					],
				},
				{
					label: 'Reference',
					items: ['/reference/changelog', '/reference/contributing'],
				},
			],
		},
		footer: { socials: { github: 'https://github.com/fdarian/better-pm' } },
	}),
);
