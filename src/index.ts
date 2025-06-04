import * as core from "@actions/core";
import * as github from "@actions/github";
import { SvelteMigrationAnalyzer } from "./analyzer";
import { AnthropicService } from "./anthropic-service";
import { GitHubService } from "./github-service";

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput("github-token");
    const filterChangedFiles = core.getBooleanInput("filter-changed-files");
    const failOnError = core.getBooleanInput("fail-on-error");
    const failOnWarning = core.getBooleanInput("fail-on-warning");
    const paths = core.getMultilineInput("paths");
    const excludePaths = core.getMultilineInput("exclude-paths");
    const anthropicApiKey = core.getInput("anthropic-api-key");
    const enableAiAnalysis = core.getBooleanInput("enable-ai-analysis");

    core.info("🔍 Starting Svelte migration analysis...");

    // Initialize services
    const gitHub = new GitHubService(githubToken, github.context);
    const anthropic =
      enableAiAnalysis && anthropicApiKey
        ? new AnthropicService(anthropicApiKey)
        : undefined;

    // Get files to analyze
    let filesToAnalyze: string[] = [];

    if (filterChangedFiles && github.context.eventName === "pull_request") {
      core.info("📋 Getting changed files from PR...");
      filesToAnalyze = await gitHub.getChangedSvelteFiles();
    } else {
      core.info("📂 Scanning for Svelte files...");
      const analyzer = new SvelteMigrationAnalyzer(anthropic);
      filesToAnalyze = await analyzer.findSvelteFiles(paths, excludePaths);
    }

    if (filesToAnalyze.length === 0) {
      core.info("✨ No Svelte files found to analyze");
      core.setOutput("files-analyzed", 0);
      core.setOutput("issues-found", 0);
      core.setOutput("warnings-found", 0);
      core.setOutput("has-issues", false);
      core.setOutput("summary", "No Svelte files found to analyze");
      return;
    }

    core.info(`📊 Analyzing ${filesToAnalyze.length} Svelte files...`);

    // Run analysis
    const analyzer = new SvelteMigrationAnalyzer(anthropic);
    const results = await analyzer.analyzeFiles(filesToAnalyze);

    // Set outputs
    const totalIssues = results.reduce(
      (sum, result) => sum + result.issues.length,
      0
    );
    const totalWarnings = results.reduce(
      (sum, result) => sum + result.warnings.length,
      0
    );

    core.setOutput("files-analyzed", filesToAnalyze.length);
    core.setOutput("issues-found", totalIssues);
    core.setOutput("warnings-found", totalWarnings);
    core.setOutput("has-issues", totalIssues > 0 || totalWarnings > 0);

    // Generate summary
    const summary = generateSummary(results, totalIssues, totalWarnings);
    core.setOutput("summary", summary);

    // Create PR comment if this is a PR
    if (
      github.context.eventName === "pull_request" &&
      (totalIssues > 0 || totalWarnings > 0)
    ) {
      await gitHub.createOrUpdateComment(summary);
    }

    // Log results
    if (totalIssues > 0) {
      core.error(`❌ Found ${totalIssues} migration issues`);
    }
    if (totalWarnings > 0) {
      core.warning(`⚠️ Found ${totalWarnings} migration warnings`);
    }
    if (totalIssues === 0 && totalWarnings === 0) {
      core.info("✅ No migration issues found!");
    }

    // Fail if requested
    if (failOnError && totalIssues > 0) {
      core.setFailed(`Migration analysis failed: ${totalIssues} issues found`);
    }
    if (failOnWarning && totalWarnings > 0) {
      core.setFailed(
        `Migration analysis failed: ${totalWarnings} warnings found`
      );
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

function generateSummary(
  results: any[],
  totalIssues: number,
  totalWarnings: number
): string {
  let summary = "# 🔄 Svelte Migration Analysis Results\n\n";

  if (totalIssues === 0 && totalWarnings === 0) {
    summary +=
      "✅ **Great news!** No Svelte 4 patterns detected in your codebase.\n\n";
    summary += "Your project appears to be ready for Svelte 5!\n";
    return summary;
  }

  summary += `## 📊 Summary\n\n`;
  summary += `- **Files analyzed:** ${results.length}\n`;
  summary += `- **Issues found:** ${totalIssues}\n`;
  summary += `- **Warnings found:** ${totalWarnings}\n\n`;

  if (totalIssues > 0) {
    summary += `## ❌ Issues (${totalIssues})\n\n`;
    summary +=
      "These are breaking changes that must be addressed for Svelte 5:\n\n";

    for (const result of results) {
      if (result.issues.length > 0) {
        // Create collapsible details for each file
        const issueCount = result.issues.length;
        const issueText = issueCount === 1 ? "issue" : "issues";

        summary += `<details>\n`;
        summary += `<summary>📄 <code>${result.file}</code> - ${issueCount} ${issueText}</summary>\n\n`;

        for (const issue of result.issues) {
          summary += `- **Line ${issue.line}:** ${issue.message}\n`;
          if (issue.suggestion) {
            summary += `  - 💡 **Suggestion:** ${issue.suggestion}\n`;
          }
        }
        summary += "\n</details>\n\n";
      }
    }
  }

  if (totalWarnings > 0) {
    summary += `## ⚠️ Warnings (${totalWarnings})\n\n`;
    summary +=
      "These patterns will still work but are deprecated in Svelte 5:\n\n";

    for (const result of results) {
      if (result.warnings.length > 0) {
        // Create collapsible details for each file
        const warningCount = result.warnings.length;
        const warningText = warningCount === 1 ? "warning" : "warnings";

        summary += `<details>\n`;
        summary += `<summary>📄 <code>${result.file}</code> - ${warningCount} ${warningText}</summary>\n\n`;

        for (const warning of result.warnings) {
          summary += `- **Line ${warning.line}:** ${warning.message}\n`;
          if (warning.suggestion) {
            summary += `  - 💡 **Suggestion:** ${warning.suggestion}\n`;
          }
        }
        summary += "\n</details>\n\n";
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
