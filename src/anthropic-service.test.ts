import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MigrationIssue } from './analyser';
import { AnthropicService } from './anthropic-service';

// Mock the Anthropic SDK
const mock_anthropic_client = {
	messages: {
		create: vi.fn(),
	},
};

vi.mock('@anthropic-ai/sdk', () => ({
	default: vi.fn(() => mock_anthropic_client),
}));

describe('AnthropicService', () => {
	let anthropic_service: AnthropicService;

	beforeEach(() => {
		vi.clearAllMocks();
		anthropic_service = new AnthropicService('fake-api-key');
	});

	describe('analyzeSvelteFile', () => {
		it('should analyse a Svelte file and return suggestions', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: `1. Replace export let with $props() for better type safety
2. Use $derived instead of reactive statements for computed values
3. Convert on:click to onclick for modern event handling
4. Consider using $state for reactive variables
5. Update your component props structure`,
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const issues: MigrationIssue[] = [
				{
					line: 5,
					message: 'export let should be replaced with $props()',
					severity: 'warning',
					rule: 'export-let',
				},
			];

			const warnings: MigrationIssue[] = [
				{
					line: 8,
					message: 'on:click should be replaced with onclick',
					severity: 'warning',
					rule: 'on-directive',
				},
			];

			const result = await anthropic_service.analyzeSvelteFile(
				'test.svelte',
				'<script>export let name;</script>',
				issues,
				warnings,
			);

			expect(result).toHaveLength(5);
			expect(result[0]).toContain('Replace export let with $props()');
			expect(result[1]).toContain(
				'Use $derived instead of reactive statements',
			);
			expect(result[2]).toContain('Convert on:click to onclick');
			expect(result[3]).toContain(
				'Consider using $state for reactive variables',
			);
			expect(result[4]).toContain(
				'Update your component props structure',
			);

			expect(
				mock_anthropic_client.messages.create,
			).toHaveBeenCalledWith({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 4000,
				temperature: 0.1,
				messages: [
					{
						role: 'user',
						content: expect.stringContaining(
							'You are an expert Svelte developer',
						),
					},
				],
			});
		});

		it('should handle empty response from Claude', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: '',
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const result = await anthropic_service.analyzeSvelteFile(
				'test.svelte',
				'<script>let name;</script>',
				[],
				[],
			);

			expect(result).toEqual([]);
		});

		it('should filter out very short suggestions', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: `1. This is a longer suggestion that should be included
2. This is also a good suggestion that meets the length requirement`,
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const result = await anthropic_service.analyzeSvelteFile(
				'test.svelte',
				'<script>export let name;</script>',
				[],
				[],
			);

			expect(result).toHaveLength(2);
			expect(result[0]).toContain('This is a longer suggestion');
			expect(result[1]).toContain('This is also a good suggestion');
		});

		it('should handle API errors', async () => {
			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockRejectedValue(new Error('API rate limit exceeded'));

			await expect(
				anthropic_service.analyzeSvelteFile(
					'test.svelte',
					'<script></script>',
					[],
					[],
				),
			).rejects.toThrow(
				'Failed to analyse with Claude: Error: API rate limit exceeded',
			);
		});

		it('should handle non-text response content', async () => {
			const mock_response = {
				content: [
					{
						type: 'image',
						// No text property
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const result = await anthropic_service.analyzeSvelteFile(
				'test.svelte',
				'<script>export let name;</script>',
				[],
				[],
			);

			expect(result).toEqual([]);
		});
	});

	describe('getSvelteComponentSuggestions', () => {
		it('should return modernised code and migration steps', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: `**MODERNISED CODE:**
\`\`\`svelte
<script>
  let { name } = $props();
  let count = $state(0);
  
  function handle_click() {
    count++;
  }
</script>

<button onclick={handle_click}>
  {name}: {count}
</button>
\`\`\`

**MIGRATION STEPS:**
1. Replace export let with $props() destructuring
2. Convert reactive variables to $state()
3. Update event handlers from on:click to onclick
4. Remove createEventDispatcher and use callback props`,
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const component_content = `
<script>
  export let name;
  let count = 0;
  
  function handle_click() {
    count++;
  }
</script>

<button on:click={handle_click}>
  {name}: {count}
</button>
`;

			const result =
				await anthropic_service.getSvelteComponentSuggestions(
					component_content,
				);

			expect(result.modernised_code).toContain(
				'let { name } = $props()',
			);
			expect(result.modernised_code).toContain(
				'let count = $state(0)',
			);
			expect(result.modernised_code).toContain(
				'onclick={handle_click}',
			);

			expect(result.migration_steps).toHaveLength(4);
			expect(result.migration_steps[0]).toContain(
				'Replace export let with $props()',
			);
			expect(result.migration_steps[1]).toContain(
				'Convert reactive variables to $state()',
			);
			expect(result.migration_steps[2]).toContain(
				'Update event handlers from on:click to onclick',
			);
			expect(result.migration_steps[3]).toContain(
				'Remove createEventDispatcher',
			);
		});

		it('should handle malformed response', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: 'This is not a properly formatted response',
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const result =
				await anthropic_service.getSvelteComponentSuggestions(
					'<script>export let name;</script>',
				);

			expect(result.modernised_code).toBe('');
			expect(result.migration_steps).toEqual([]);
		});

		it('should handle response with missing sections', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: `**MODERNISED CODE:**
\`\`\`svelte
<script>let { name } = $props();</script>
\`\`\`

Some other text without migration steps section.`,
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			const result =
				await anthropic_service.getSvelteComponentSuggestions(
					'<script>export let name;</script>',
				);

			expect(result.modernised_code).toContain(
				'let { name } = $props()',
			);
			expect(result.migration_steps).toEqual([]);
		});

		it('should handle API errors for component suggestions', async () => {
			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockRejectedValue(new Error('Network error'));

			await expect(
				anthropic_service.getSvelteComponentSuggestions(
					'<script>export let name;</script>',
				),
			).rejects.toThrow(
				'Failed to get component suggestions: Error: Network error',
			);
		});

		it('should use correct model and parameters', async () => {
			const mock_response = {
				content: [
					{
						type: 'text',
						text: '**MODERNISED CODE:**\n```svelte\n<script></script>\n```\n\n**MIGRATION STEPS:**\n1. Test step',
					},
				],
			};

			vi.mocked(
				mock_anthropic_client.messages.create,
			).mockResolvedValue(mock_response);

			await anthropic_service.getSvelteComponentSuggestions(
				'<script>export let name;</script>',
			);

			expect(
				mock_anthropic_client.messages.create,
			).toHaveBeenCalledWith({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 6000,
				temperature: 0.1,
				messages: [
					{
						role: 'user',
						content: expect.stringContaining(
							'You are a Svelte 5 migration expert',
						),
					},
				],
			});
		});
	});

	describe('constructor', () => {
		it('should initialise with API key', () => {
			const service = new AnthropicService('test-key');
			expect(service).toBeInstanceOf(AnthropicService);
		});
	});
});
