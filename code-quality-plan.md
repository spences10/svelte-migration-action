# Svelte Migration Action - Code Quality Enhancement Plan

## Overview

This plan outlines the enhancement of the existing Svelte Migration Action to include code quality analysis alongside the current Svelte 4 → 5 migration detection. The implementation will split the current Anthropic service into two specialized services and add AI-powered code quality reasoning.

## 🎯 Goals

1. **Split Anthropic Service**: Separate migration analysis from code quality analysis
2. **Add Code Quality Checks**: Detect missing tests, code structure issues, and best practices
3. **Maintain Backwards Compatibility**: Existing functionality should continue to work unchanged
4. **Use Latest AI Model**: Upgrade to Claude 3.5 Sonnet for better Svelte 5 analysis
5. **Leverage Web Search**: Get latest Svelte testing best practices from svelte.dev

## 📋 Implementation Plan

### Phase 1: Service Architecture Refactoring

#### 1.1 Split Anthropic Service
- **Create `svelte-migration-service.ts`**:
  - Focused on Svelte 4 → 5 migration patterns
  - Upgrade to Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
  - Optimize prompts for migration-specific analysis
  - Keep existing migration patterns and suggestions

- **Create `code-quality-service.ts`**:
  - New service for code quality analysis
  - Use Claude 3.5 Sonnet for reasoning about code quality
  - Integrate web search for latest testing best practices
  - Focus on test coverage, code structure, and Svelte best practices

#### 1.2 Update Current Service
- Refactor `anthropic-service.ts` to use the new `svelte-migration-service.ts`
- Maintain API compatibility for existing functionality
- Remove linter errors (fix console references, add proper typing)

### Phase 2: Code Quality Analysis Features

#### 2.1 Test Coverage Analysis
**Missing Test Detection**:
- Detect new `.svelte` files without corresponding test files
- Common test file patterns to check:
  - `{component}.test.ts`
  - `{component}.spec.ts` 
  - `{component}.test.js`
  - `__tests__/{component}.test.ts`
  - Tests in adjacent `test/` or `tests/` directories

**Test Type Recommendations**:
- **Client-side testing**: Components with user interactions, DOM manipulation
- **SSR testing**: Components with server-side logic, data fetching
- **Unit testing**: Pure functions, utilities, business logic
- **Integration testing**: Complex component interactions

#### 2.2 Code Structure Quality
**Component Complexity**:
- Large components (>200 lines) that should be split
- Components with too many props (>10 props)
- Components with complex nested logic

**TypeScript Usage**:
- Missing TypeScript interfaces for props
- Any types that should be properly typed
- Missing JSDoc comments for complex components

**Accessibility Concerns**:
- Missing ARIA labels
- Improper heading hierarchy
- Missing alt text for images
- Color contrast issues (basic detection)

#### 2.3 Svelte Best Practices
**Modern Svelte 5 Patterns**:
- Proper use of runes (`$state`, `$derived`, `$effect`)
- Component composition over inheritance
- Store usage best practices
- Performance optimization opportunities

### Phase 3: Web Search Integration

#### 3.1 Testing Best Practices Lookup
- Search svelte.dev for current testing recommendations
- Query for Vitest + Svelte 5 best practices
- Look up @testing-library/svelte documentation
- Find component testing patterns and examples

#### 3.2 Knowledge Base Updates
- Cache search results to avoid repeated API calls
- Update prompts with latest Svelte testing patterns
- Include current testing tools and libraries

### Phase 4: Configuration & Inputs

#### 4.1 New Action Inputs
```yaml
# Code Quality Analysis
enable-code-quality-analysis:
  description: 'Enable AI-powered code quality analysis'
  required: false
  default: 'false'

code-quality-checks:
  description: 'Types of quality checks to perform (tests,structure,accessibility,performance)'
  required: false
  default: 'tests,structure'

test-file-patterns:
  description: 'Patterns to look for test files (one per line)'
  required: false
  default: |
    **/*.test.{ts,js}
    **/*.spec.{ts,js}
    **/__tests__/**/*.{ts,js}

min-test-coverage-threshold:
  description: 'Minimum percentage of components that should have tests'
  required: false
  default: '80'

complexity-threshold:
  description: 'Maximum lines of code before suggesting component split'
  required: false
  default: '200'
```

#### 4.2 New Outputs
```yaml
# Code Quality Outputs
quality-issues-found:
  description: 'Number of code quality issues found'

quality-score:
  description: 'Overall quality score (0-100)'

missing-tests-count:
  description: 'Number of components without tests'

components-needing-refactor:
  description: 'Number of components that should be refactored'
```

### Phase 5: Analysis Integration

#### 5.1 Analyser Updates
**Extend `SvelteMigrationAnalyser`**:
- Add optional code quality analysis
- New method: `analyzeCodeQuality(files: string[]): Promise<QualityResult[]>`
- Integrate both migration and quality results

**New Interfaces**:
```typescript
interface QualityIssue {
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  severity: 'info' | 'warning' | 'error';
  category: 'testing' | 'structure' | 'accessibility' | 'performance' | 'typescript';
  rule: string;
}

interface QualityResult {
  file: string;
  qualityIssues: QualityIssue[];
  qualityScore: number; // 0-100
  hasTests: boolean;
  testFiles: string[];
  complexity: {
    linesOfCode: number;
    cyclomaticComplexity?: number;
    propsCount: number;
  };
  aiSuggestions?: string[];
}
```

#### 5.2 File System Analysis
**Test File Detection**:
- Scan for test files matching patterns
- Map components to their test files
- Identify untested components

**Component Analysis**:
- Parse `.svelte` files for complexity metrics
- Extract prop definitions and types
- Analyze component structure and patterns

### Phase 6: AI Prompt Engineering

#### 6.1 Migration Service Prompts
```typescript
const MIGRATION_PROMPT = `You are an expert Svelte developer specializing in Svelte 4 to 5 migration.

Analyze this component for migration issues and provide specific, actionable suggestions.

Focus on:
- Runes migration ($state, $derived, $effect)
- Component API changes
- Lifecycle hook updates
- Store pattern modernization
- Event handling changes

Provide concrete code examples with before/after comparisons.`;
```

#### 6.2 Code Quality Prompts
```typescript
const QUALITY_PROMPT = `You are a Svelte 5 code quality expert with deep knowledge of testing, accessibility, and performance best practices.

Analyze this component for quality issues:

Component: {filename}
Lines of Code: {loc}
Has Tests: {hasTests}
Test Files: {testFiles}

Latest Testing Best Practices from svelte.dev:
{searchResults}

Assess:
1. Test Coverage Needs
2. Component Complexity
3. Accessibility Issues
4. Performance Opportunities
5. TypeScript Usage
6. Svelte 5 Best Practices

For missing tests, recommend:
- Client-side vs SSR testing needs
- Specific testing strategies (unit, integration, e2e)
- Testing Library patterns for this component type

Be specific about what to test and why.`;
```

### Phase 7: GitHub Integration

#### 7.1 Enhanced PR Comments
**Separate Sections**:
- Migration Issues (existing)
- Code Quality Analysis (new)
- Test Coverage Report
- Refactoring Suggestions

**Example Comment Structure**:
```markdown
# 🔄 Svelte Migration & Quality Analysis

## 📊 Summary
- **Files analyzed:** 12
- **Migration issues:** 3
- **Quality issues:** 8
- **Test coverage:** 75% (9/12 components tested)
- **Quality score:** 82/100

## ❌ Migration Issues (3)
[Existing migration issues format]

## 🔍 Code Quality Analysis

### 📝 Missing Tests (3 components)
<details>
<summary>📄 <code>src/components/UserProfile.svelte</code> - Needs client-side tests</summary>

**Recommended Testing Strategy:**
- **Test user interactions**: Form submissions, button clicks
- **Test reactive state**: Profile data updates
- **Test accessibility**: ARIA labels, keyboard navigation

**Suggested Test File:** `src/components/UserProfile.test.ts`

**Example Test Structure:**
```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile.svelte';

test('submits profile form with valid data', async () => {
  const user = userEvent.setup();
  render(UserProfile, { userData: mockUser });
  // ... test implementation
});
```
</details>

### 🏗️ Structure Improvements (2 components)
[Component complexity and refactoring suggestions]

### ♿ Accessibility Issues (3 components)
[Accessibility improvements needed]
```

## 🚀 Implementation Timeline

### Week 1: Foundation
- [ ] Split Anthropic service into migration + quality services
- [ ] Fix linter errors in existing service
- [ ] Upgrade to Claude 3.5 Sonnet
- [ ] Create basic quality analysis interfaces

### Week 2: Core Quality Analysis
- [ ] Implement test file detection logic
- [ ] Add component complexity analysis
- [ ] Create code quality service with basic prompts
- [ ] Add web search integration for testing best practices

### Week 3: Integration & Testing
- [ ] Integrate quality analysis into main workflow
- [ ] Add new action inputs and outputs
- [ ] Update summary generation for quality results
- [ ] Comprehensive testing of new features

### Week 4: Documentation & Polish
- [ ] Update README with quality analysis features
- [ ] Add example workflows
- [ ] Performance optimization
- [ ] Final testing and bug fixes

## 🧪 Testing Strategy

### Unit Tests
- Test quality analysis logic separately
- Mock web search API calls
- Test file detection algorithms
- Validate quality scoring calculations

### Integration Tests  
- Test complete analysis workflow
- Verify PR comment generation
- Test with various project structures
- Validate Claude API integration

### E2E Tests
- Test action in real GitHub workflows
- Verify quality analysis accuracy
- Test performance with large codebases
- Validate search integration reliability

## 📝 Example Usage

```yaml
name: Svelte Migration & Quality Analysis

on:
  pull_request:
    paths:
      - '**/*.svelte'
      - '**/*.ts'
      - '**/*.js'

jobs:
  svelte-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Analyze Svelte Code
        uses: spences10/svelte-migration-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          
          # Migration Analysis (existing)
          enable-ai-analysis: true
          fail-on-error: true
          
          # Code Quality Analysis (new)
          enable-code-quality-analysis: true
          code-quality-checks: 'tests,structure,accessibility'
          min-test-coverage-threshold: '80'
          complexity-threshold: '150'
```

## 🎯 Success Metrics

### Quantitative
- **Test Coverage Improvement**: Track before/after test coverage percentages
- **Quality Score Trends**: Monitor average quality scores over time
- **Issue Detection Accuracy**: Validate AI suggestions against manual review
- **Performance**: Analysis time should remain under 2 minutes for typical PRs

### Qualitative  
- **Developer Satisfaction**: Feedback on suggestion quality and actionability
- **Adoption Rate**: Usage of code quality features vs. migration-only usage
- **Issue Resolution**: How often developers act on quality suggestions

## 🔮 Future Enhancements

### Phase 8: Advanced Features (Future)
- **Performance Analysis**: Bundle size impact, rendering performance
- **Security Scanning**: XSS vulnerabilities, data sanitization
- **Dependency Analysis**: Outdated packages, security vulnerabilities
- **Design System Compliance**: Component consistency checks
- **Custom Rule Engine**: User-defined quality rules and patterns

### Phase 9: Ecosystem Integration (Future)
- **SvelteKit Integration**: Route-specific quality checks
- **Storybook Integration**: Component documentation quality
- **Playwright Integration**: E2E test recommendations
- **ESLint Integration**: Custom Svelte quality rules

This plan provides a comprehensive roadmap for enhancing the Svelte Migration Action with AI-powered code quality analysis while maintaining the existing migration functionality.
