/**
 * Desidia v2 - AI API (novel.sh integration)
 * 
 * This module handles AI-powered features for the task management app.
 * It integrates with novel.sh or a compatible AI API for content generation.
 * 
 * TODO: Adjust endpoints when real novel.sh API is available
 */

import { post } from './httpClient'

// AI API Base URL - can be different from main API
const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || '/api/ai'

/**
 * AI feature types
 * @readonly
 * @enum {string}
 */
export const AIFeatureType = {
  GENERATE_DESCRIPTION: 'generate_description',
  REWRITE_CONTENT: 'rewrite_content',
  SUMMARIZE: 'summarize',
  SUGGEST_TASKS: 'suggest_tasks',
  IMPROVE_CLARITY: 'improve_clarity',
  TRANSLATE: 'translate',
  EXTRACT_TASKS: 'extract_tasks'
}

/**
 * Generate task description from a short title
 * @param {Object} params
 * @param {string} params.title - Task title
 * @param {string} [params.projectContext] - Optional project description for context
 * @param {string} [params.tone] - Optional tone (formal, casual, technical)
 * @returns {Promise<{text: string, tokens: number}>}
 */
export async function generateTaskDescription({ title, projectContext = '', tone = 'professional' }) {
  const prompt = buildPrompt('generate_description', {
    title,
    projectContext,
    tone
  })

  return callAI(prompt)
}

/**
 * Rewrite content to be clearer or more formal
 * @param {Object} params
 * @param {string} params.content - Original content
 * @param {string} [params.style] - Target style (formal, casual, concise, detailed)
 * @returns {Promise<{text: string, tokens: number}>}
 */
export async function rewriteContent({ content, style = 'formal' }) {
  const prompt = buildPrompt('rewrite', {
    content,
    style
  })

  return callAI(prompt)
}

/**
 * Summarize long content (task description, comments, etc.)
 * @param {Object} params
 * @param {string} params.content - Content to summarize
 * @param {number} [params.maxLength] - Maximum summary length in words
 * @returns {Promise<{text: string, tokens: number}>}
 */
export async function summarizeContent({ content, maxLength = 100 }) {
  const prompt = buildPrompt('summarize', {
    content,
    maxLength
  })

  return callAI(prompt)
}

/**
 * Suggest subtasks based on task title and description
 * @param {Object} params
 * @param {string} params.title - Task title
 * @param {string} [params.description] - Task description
 * @param {number} [params.count] - Number of subtasks to suggest
 * @returns {Promise<{suggestions: string[], tokens: number}>}
 */
export async function suggestSubtasks({ title, description = '', count = 5 }) {
  const prompt = buildPrompt('suggest_subtasks', {
    title,
    description,
    count
  })

  const response = await callAI(prompt)

  // Parse the response into an array of suggestions
  try {
    const suggestions = response.text
      .split('\n')
      .map(line => line.replace(/^[\d\-\.\)]+\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, count)

    return {
      suggestions,
      tokens: response.tokens
    }
  } catch {
    return {
      suggestions: [response.text],
      tokens: response.tokens
    }
  }
}

/**
 * Improve clarity of content
 * @param {Object} params
 * @param {string} params.content - Content to improve
 * @returns {Promise<{text: string, tokens: number}>}
 */
export async function improveClarity({ content }) {
  const prompt = buildPrompt('improve_clarity', { content })
  return callAI(prompt)
}

/**
 * Extract tasks from unstructured text (e.g., meeting notes)
 * @param {Object} params
 * @param {string} params.text - Unstructured text
 * @returns {Promise<{tasks: Array<{title: string, description: string}>, tokens: number}>}
 */
export async function extractTasksFromText({ text }) {
  const prompt = buildPrompt('extract_tasks', { text })
  const response = await callAI(prompt)

  // Parse the response into task objects
  try {
    const lines = response.text.split('\n').filter(line => line.trim())
    const tasks = lines.map(line => {
      const [title, ...descParts] = line.split(':')
      return {
        title: title.replace(/^[\d\-\.\)]+\s*/, '').trim(),
        description: descParts.join(':').trim()
      }
    })

    return {
      tasks,
      tokens: response.tokens
    }
  } catch {
    return {
      tasks: [],
      tokens: response.tokens
    }
  }
}

/**
 * Smart autocomplete for task title/description
 * @param {Object} params
 * @param {string} params.prefix - Text typed so far
 * @param {string} [params.context] - Additional context
 * @returns {Promise<{suggestions: string[], tokens: number}>}
 */
export async function autocomplete({ prefix, context = '' }) {
  const prompt = buildPrompt('autocomplete', { prefix, context })
  const response = await callAI(prompt)

  try {
    const suggestions = response.text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 5)

    return {
      suggestions,
      tokens: response.tokens
    }
  } catch {
    return {
      suggestions: [],
      tokens: response.tokens
    }
  }
}

// ================================
// Helper Functions
// ================================

/**
 * Build prompt based on feature type
 * @param {string} type - Feature type
 * @param {Object} params - Parameters for the prompt
 * @returns {string}
 */
function buildPrompt(type, params) {
  const prompts = {
    generate_description: `Generate a detailed task description for a task management app.
Task Title: "${params.title}"
${params.projectContext ? `Project Context: ${params.projectContext}` : ''}
Tone: ${params.tone}

Please provide a clear, actionable description that includes:
- What needs to be done
- Any key considerations
- Expected outcomes

Keep it concise but comprehensive.`,

    rewrite: `Rewrite the following content in a ${params.style} style while maintaining the original meaning:

"${params.content}"

Provide only the rewritten text without any explanations.`,

    summarize: `Summarize the following content in ${params.maxLength} words or less:

"${params.content}"

Provide only the summary without any additional commentary.`,

    suggest_subtasks: `Given the following task, suggest ${params.count} specific, actionable subtasks:

Task Title: "${params.title}"
${params.description ? `Description: ${params.description}` : ''}

List each subtask on a new line, numbered. Be specific and actionable.`,

    improve_clarity: `Improve the clarity and readability of the following text while keeping its meaning:

"${params.content}"

Provide only the improved text.`,

    extract_tasks: `Extract actionable tasks from the following text. For each task, provide a title and brief description:

"${params.text}"

Format each task on a new line as: Task Title: Description`,

    autocomplete: `Complete the following task-related text with ${params.context ? `context: ${params.context}` : 'natural continuation'}:

"${params.prefix}"

Provide 3 possible completions, each on a new line.`
  }

  return prompts[type] || params.content
}

/**
 * Call the AI API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<{text: string, tokens: number}>}
 */
async function callAI(prompt) {
  try {
    // TODO: Adjust when real novel.sh API is available
    const response = await post(`${AI_API_BASE_URL}/generate`, {
      prompt,
      max_tokens: 500,
      temperature: 0.7
    })

    return {
      text: response.text || response.content || response.result || '',
      tokens: response.usage?.total_tokens || response.tokens || 0
    }
  } catch (error) {
    // In development/demo mode, return mock responses
    if (import.meta.env.DEV || import.meta.env.VITE_AI_MOCK_MODE === 'true') {
      return getMockResponse(prompt)
    }
    throw error
  }
}

/**
 * Get mock AI response for development/demo
 * @param {string} prompt
 * @returns {{text: string, tokens: number}}
 */
function getMockResponse(prompt) {
  const mockResponses = {
    generate_description: `This task involves implementing the requested feature with attention to code quality and user experience. 

Key deliverables:
- Research and plan the implementation approach
- Write clean, maintainable code
- Add appropriate tests
- Document the changes

Please ensure to follow the project's coding standards and submit for code review when complete.`,

    rewrite: 'This is a professionally rewritten version of your content with improved clarity and structure.',

    summarize: 'This is a concise summary capturing the main points of the original content.',

    suggest_subtasks: `1. Research and gather requirements
2. Create initial design/mockup
3. Implement core functionality
4. Write unit tests
5. Review and refine`,

    improve_clarity: 'This is an improved version with better clarity and readability.',

    extract_tasks: `Task 1: Review project requirements
Task 2: Create implementation plan
Task 3: Complete development work`,

    autocomplete: `Complete the user authentication flow
Create a responsive dashboard layout
Implement data validation`
  }

  // Detect prompt type from content
  let responseType = 'generate_description'
  if (prompt.includes('Rewrite')) responseType = 'rewrite'
  else if (prompt.includes('Summarize')) responseType = 'summarize'
  else if (prompt.includes('subtasks')) responseType = 'suggest_subtasks'
  else if (prompt.includes('clarity')) responseType = 'improve_clarity'
  else if (prompt.includes('Extract')) responseType = 'extract_tasks'
  else if (prompt.includes('Complete')) responseType = 'autocomplete'

  return {
    text: mockResponses[responseType],
    tokens: Math.floor(Math.random() * 100) + 50
  }
}

export default {
  generateTaskDescription,
  rewriteContent,
  summarizeContent,
  suggestSubtasks,
  improveClarity,
  extractTasksFromText,
  autocomplete,
  AIFeatureType
}

