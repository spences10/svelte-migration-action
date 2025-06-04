import Anthropic from '@anthropic-ai/sdk'
import { MigrationIssue } from './analyzer'

export class AnthropicService {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey
    })
  }

  async analyzeSvelteFile(
    filename: string, 
    content: string, 
    issues: MigrationIssue[], 
    warnings: MigrationIssue[]
  ): Promise<string[]> {
    const prompt = this.createAnalysisPrompt(filename, content, issues, warnings)

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      // Extract suggestions from Claude's response
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      return this.parseClaudeSuggestions(responseText)

    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(`Failed to analyze with Claude: ${error}`)
    }
  }

  private createAnalysisPrompt(
    filename: string, 
    content: string, 
    issues: MigrationIssue[], 
    warnings: MigrationIssue[]
  ): string {
    return `You are an expert Svelte developer specializing in migrating from Svelte 4 to Svelte 5. 

I need you to analyze this Svelte file and provide specific, actionable migration suggestions.

**File:** ${filename}

**Detected Issues:**
${issues.map(issue => `- Line ${issue.line}: ${issue.message}`).join('\n')}

**Detected Warnings:**
${warnings.map(warning => `- Line ${warning.line}: ${warning.message}`).join('\n')}

**File Content:**
\`\`\`svelte
${content}
\`\`\`

Please provide:

1. **Specific Code Examples**: For each issue/warning, show the exact "before" code and the corrected "after" code
2. **Priority Assessment**: Which issues should be addressed first and why
3. **Svelte 5 Best Practices**: Suggest modern Svelte 5 patterns that would improve this code
4. **Migration Strategy**: Step-by-step approach for migrating this file

Focus on:
- Replacing reactive statements ($:) with $derived or $effect appropriately
- Converting export let to $props()
- Updating event handlers from on: to event properties
- Replacing slots with snippets where appropriate
- Converting createEventDispatcher to callback props
- Using runes ($state, $derived, $effect) effectively

Format your response as a numbered list of actionable suggestions. Be specific about line numbers and exact code changes.`
  }

  private parseClaudeSuggestions(response: string): string[] {
    // Split Claude's response into individual suggestions
    const lines = response.split('\n').filter(line => line.trim())
    const suggestions: string[] = []
    let currentSuggestion = ''

    for (const line of lines) {
      // Look for numbered list items or bullet points
      if (/^\d+\./.test(line.trim()) || /^[-*]/.test(line.trim())) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion.trim())
        }
        currentSuggestion = line.trim()
      } else if (line.trim()) {
        currentSuggestion += ' ' + line.trim()
      }
    }

    if (currentSuggestion) {
      suggestions.push(currentSuggestion.trim())
    }

    return suggestions.filter(s => s.length > 10) // Filter out very short suggestions
  }

  async getSvelteComponentSuggestions(componentContent: string): Promise<{
    modernizedCode: string;
    migrationSteps: string[];
  }> {
    const prompt = `You are a Svelte 5 migration expert. Convert this Svelte 4 component to modern Svelte 5 syntax.

**Original Component:**
\`\`\`svelte
${componentContent}
\`\`\`

Please provide:
1. The fully modernized Svelte 5 version of this component
2. A step-by-step migration guide

Use these Svelte 5 patterns:
- $state() for reactive variables
- $derived() for computed values
- $effect() for side effects
- $props() for component props
- Event properties (onclick) instead of on:click
- Snippets instead of slots where appropriate
- Callback props instead of createEventDispatcher

Format as:
**MODERNIZED CODE:**
\`\`\`svelte
[modernized component here]
\`\`\`

**MIGRATION STEPS:**
1. [step 1]
2. [step 2]
...`

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 6000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      return this.parseModernizationResponse(responseText)

    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(`Failed to get component suggestions: ${error}`)
    }
  }

  private parseModernizationResponse(response: string): {
    modernizedCode: string;
    migrationSteps: string[];
  } {
    const modernizedCodeMatch = response.match(/\*\*MODERNIZED CODE:\*\*[\s\S]*?```svelte\n([\s\S]*?)\n```/)
    const modernizedCode = modernizedCodeMatch ? modernizedCodeMatch[1].trim() : ''

    const migrationStepsMatch = response.match(/\*\*MIGRATION STEPS:\*\*\n([\s\S]*)/)
    const migrationStepsText = migrationStepsMatch ? migrationStepsMatch[1] : ''
    
    const migrationSteps = migrationStepsText
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.trim())

    return {
      modernizedCode,
      migrationSteps
    }
  }
} 