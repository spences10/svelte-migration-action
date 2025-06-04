import { describe, expect, it } from 'vitest';
import { generate_summary } from './index';

describe('generate_summary function', () => {
	it('should generate summary for no issues', () => {
		const results = [
			{ file: 'src/App.svelte', issues: [], warnings: [] },
		];

		const summary = generate_summary(results, 0, 0);

		expect(summary).toContain(
			'✅ **Great news!** No Svelte 4 patterns detected',
		);
		expect(summary).toContain(
			'Your project appears to be ready for Svelte 5!',
		);
	});

	it('should generate summary with issues and warnings', () => {
		const results = [
			{
				file: 'src/App.svelte',
				issues: [
					{
						line: 5,
						message: 'Use $props instead',
						severity: 'error',
						rule: 'export-let',
					},
				],
				warnings: [
					{
						line: 8,
						message: 'Use onclick instead',
						severity: 'warning',
						rule: 'on-directive',
					},
				],
			},
		];

		const summary = generate_summary(results, 1, 1);

		expect(summary).toContain(
			'# 🔄 Svelte Migration Analysis Results',
		);
		expect(summary).toContain('## 📊 Summary');
		expect(summary).toContain('**Files analysed:** 1');
		expect(summary).toContain('**Issues found:** 1');
		expect(summary).toContain('**Warnings found:** 1');
		expect(summary).toContain('## ❌ Issues (1)');
		expect(summary).toContain('## ⚠️ Warnings (1)');
		expect(summary).toContain('<details>');
		expect(summary).toContain(
			'<summary>📄 <code>src/App.svelte</code>',
		);
	});

	it('should generate collapsible details for files with multiple issues', () => {
		const results = [
			{
				file: 'src/Component.svelte',
				issues: [
					{
						line: 5,
						message: 'First issue',
						severity: 'error',
						rule: 'rule1',
					},
					{
						line: 10,
						message: 'Second issue',
						severity: 'error',
						rule: 'rule2',
					},
				],
				warnings: [],
			},
		];

		const summary = generate_summary(results, 2, 0);

		expect(summary).toContain(
			'<summary>📄 <code>src/Component.svelte</code> - 2 issues</summary>',
		);
		expect(summary).toContain('**Line 5:** First issue');
		expect(summary).toContain('**Line 10:** Second issue');
	});

	it('should include suggestions when available', () => {
		const results = [
			{
				file: 'src/App.svelte',
				issues: [
					{
						line: 5,
						message: 'Use $props instead',
						severity: 'error',
						rule: 'export-let',
						suggestion: 'Replace with: let { name } = $props()',
					},
				],
				warnings: [],
			},
		];

		const summary = generate_summary(results, 1, 0);

		expect(summary).toContain(
			'💡 **Suggestion:** Replace with: let { name } = $props()',
		);
	});
});
