import * as fs from 'fs/promises';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import * as path from 'path';
import { AnthropicService } from './anthropic-service';

export interface MigrationIssue {
	line: number;
	column?: number;
	message: string;
	suggestion?: string;
	severity: 'error' | 'warning';
	rule: string;
}

export interface AnalysisResult {
	file: string;
	issues: MigrationIssue[];
	warnings: MigrationIssue[];
	aiSuggestions?: string[];
}

export class SvelteMigrationAnalyser {
	private anthropicService?: AnthropicService;

	constructor(anthropicService?: AnthropicService) {
		this.anthropicService = anthropicService;
	}

	async findSvelteFiles(
		searchPaths: string[],
		excludePaths: string[],
	): Promise<string[]> {
		const allFiles: string[] = [];

		for (const searchPath of searchPaths) {
			const pattern = path.join(searchPath, '**/*.svelte');
			const files = await glob(pattern, {
				ignore: excludePaths.map((p) => path.join(p, '**/*')),
				nodir: true,
			});
			allFiles.push(...files);
		}

		// Remove duplicates and filter out excluded files
		const uniqueFiles = [...new Set(allFiles)];
		return uniqueFiles.filter(
			(file) =>
				!excludePaths.some((excludePath) =>
					minimatch(file, path.join(excludePath, '**/*')),
				),
		);
	}

	async analyzeFiles(files: string[]): Promise<AnalysisResult[]> {
		const results: AnalysisResult[] = [];

		for (const file of files) {
			try {
				const content = await fs.readFile(file, 'utf-8');
				const result = await this.analyzeFile(file, content);
				results.push(result);
			} catch (error) {
				console.warn(`Failed to analyze file ${file}:`, error);
				results.push({
					file,
					issues: [
						{
							line: 1,
							message: `Failed to read file: ${error}`,
							severity: 'error',
							rule: 'file-read-error',
						},
					],
					warnings: [],
				});
			}
		}

		return results;
	}

	async analyzeFile(
		filename: string,
		content: string,
	): Promise<AnalysisResult> {
		const lines = content.split('\n');
		const issues: MigrationIssue[] = [];
		const warnings: MigrationIssue[] = [];

		// Define migration patterns
		const patterns = this.getMigrationPatterns();

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNumber = i + 1;

			for (const pattern of patterns) {
				const matches = line.match(pattern.regex);
				if (matches) {
					const issue: MigrationIssue = {
						line: lineNumber,
						message: pattern.message,
						suggestion: pattern.suggestion,
						severity: pattern.severity,
						rule: pattern.rule,
					};

					if (pattern.severity === 'error') {
						issues.push(issue);
					} else {
						warnings.push(issue);
					}
				}
			}
		}

		let aiSuggestions: string[] | undefined;
		if (
			this.anthropicService &&
			(issues.length > 0 || warnings.length > 0)
		) {
			try {
				aiSuggestions = await this.anthropicService.analyzeSvelteFile(
					filename,
					content,
					issues,
					warnings,
				);
			} catch (error) {
				console.warn(`AI analysis failed for ${filename}:`, error);
			}
		}

		return {
			file: filename,
			issues,
			warnings,
			aiSuggestions,
		};
	}

	private getMigrationPatterns() {
		return [
			// Svelte 4 reactive statements ($:)
			{
				rule: 'reactive-statement',
				regex: /^\s*\$:\s+/,
				message:
					'Reactive statement ($:) should be replaced with $derived or $effect',
				suggestion:
					'Use $derived for computed values or $effect for side effects',
				severity: 'warning' as const,
			},

			// Svelte 4 store declarations
			{
				rule: 'export-let',
				regex: /export\s+let\s+(\w+)/,
				message: 'export let should be replaced with $props()',
				suggestion: 'Replace with: let { propName } = $props()',
				severity: 'warning' as const,
			},

			// Event handlers with on: directive
			{
				rule: 'on-directive',
				regex: /\son:(\w+)=/,
				message:
					'on: event directives should be replaced with event properties',
				suggestion: 'Replace on:click with onclick',
				severity: 'warning' as const,
			},

			// Slots usage
			{
				rule: 'slot-usage',
				regex: /<slot\s+name=/,
				message: 'Named slots should be replaced with snippets',
				suggestion:
					'Use {#snippet name()} and {@render name()} instead',
				severity: 'warning' as const,
			},

			// createEventDispatcher
			{
				rule: 'create-event-dispatcher',
				regex: /createEventDispatcher/,
				message: 'createEventDispatcher is deprecated in Svelte 5',
				suggestion:
					'Use callback props instead of createEventDispatcher',
				severity: 'error' as const,
			},

			// beforeUpdate/afterUpdate
			{
				rule: 'lifecycle-hooks',
				regex: /\b(beforeUpdate|afterUpdate)\b/,
				message:
					'beforeUpdate/afterUpdate are deprecated in Svelte 5',
				suggestion: 'Use $effect.pre() and $effect() instead',
				severity: 'error' as const,
			},

			// Store subscriptions
			{
				rule: 'store-subscription',
				regex: /\$(\w+)\s*=/,
				message:
					'Store auto-subscriptions with $ prefix may need to be updated',
				suggestion: 'Consider using $state for reactive variables',
				severity: 'warning' as const,
			},

			// Component instantiation with new
			{
				rule: 'component-instantiation',
				regex: /new\s+\w+\s*\(/,
				message: 'Component instantiation with "new" is deprecated',
				suggestion:
					'Use mount() or hydrate() instead of new Component()',
				severity: 'error' as const,
			},

			// bind:this usage
			{
				rule: 'bind-this',
				regex: /bind:this=/,
				message: 'bind:this behavior has changed in Svelte 5',
				suggestion:
					'bind:this no longer provides $set, $on, $destroy methods',
				severity: 'warning' as const,
			},

			// Transition modifiers
			{
				rule: 'transition-modifiers',
				regex: /\w+:\w+\|/,
				message: 'Transition modifiers may need |global in Svelte 5',
				suggestion:
					'Transitions are local by default, add |global if needed',
				severity: 'warning' as const,
			},

			// <svelte:component>
			{
				rule: 'svelte-component',
				regex: /<svelte:component\s+this=/,
				message:
					'svelte:component is no longer necessary in Svelte 5',
				suggestion:
					'You can use dynamic components directly: <Thing />',
				severity: 'warning' as const,
			},

			// $$props and $$restProps
			{
				rule: 'double-dollar-props',
				regex: /\$\$(props|restProps)/,
				message: '$$props and $$restProps are deprecated',
				suggestion:
					'Use destructuring with rest in $props(): let { foo, ...rest } = $props()',
				severity: 'error' as const,
			},

			// $$slots
			{
				rule: 'double-dollar-slots',
				regex: /\$\$slots/,
				message: '$$slots is deprecated in Svelte 5',
				suggestion: 'Use snippet parameters instead of $$slots',
				severity: 'error' as const,
			},

			// let: directive in slots
			{
				rule: 'let-directive',
				regex: /let:(\w+)/,
				message:
					'let: directive in slots should be replaced with snippet parameters',
				suggestion: 'Use {#snippet name(param)} instead of let:param',
				severity: 'warning' as const,
			},

			// Event modifiers
			{
				rule: 'event-modifiers',
				regex: /on:\w+\|(\w+)/,
				message: 'Event modifiers are deprecated in Svelte 5',
				suggestion:
					'Handle event.preventDefault(), event.stopPropagation() etc. in the handler',
				severity: 'warning' as const,
			},

			// <svelte:fragment>
			{
				rule: 'svelte-fragment',
				regex: /<svelte:fragment/,
				message: 'svelte:fragment should be replaced with snippets',
				suggestion:
					'Use {#snippet} blocks instead of svelte:fragment',
				severity: 'warning' as const,
			},
		];
	}
}
