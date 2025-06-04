import * as core from '@actions/core'
import * as github from '@actions/github'

export class GitHubService {
  private octokit: ReturnType<typeof github.getOctokit>
  private context: typeof github.context

  constructor(token: string, context: typeof github.context) {
    this.octokit = github.getOctokit(token)
    this.context = context
  }

  async getChangedSvelteFiles(): Promise<string[]> {
    if (this.context.eventName !== 'pull_request') {
      return []
    }

    try {
      const { owner, repo } = this.context.repo
      const pullNumber = this.context.payload.pull_request?.number

      if (!pullNumber) {
        core.warning('No pull request number found')
        return []
      }

      // Get the list of files changed in the PR
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100 // GitHub default maximum
      })

      // Filter for Svelte files and files that were added or modified
      const svelteFiles = files
        .filter(file => {
          // Only include files that were added or modified (not deleted)
          return file.status === 'added' || file.status === 'modified'
        })
        .filter(file => file.filename.endsWith('.svelte'))
        .map(file => file.filename)

      core.info(`Found ${svelteFiles.length} changed Svelte files in PR`)
      return svelteFiles

    } catch (error) {
      core.warning(`Failed to get changed files: ${error}`)
      return []
    }
  }

  async createOrUpdateComment(summary: string): Promise<void> {
    if (this.context.eventName !== 'pull_request') {
      core.info('Not a pull request, skipping comment creation')
      return
    }

    try {
      const { owner, repo } = this.context.repo
      const pullNumber = this.context.payload.pull_request?.number

      if (!pullNumber) {
        core.warning('No pull request number found, cannot create comment')
        return
      }

      const commentMarker = '<!-- svelte-migration-analysis -->'
      const commentBody = `${commentMarker}\n${summary}`

      // Check if we already have a comment
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber
      })

      const existingComment = comments.find(comment => 
        comment.body?.includes(commentMarker)
      )

      if (existingComment) {
        // Update existing comment
        await this.octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: commentBody
        })
        core.info('Updated existing PR comment with analysis results')
      } else {
        // Create new comment
        await this.octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pullNumber,
          body: commentBody
        })
        core.info('Created new PR comment with analysis results')
      }

    } catch (error) {
      core.warning(`Failed to create/update PR comment: ${error}`)
    }
  }

  async createCheckRun(name: string, summary: string, issues: number, warnings: number): Promise<void> {
    try {
      const { owner, repo } = this.context.repo
      const sha = this.context.sha

      const conclusion = issues > 0 ? 'failure' : warnings > 0 ? 'neutral' : 'success'
      const title = issues > 0 
        ? `Found ${issues} migration issues` 
        : warnings > 0 
        ? `Found ${warnings} migration warnings`
        : 'No migration issues found'

      await this.octokit.rest.checks.create({
        owner,
        repo,
        name,
        head_sha: sha,
        status: 'completed',
        conclusion,
        output: {
          title,
          summary,
          text: summary
        }
      })

      core.info(`Created check run with conclusion: ${conclusion}`)

    } catch (error) {
      core.warning(`Failed to create check run: ${error}`)
    }
  }

  async createAnnotations(issues: Array<{ file: string; line: number; message: string; severity: 'error' | 'warning' }>): Promise<void> {
    try {
      const { owner, repo } = this.context.repo
      const sha = this.context.sha

      // GitHub API limits annotations to 50 per request
      const chunks = this.chunkArray(issues, 50)

      for (const chunk of chunks) {
        const annotations = chunk.map(issue => ({
          path: issue.file,
          start_line: issue.line,
          end_line: issue.line,
          annotation_level: issue.severity === 'error' ? 'failure' : 'warning' as const,
          message: issue.message
        }))

        await this.octokit.rest.checks.create({
          owner,
          repo,
          name: 'Svelte Migration Analysis',
          head_sha: sha,
          status: 'completed',
          conclusion: issues.some(i => i.severity === 'error') ? 'failure' : 'neutral',
          output: {
            title: 'Svelte Migration Analysis',
            summary: `Found ${issues.length} migration issues`,
            annotations
          }
        })
      }

      core.info(`Created annotations for ${issues.length} issues`)

    } catch (error) {
      core.warning(`Failed to create annotations: ${error}`)
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
} 