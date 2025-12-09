/**
 * Desidia v2 - AI Store
 * 
 * Manages AI-powered features state and interactions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as aiApi from '@/api/ai.api'

export const useAIStore = defineStore('ai', () => {
  // ================================
  // State
  // ================================
  const isGenerating = ref(false)
  const lastResult = ref(null)
  const error = ref(null)
  const history = ref([])
  const tokensUsed = ref(0)

  // ================================
  // Getters
  // ================================
  const hasResult = computed(() => !!lastResult.value)

  const historyCount = computed(() => history.value.length)

  const recentHistory = computed(() => history.value.slice(0, 10))

  // ================================
  // Actions
  // ================================

  /**
   * Generate task description from title
   * @param {Object} params
   * @param {string} params.title
   * @param {string} [params.projectContext]
   * @param {string} [params.tone]
   */
  async function generateDescription(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.generateTaskDescription(params)
      lastResult.value = result.text
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'generate_description',
        input: params,
        output: result.text,
        tokens: result.tokens
      })

      return result.text
    } catch (err) {
      error.value = err.message || 'Failed to generate description'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Rewrite content
   * @param {Object} params
   * @param {string} params.content
   * @param {string} [params.style]
   */
  async function rewrite(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.rewriteContent(params)
      lastResult.value = result.text
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'rewrite',
        input: params,
        output: result.text,
        tokens: result.tokens
      })

      return result.text
    } catch (err) {
      error.value = err.message || 'Failed to rewrite content'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Summarize content
   * @param {Object} params
   * @param {string} params.content
   * @param {number} [params.maxLength]
   */
  async function summarize(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.summarizeContent(params)
      lastResult.value = result.text
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'summarize',
        input: params,
        output: result.text,
        tokens: result.tokens
      })

      return result.text
    } catch (err) {
      error.value = err.message || 'Failed to summarize content'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Suggest subtasks
   * @param {Object} params
   * @param {string} params.title
   * @param {string} [params.description]
   * @param {number} [params.count]
   */
  async function suggestSubtasks(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.suggestSubtasks(params)
      lastResult.value = result.suggestions
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'suggest_subtasks',
        input: params,
        output: result.suggestions,
        tokens: result.tokens
      })

      return result.suggestions
    } catch (err) {
      error.value = err.message || 'Failed to suggest subtasks'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Improve content clarity
   * @param {Object} params
   * @param {string} params.content
   */
  async function improveClarity(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.improveClarity(params)
      lastResult.value = result.text
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'improve_clarity',
        input: params,
        output: result.text,
        tokens: result.tokens
      })

      return result.text
    } catch (err) {
      error.value = err.message || 'Failed to improve clarity'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Extract tasks from text
   * @param {Object} params
   * @param {string} params.text
   */
  async function extractTasks(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.extractTasksFromText(params)
      lastResult.value = result.tasks
      tokensUsed.value += result.tokens

      addToHistory({
        type: 'extract_tasks',
        input: params,
        output: result.tasks,
        tokens: result.tokens
      })

      return result.tasks
    } catch (err) {
      error.value = err.message || 'Failed to extract tasks'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Smart autocomplete
   * @param {Object} params
   * @param {string} params.prefix
   * @param {string} [params.context]
   */
  async function getAutocompleteSuggestions(params) {
    isGenerating.value = true
    error.value = null

    try {
      const result = await aiApi.autocomplete(params)
      lastResult.value = result.suggestions
      tokensUsed.value += result.tokens

      return result.suggestions
    } catch (err) {
      error.value = err.message || 'Failed to get suggestions'
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  // ================================
  // Helper Actions
  // ================================

  function addToHistory(entry) {
    history.value.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    })

    // Keep only last 50 entries
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }
  }

  function clearLastResult() {
    lastResult.value = null
  }

  function clearError() {
    error.value = null
  }

  function clearHistory() {
    history.value = []
  }

  function clearState() {
    isGenerating.value = false
    lastResult.value = null
    error.value = null
    history.value = []
    tokensUsed.value = 0
  }

  return {
    // State
    isGenerating,
    lastResult,
    error,
    history,
    tokensUsed,

    // Getters
    hasResult,
    historyCount,
    recentHistory,

    // Actions
    generateDescription,
    rewrite,
    summarize,
    suggestSubtasks,
    improveClarity,
    extractTasks,
    getAutocompleteSuggestions,
    clearLastResult,
    clearError,
    clearHistory,
    clearState
  }
})

