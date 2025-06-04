import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubService } from './github-service';

// Mock the @actions modules
vi.mock('@actions/core', () => ({
	info: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
}));

const mockOctokit = {
	rest: {
		pulls: {
			listFiles: vi.fn(),
		},
		issues: {
			listComments: vi.fn(),
			createComment: vi.fn(),
			updateComment: vi.fn(),
		},
		checks: {
			create: vi.fn(),
		},
	},
};

vi.mock('@actions/github', () => ({
	getOctokit: vi.fn(() => mockOctokit),
	context: {
		eventName: 'pull_request',
		repo: { owner: 'test-owner', repo: 'test-repo' },
		sha: 'test-sha',
		payload: {
			pull_request: { number: 123 },
		},
	},
}));

describe('GitHubService', () => {
	let githubService: GitHubService;
	let mockContext: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the mock context
		mockContext = {
			eventName: 'pull_request',
			repo: { owner: 'test-owner', repo: 'test-repo' },
			sha: 'test-sha',
			payload: {
				pull_request: { number: 123 },
			},
		};

		githubService = new GitHubService('fake-token', mockContext);
	});

	describe('getChangedSvelteFiles', () => {
		it('should return changed Svelte files from PR', async () => {
			vi.mocked(mockOctokit.rest.pulls.listFiles).mockResolvedValue({
				data: [
					{ filename: 'src/App.svelte', status: 'modified' },
					{ filename: 'src/Button.svelte', status: 'added' },
					{ filename: 'src/Other.ts', status: 'modified' },
					{ filename: 'src/Deleted.svelte', status: 'removed' },
				],
			});

			const result = await githubService.getChangedSvelteFiles();

			expect(result).toEqual(['src/App.svelte', 'src/Button.svelte']);
			expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				pull_number: 123,
				per_page: 100,
			});
		});

		it('should return empty array when not a pull request', async () => {
			mockContext.eventName = 'push';
			mockContext.payload = {};

			const service = new GitHubService('fake-token', mockContext);
			const result = await service.getChangedSvelteFiles();

			expect(result).toEqual([]);
			expect(mockOctokit.rest.pulls.listFiles).not.toHaveBeenCalled();
		});

		it('should return empty array when no PR number found', async () => {
			mockContext.payload = {};

			const service = new GitHubService('fake-token', mockContext);
			const result = await service.getChangedSvelteFiles();

			expect(result).toEqual([]);
		});

		it('should handle API errors gracefully', async () => {
			vi.mocked(mockOctokit.rest.pulls.listFiles).mockRejectedValue(
				new Error('API Error'),
			);

			const result = await githubService.getChangedSvelteFiles();

			expect(result).toEqual([]);
		});
	});

	describe('createOrUpdateComment', () => {
		it('should create new comment when none exists', async () => {
			vi.mocked(
				mockOctokit.rest.issues.listComments,
			).mockResolvedValue({
				data: [],
			});

			const summary = 'Test summary';
			await githubService.createOrUpdateComment(summary);

			expect(
				mockOctokit.rest.issues.createComment,
			).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				issue_number: 123,
				body: '<!-- svelte-migration-analysis -->\nTest summary',
			});
		});

		it('should update existing comment when one exists', async () => {
			vi.mocked(
				mockOctokit.rest.issues.listComments,
			).mockResolvedValue({
				data: [
					{
						id: 456,
						body: '<!-- svelte-migration-analysis -->\nOld summary',
					},
				],
			});

			const summary = 'New summary';
			await githubService.createOrUpdateComment(summary);

			expect(
				mockOctokit.rest.issues.updateComment,
			).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				comment_id: 456,
				body: '<!-- svelte-migration-analysis -->\nNew summary',
			});
		});

		it('should skip when not a pull request', async () => {
			mockContext.eventName = 'push';
			mockContext.payload = {};

			const service = new GitHubService('fake-token', mockContext);
			await service.createOrUpdateComment('test');

			expect(
				mockOctokit.rest.issues.listComments,
			).not.toHaveBeenCalled();
		});

		it('should handle comment creation errors gracefully', async () => {
			vi.mocked(
				mockOctokit.rest.issues.listComments,
			).mockRejectedValue(new Error('API Error'));

			await expect(
				githubService.createOrUpdateComment('test'),
			).resolves.not.toThrow();
		});
	});

	describe('createCheckRun', () => {
		it('should create check run with success conclusion when no issues', async () => {
			await githubService.createCheckRun(
				'Test Check',
				'All good',
				0,
				0,
			);

			expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				name: 'Test Check',
				head_sha: 'test-sha',
				status: 'completed',
				conclusion: 'success',
				output: {
					title: 'No migration issues found',
					summary: 'All good',
					text: 'All good',
				},
			});
		});

		it('should create check run with failure conclusion when issues exist', async () => {
			await githubService.createCheckRun(
				'Test Check',
				'Found issues',
				2,
				1,
			);

			expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				name: 'Test Check',
				head_sha: 'test-sha',
				status: 'completed',
				conclusion: 'failure',
				output: {
					title: 'Found 2 migration issues',
					summary: 'Found issues',
					text: 'Found issues',
				},
			});
		});

		it('should create check run with neutral conclusion when only warnings', async () => {
			await githubService.createCheckRun(
				'Test Check',
				'Found warnings',
				0,
				3,
			);

			expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				name: 'Test Check',
				head_sha: 'test-sha',
				status: 'completed',
				conclusion: 'neutral',
				output: {
					title: 'Found 3 migration warnings',
					summary: 'Found warnings',
					text: 'Found warnings',
				},
			});
		});

		it('should handle check run creation errors gracefully', async () => {
			vi.mocked(mockOctokit.rest.checks.create).mockRejectedValue(
				new Error('API Error'),
			);

			await expect(
				githubService.createCheckRun('test', 'test', 0, 0),
			).resolves.not.toThrow();
		});
	});

	describe('createAnnotations', () => {
		it('should create annotations for issues', async () => {
			const issues = [
				{
					file: 'src/App.svelte',
					line: 10,
					message: 'Use $props instead',
					severity: 'error' as const,
				},
				{
					file: 'src/Button.svelte',
					line: 5,
					message: 'Use onclick instead',
					severity: 'warning' as const,
				},
			];

			await githubService.createAnnotations(issues);

			expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
				owner: 'test-owner',
				repo: 'test-repo',
				name: 'Svelte Migration Analysis',
				head_sha: 'test-sha',
				status: 'completed',
				conclusion: 'failure',
				output: {
					title: 'Svelte Migration Analysis',
					summary: 'Found 2 migration issues',
					annotations: [
						{
							path: 'src/App.svelte',
							start_line: 10,
							end_line: 10,
							annotation_level: 'failure',
							message: 'Use $props instead',
						},
						{
							path: 'src/Button.svelte',
							start_line: 5,
							end_line: 5,
							annotation_level: 'warning',
							message: 'Use onclick instead',
						},
					],
				},
			});
		});

		it('should handle large number of annotations by chunking', async () => {
			// Ensure mock is clean and can handle multiple calls
			vi.mocked(mockOctokit.rest.checks.create).mockClear();
			vi.mocked(mockOctokit.rest.checks.create).mockResolvedValue(
				{} as any,
			);

			const issues = Array.from({ length: 75 }, (_, i) => ({
				file: `src/File${i}.svelte`,
				line: i + 1,
				message: `Issue ${i}`,
				severity: 'warning' as const,
			}));

			await githubService.createAnnotations(issues);

			// Should be called twice due to 50-item chunks (75 items = 50 + 25)
			const callCount = vi.mocked(mockOctokit.rest.checks.create).mock
				.calls.length;
			expect(callCount).toBe(2);

			// Verify both calls were made with correct chunk sizes
			const calls = vi.mocked(mockOctokit.rest.checks.create).mock
				.calls;
			expect(calls[0][0].output.annotations).toHaveLength(50);
			expect(calls[1][0].output.annotations).toHaveLength(25);
		});

		it('should handle annotation creation errors gracefully', async () => {
			vi.mocked(mockOctokit.rest.checks.create).mockRejectedValue(
				new Error('API Error'),
			);

			const issues = [
				{
					file: 'src/App.svelte',
					line: 10,
					message: 'Test issue',
					severity: 'error' as const,
				},
			];

			await expect(
				githubService.createAnnotations(issues),
			).resolves.not.toThrow();
		});
	});
});
