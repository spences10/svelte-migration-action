# Svelte Migration Analysis Action

[![CI](https://github.com/your-org/svelte-migration-action/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/svelte-migration-action/actions/workflows/ci.yml)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-svelte--migration--analysis-blue?logo=github)](https://github.com/marketplace/actions/svelte-migration-analysis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful GitHub Action that helps teams migrate from **Svelte 4 to Svelte 5** by analyzing your codebase for deprecated patterns and providing actionable migration guidance. Get automated PR comments with detailed migration recommendations powered by static analysis and optional AI insights.

## ✨ Features

- 🔍 **Static Analysis**: Detects Svelte 4 patterns that need updating for Svelte 5
- 🤖 **AI-Powered Insights**: Optional Claude 4 analysis for detailed migration suggestions
- 💬 **PR Comments**: Automatic comments on pull requests with detailed findings
- ⚡ **Fast Analysis**: Built with TypeScript and optimized for large codebases
- 📊 **Comprehensive Reports**: Issues, warnings, and migration guidance
- 🎯 **Configurable**: Filter files, set failure conditions, and customize behavior
- 🔧 **Zero Config**: Works out of the box with sensible defaults

## 🚀 Quick Start

Add this to your workflow file (`.github/workflows/svelte-migration.yml`):

```yaml
name: Svelte Migration Analysis

on:
  pull_request:
    paths:
      - "**/*.svelte"
      - "**/*.ts"
      - "**/*.js"

jobs:
  svelte-migration:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Analyze Svelte Migration
        uses: your-org/svelte-migration-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 🔧 Repository Setup

**Important:** To enable PR comments and full functionality, you need to configure your repository permissions:

### Required GitHub Repository Settings

1. **Workflow Permissions** (Settings → Actions → General → Workflow permissions):

   - Select **"Read and write permissions"**
   - ✅ Check **"Allow GitHub Actions to create and approve pull requests"**

2. **Why these permissions are needed:**
   - **Read and write permissions**: Allows the action to post comments on pull requests
   - **Create and approve pull requests**: Enables the action to interact with PR comments and reviews

### Without these settings enabled:

- ❌ You'll see: `HttpError: Resource not accessible by integration`
- ❌ No PR comments will be created
- ✅ Analysis will still run and output results to the workflow logs

### Alternative Permission Configuration

If you prefer more granular control, you can add explicit permissions to your workflow:

```yaml
jobs:
  svelte-migration:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      # ... rest of your workflow
```

## 📋 What It Detects

The action identifies common Svelte 4 patterns that need updating:

### 🔴 Breaking Changes (Errors)

- `createEventDispatcher` usage → Use callback props
- `beforeUpdate`/`afterUpdate` lifecycle hooks → Use `$effect.pre()` and `$effect()`
- Component instantiation with `new` → Use `mount()` or `hydrate()`
- `$$props` and `$$restProps` → Use destructuring with `$props()`
- `$$slots` usage → Use snippet parameters

### ⚠️ Deprecations (Warnings)

- Reactive statements (`$:`) → Replace with `$derived` or `$effect`
- `export let` declarations → Replace with `$props()`
- `on:` event directives → Replace with event properties
- Named slots → Replace with snippets
- Store auto-subscriptions → Consider `$state` for reactive variables
- Event modifiers → Handle in event handlers directly

## ⚙️ Configuration

### Inputs

| Input                  | Description                             | Default                           | Required |
| ---------------------- | --------------------------------------- | --------------------------------- | -------- |
| `github-token`         | GitHub token for API access             | `${{ github.token }}`             | No       |
| `filter-changed-files` | Only analyze files changed in PR        | `true`                            | No       |
| `fail-on-error`        | Fail action if migration issues found   | `false`                           | No       |
| `fail-on-warning`      | Fail action if migration warnings found | `false`                           | No       |
| `paths`                | Paths to search for Svelte files        | `src\napp\nlib`                   | No       |
| `exclude-paths`        | Paths to exclude from analysis          | `node_modules\n.git\ndist\nbuild` | No       |
| `anthropic-api-key`    | Anthropic API key for AI analysis       |                                   | No       |
| `enable-ai-analysis`   | Enable AI-powered analysis              | `false`                           | No       |

### Outputs

| Output           | Description                        |
| ---------------- | ---------------------------------- |
| `issues-found`   | Number of migration issues found   |
| `warnings-found` | Number of migration warnings found |
| `files-analyzed` | Number of files analyzed           |
| `has-issues`     | Whether any issues were found      |
| `summary`        | Summary of the analysis            |

## 🎯 Advanced Configuration

### Custom Paths

```yaml
- name: Analyze Svelte Migration
  uses: your-org/svelte-migration-action@v1
  with:
    paths: |
      src/components
      src/routes
      lib
    exclude-paths: |
      node_modules
      .svelte-kit
      build
      dist
      test
```

### Strict Mode (Fail on Issues)

```yaml
- name: Analyze Svelte Migration
  uses: your-org/svelte-migration-action@v1
  with:
    fail-on-error: true
    fail-on-warning: true
```

### AI-Powered Analysis

```yaml
- name: Analyze Svelte Migration
  uses: your-org/svelte-migration-action@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    enable-ai-analysis: true
```

## 🤖 AI Analysis Setup

For enhanced migration suggestions powered by Claude 4:

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to your repository secrets as `ANTHROPIC_API_KEY`
3. Enable AI analysis in your workflow:

```yaml
with:
  anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
  enable-ai-analysis: true
```

The AI will provide:

- Detailed code transformation examples
- Context-aware migration suggestions
- Best practices for Svelte 5 patterns
- Performance optimization tips

## 📊 Example Output

When the action runs, it will:

1. **Analyze your Svelte files** for migration patterns
2. **Generate a detailed report** with line-by-line findings
3. **Post a PR comment** with actionable recommendations

### Sample PR Comment:

```markdown
# 🔄 Svelte Migration Analysis Results

## 📊 Summary

- **Files analyzed:** 15
- **Issues found:** 3
- **Warnings found:** 8

## ❌ Issues (3)

These are breaking changes that must be addressed for Svelte 5:

<details>
<summary>📄 <code>src/components/Modal.svelte</code> - 1 issue</summary>

- **Line 15:** createEventDispatcher is deprecated in Svelte 5
  - 💡 **Suggestion:** Use callback props instead of createEventDispatcher

</details>

<details>
<summary>📄 <code>src/routes/+page.svelte</code> - 2 issues</summary>

- **Line 23:** beforeUpdate/afterUpdate are deprecated in Svelte 5
  - 💡 **Suggestion:** Use $effect.pre() and $effect() instead
- **Line 30:** $$props and $$restProps are deprecated
  - 💡 **Suggestion:** Use destructuring with rest in $props(): let { foo, ...rest } = $props()

</details>

## ⚠️ Warnings (8)

These patterns will still work but are deprecated in Svelte 5:

<details>
<summary>📄 <code>src/components/Button.svelte</code> - 5 warnings</summary>

- **Line 5:** export let should be replaced with $props()
  - 💡 **Suggestion:** Replace with: let { propName } = $props()
- **Line 10:** Reactive statement ($:) should be replaced with $derived or $effect
  - 💡 **Suggestion:** Use $derived for computed values or $effect for side effects
- **Line 22:** on: event directives should be replaced with event properties
  - 💡 **Suggestion:** Replace on:click with onclick

</details>

<details>
<summary>📄 <code>src/components/Input.svelte</code> - 3 warnings</summary>

- **Line 8:** export let should be replaced with $props()
  - 💡 **Suggestion:** Replace with: let { propName } = $props()
- **Line 15:** Named slots should be replaced with snippets
  - 💡 **Suggestion:** Use {#snippet name()} and {@render name()} instead

</details>

## 📚 Migration Resources

- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Automatic Migration Tool](https://svelte.dev/docs/svelte/v5-migration-guide#migration-script): `npx sv migrate svelte-5`
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
```

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/svelte-migration-action.git
cd svelte-migration-action

# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run build

# Package for distribution
npm run package
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [svelte-check-action](https://github.com/ghostdevv/svelte-check-action)
- Built with love for the Svelte community

## 🔗 Related Projects

- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [svelte-check](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check)
- [Svelte Language Tools](https://github.com/sveltejs/language-tools)

---

**Made with ❤️ for the Svelte community**

_Help teams migrate to Svelte 5 with confidence!_ 🚀
