import * as core from '@actions/core';
import * as github from '@actions/github';
import { SvelteMigrationAnalyser } from './analyser';
import { AnthropicService } from './anthropic-service';
import { GitHubService } from './github-service';

async function run(): Promise<void> {
	try {
		// Get inputs
		const github_token = core.getInput('github-token');
		const filter_changed_files = core.getBooleanInput(
			'filter-changed-files',
		);
		const fail_on_error = core.getBooleanInput('fail-on-error');
		const fail_on_warning = core.getBooleanInput('fail-on-warning');
		const paths = core.getMultilineInput('paths');
		const exclude_paths = core.getMultilineInput('exclude-paths');
		const anthropic_api_key = core.getInput('anthropic-api-key');
		const enable_ai_analysis = core.getBooleanInput(
			'enable-ai-analysis',
		);

		core.info('🔍 Starting Svelte migration analysis...');

		// Initialize services
		const git_hub = new GitHubService(github_token, github.context);
		const anthropic =
			enable_ai_analysis && anthropic_api_key
				? new AnthropicService(anthropic_api_key)
				: undefined;

		// Get files to analyse
		let files_to_analyse: string[] = [];

		if (
			filter_changed_files &&
			github.context.eventName === 'pull_request'
		) {
			core.info('📋 Getting changed files from PR...');
			files_to_analyse = await git_hub.getChangedSvelteFiles();
		} else {
			core.info('📂 Scanning for Svelte files...');
			const analyser = new SvelteMigrationAnalyser(anthropic);
			files_to_analyse = await analyser.findSvelteFiles(
				paths,
				exclude_paths,
			);
		}

		if (files_to_analyse.length === 0) {
			core.info('✨ No Svelte files found to analyse');
			core.setOutput('files-analysed', 0);
			core.setOutput('issues-found', 0);
			core.setOutput('warnings-found', 0);
			core.setOutput('has-issues', false);
			core.setOutput('summary', 'No Svelte files found to analyse');
			return;
		}

		core.info(
			`📊 Analysing ${files_to_analyse.length} Svelte files...`,
		);

		// Run analysis
		const analyser = new SvelteMigrationAnalyser(anthropic);
		const results = await analyser.analyzeFiles(files_to_analyse);

		// Set outputs
		const total_issues = results.reduce(
			(sum: any, result: { issues: string | any[] }) =>
				sum + result.issues.length,
			0,
		);
		const total_warnings = results.reduce(
			(sum: any, result: { warnings: string | any[] }) =>
				sum + result.warnings.length,
			0,
		);

		core.setOutput('files-analysed', files_to_analyse.length);
		core.setOutput('issues-found', total_issues);
		core.setOutput('warnings-found', total_warnings);
		core.setOutput(
			'has-issues',
			total_issues > 0 || total_warnings > 0,
		);

		// Generate summary
		const summary = generate_summary(
			results,
			total_issues,
			total_warnings,
		);
		core.setOutput('summary', summary);

		// Create PR comment if this is a PR
		if (
			github.context.eventName === 'pull_request' &&
			(total_issues > 0 || total_warnings > 0)
		) {
			await git_hub.createOrUpdateComment(summary);
		}

		// Log results
		if (total_issues > 0) {
			core.error(`❌ Found ${total_issues} migration issues`);
		}
		if (total_warnings > 0) {
			core.warning(`⚠️ Found ${total_warnings} migration warnings`);
		}
		if (total_issues === 0 && total_warnings === 0) {
			core.info('✅ No migration issues found!');
		}

		// Fail if requested
		if (fail_on_error && total_issues > 0) {
			core.setFailed(
				`Migration analysis failed: ${total_issues} issues found`,
			);
		}
		if (fail_on_warning && total_warnings > 0) {
			core.setFailed(
				`Migration analysis failed: ${total_warnings} warnings found`,
			);
		}
	} catch (error) {
		core.setFailed(`Action failed with error: ${error}`);
	}
}

function generate_summary(
	results: any[],
	total_issues: number,
	total_warnings: number,
): string {
	let summary = '# 🔄 Svelte Migration Analysis Results\n\n';

	if (total_issues === 0 && total_warnings === 0) {
		summary +=
			'✅ **Great news!** No Svelte 4 patterns detected in your codebase.\n\n';
		summary += 'Your project appears to be ready for Svelte 5!\n';
		return summary;
	}

	summary += `## 📊 Summary\n\n`;
	summary += `- **Files analysed:** ${results.length}\n`;
	summary += `- **Issues found:** ${total_issues}\n`;
	summary += `- **Warnings found:** ${total_warnings}\n\n`;

	if (total_issues > 0) {
		summary += `## ❌ Issues (${total_issues})\n\n`;
		summary +=
			'These are breaking changes that must be addressed for Svelte 5:\n\n';

		for (const result of results) {
			if (result.issues.length > 0) {
				// Create collapsible details for each file
				const issue_count = result.issues.length;
				const issue_text = issue_count === 1 ? 'issue' : 'issues';

				summary += `<details>\n`;
				summary += `<summary>📄 <code>${result.file}</code> - ${issue_count} ${issue_text}</summary>\n\n`;

				for (const issue of result.issues) {
					summary += `- **Line ${issue.line}:** ${issue.message}\n`;
					if (issue.suggestion) {
						summary += `  - 💡 **Suggestion:** ${issue.suggestion}\n`;
					}
				}
				summary += '\n</details>\n\n';
			}
		}
	}

	if (total_warnings > 0) {
		summary += `## ⚠️ Warnings (${total_warnings})\n\n`;
		summary +=
			'These patterns will still work but are deprecated in Svelte 5:\n\n';

		for (const result of results) {
			if (result.warnings.length > 0) {
				// Create collapsible details for each file
				const warning_count = result.warnings.length;
				const warning_text =
					warning_count === 1 ? 'warning' : 'warnings';

				summary += `<details>\n`;
				summary += `<summary>📄 <code>${result.file}</code> - ${warning_count} ${warning_text}</summary>\n\n`;

				for (const warning of result.warnings) {
					summary += `- **Line ${warning.line}:** ${warning.message}\n`;
					if (warning.suggestion) {
						summary += `  - 💡 **Suggestion:** ${warning.suggestion}\n`;
					}
				}
				summary += '\n</details>\n\n';
			}
		}
	}

	summary += `## 📚 Migration Resources\n\n`;
	summary += `- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)\n`;
	summary += `- [Automatic Migration Tool](https://svelte.dev/docs/svelte/v5-migration-guide#migration-script): \`npx sv migrate svelte-5\`\n`;
	summary += `- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)\n\n`;

	return summary;
}

run();
