import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SvelteMigrationAnalyser } from './analyser';
import { AnthropicService } from './anthropic-service';

// Mock the modules at the top level
vi.mock('glob', () => ({
	glob: vi.fn(),
}));

vi.mock('fs/promises', () => ({
	readFile: vi.fn(),
}));

describe('SvelteMigrationAnalyser', () => {
	let analyser: SvelteMigrationAnalyser;

	beforeEach(() => {
		analyser = new SvelteMigrationAnalyser();
		vi.clearAllMocks();
	});

	describe('analyzeFile', () => {
		it('should detect createEventDispatcher usage', async () => {
			const content = `
        <script>
          import { createEventDispatcher } from 'svelte';
          const dispatch = createEventDispatcher();
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(2); // Both import and usage
			expect(result.issues[0]).toMatchObject({
				rule: 'create-event-dispatcher',
				severity: 'error',
				message: 'createEventDispatcher is deprecated in Svelte 5',
			});
		});

		it('should detect export let declarations', async () => {
			const content = `
        <script>
          export let name;
          export let age = 25;
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(2);
			expect(result.warnings[0]).toMatchObject({
				rule: 'export-let',
				severity: 'warning',
				message: 'export let should be replaced with $props()',
			});
		});

		it('should detect reactive statements', async () => {
			const content = `
        <script>
          let count = 0;
          $: doubled = count * 2;
          $: console.log('count changed');
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(2);
			expect(result.warnings[0]).toMatchObject({
				rule: 'reactive-statement',
				severity: 'warning',
				message:
					'Reactive statement ($:) should be replaced with $derived or $effect',
			});
		});

		it('should detect on: event directives', async () => {
			const content = `
        <button on:click={handleClick}>Click me</button>
        <input on:change={handleChange} />
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(2);
			expect(result.warnings[0]).toMatchObject({
				rule: 'on-directive',
				severity: 'warning',
				message:
					'on: event directives should be replaced with event properties',
			});
		});

		it('should detect lifecycle hooks', async () => {
			const content = `
        <script>
          import { beforeUpdate, afterUpdate } from 'svelte';
          
          beforeUpdate(() => {
            console.log('before update');
          });
          
          afterUpdate(() => {
            console.log('after update');
          });
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(3); // Import line has both, plus two function calls
			expect(result.issues[0]).toMatchObject({
				rule: 'lifecycle-hooks',
				severity: 'error',
				message:
					'beforeUpdate/afterUpdate are deprecated in Svelte 5',
			});
		});

		it('should detect $$props and $$restProps', async () => {
			const content = `
        <script>
          console.log($$props);
          const { name, ...rest } = $$restProps;
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(2);
			expect(result.issues[0]).toMatchObject({
				rule: 'double-dollar-props',
				severity: 'error',
				message: '$$props and $$restProps are deprecated',
			});
		});

		it('should detect $$slots usage', async () => {
			const content = `
        <script>
          if ($$slots.header) {
            console.log('Header slot exists');
          }
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				rule: 'double-dollar-slots',
				severity: 'error',
				message: '$$slots is deprecated in Svelte 5',
			});
		});

		it('should detect named slots', async () => {
			const content = `
        <slot name="header">Default header</slot>
        <slot name="footer">Default footer</slot>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(2);
			expect(result.warnings[0]).toMatchObject({
				rule: 'slot-usage',
				severity: 'warning',
				message: 'Named slots should be replaced with snippets',
			});
		});

		it('should detect component instantiation with new', async () => {
			const content = `
        <script>
          import Component from './Component.svelte';
          const instance = new Component({ target: document.body });
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				rule: 'component-instantiation',
				severity: 'error',
				message: 'Component instantiation with "new" is deprecated',
			});
		});

		it('should detect store subscriptions', async () => {
			const content = `
        <script>
          import { writable } from 'svelte/store';
          const count = writable(0);
          $count = 5;
        </script>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toMatchObject({
				rule: 'store-subscription',
				severity: 'warning',
				message:
					'Store auto-subscriptions with $ prefix may need to be updated',
			});
		});

		it('should detect let: directive in slots', async () => {
			const content = `
        <Component let:item>
          <span>{item.name}</span>
        </Component>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toMatchObject({
				rule: 'let-directive',
				severity: 'warning',
				message:
					'let: directive in slots should be replaced with snippet parameters',
			});
		});

		it('should handle files with no issues', async () => {
			const content = `
        <script>
          let { name } = $props();
          let count = $state(0);
          
          function handleClick() {
            count++;
          }
        </script>
        
        <button onclick={handleClick}>
          {name}: {count}
        </button>
      `;

			const result = await analyser.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.issues).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it('should handle AI analysis when service is provided', async () => {
			const mockAnthropicService = {
				analyzeSvelteFile: vi
					.fn()
					.mockResolvedValue([
						'Use $props() instead',
						'Consider $state for reactivity',
					]),
			} as unknown as AnthropicService;

			const analyserWithAI = new SvelteMigrationAnalyser(
				mockAnthropicService,
			);

			const content = `
        <script>
          export let name;
        </script>
      `;

			const result = await analyserWithAI.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(1);
			expect(result.aiSuggestions).toEqual([
				'Use $props() instead',
				'Consider $state for reactivity',
			]);
			expect(
				mockAnthropicService.analyzeSvelteFile,
			).toHaveBeenCalledWith(
				'test.svelte',
				content,
				[],
				expect.any(Array),
			);
		});

		it('should handle AI analysis errors gracefully', async () => {
			const mockAnthropicService = {
				analyzeSvelteFile: vi
					.fn()
					.mockRejectedValue(new Error('API Error')),
			} as unknown as AnthropicService;

			const analyserWithAI = new SvelteMigrationAnalyser(
				mockAnthropicService,
			);

			const content = `
        <script>
          export let name;
        </script>
      `;

			const consoleSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			const result = await analyserWithAI.analyzeFile(
				'test.svelte',
				content,
			);

			expect(result.warnings).toHaveLength(1);
			expect(result.aiSuggestions).toBeUndefined();
			expect(consoleSpy).toHaveBeenCalledWith(
				'AI analysis failed for test.svelte:',
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('findSvelteFiles', () => {
		it('should find Svelte files in specified paths', async () => {
			// Mock glob to return some test files
			const { glob } = await import('glob');
			vi.mocked(glob).mockResolvedValue([
				'src/App.svelte',
				'src/components/Button.svelte',
				'src/routes/+page.svelte',
			]);

			const result = await analyser.findSvelteFiles(
				['src'],
				['node_modules'],
			);

			expect(result).toEqual([
				'src/App.svelte',
				'src/components/Button.svelte',
				'src/routes/+page.svelte',
			]);
		});
	});

	describe('analyzeFiles', () => {
		it('should analyze multiple files', async () => {
			const files = ['file1.svelte', 'file2.svelte'];

			// Mock fs.readFile
			const { readFile } = await import('fs/promises');
			vi.mocked(readFile).mockImplementation((filename) => {
				if (filename === 'file1.svelte') {
					return Promise.resolve('export let name;');
				}
				if (filename === 'file2.svelte') {
					return Promise.resolve(
						'const dispatch = createEventDispatcher();',
					);
				}
				return Promise.reject(new Error('File not found'));
			});

			const results = await analyser.analyzeFiles(files);

			expect(results).toHaveLength(2);
			expect(results[0].warnings).toHaveLength(1); // export let
			expect(results[1].issues).toHaveLength(1); // createEventDispatcher
		});

		it('should handle file read errors', async () => {
			const files = ['nonexistent.svelte'];

			// Mock fs.readFile to throw an error
			const { readFile } = await import('fs/promises');
			vi.mocked(readFile).mockRejectedValue(
				new Error('File not found'),
			);

			const consoleSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			const results = await analyser.analyzeFiles(files);

			expect(results).toHaveLength(1);
			expect(results[0].issues).toHaveLength(1);
			expect(results[0].issues[0]).toMatchObject({
				rule: 'file-read-error',
				severity: 'error',
				message: expect.stringContaining('Failed to read file'),
			});

			consoleSpy.mockRestore();
		});
	});
});
