/**
 * Desidia v2 - Project Property Store
 *
 * Manages dynamic project property definitions (status, priority, assignee, due_date, custom).
 * Properties are per-project and define what fields/columns are available for tasks.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as propertyApi from '@/api/projectProperty.api'

export const useProjectPropertyStore = defineStore('projectProperty', () => {
  // ================================
  // State
  // ================================

  /** Map<projectId, property[]> */
  const propertiesByProject = ref({})
  const isLoading = ref(false)

  // ================================
  // Getters
  // ================================

  /**
   * Get properties for a specific project
   * @param {string} projectId
   * @returns {Object[]}
   */
  function propertiesForProject(projectId) {
    return propertiesByProject.value[projectId] || []
  }

  /**
   * Get system properties for a project (status, priority, assignee, due_date)
   * @param {string} projectId
   * @returns {Object[]}
   */
  function systemProperties(projectId) {
    return propertiesForProject(projectId).filter(p => p.isSystem)
  }

  /**
   * Get custom (non-system) properties for a project
   * @param {string} projectId
   * @returns {Object[]}
   */
  function customProperties(projectId) {
    return propertiesForProject(projectId).filter(p => !p.isSystem)
  }

  /**
   * Get a specific property by key for a project
   * @param {string} projectId
   * @param {string} key - e.g. 'status', 'priority', 'assignee', 'due_date'
   * @returns {Object|undefined}
   */
  function getPropertyByKey(projectId, key) {
    return propertiesForProject(projectId).find(p => p.key === key)
  }

  /**
   * Get status property with options for a project
   * @param {string} projectId
   * @returns {Object|undefined}
   */
  function statusProperty(projectId) {
    return getPropertyByKey(projectId, 'status')
  }

  /**
   * Get status options (from settings.options) for a project
   * @param {string} projectId
   * @returns {Object[]}
   */
  function statusOptions(projectId) {
    const prop = statusProperty(projectId)
    const raw = prop?.settings?.options || []
    return raw.map(opt => typeof opt === 'string' ? { value: opt } : opt)
  }

  /**
   * Get priority property with options for a project
   * @param {string} projectId
   * @returns {Object|undefined}
   */
  function priorityProperty(projectId) {
    return getPropertyByKey(projectId, 'priority')
  }

  /**
   * Get priority options for a project
   * @param {string} projectId
   * @returns {Object[]}
   */
  function priorityOptions(projectId) {
    const prop = priorityProperty(projectId)
    const raw = prop?.settings?.options || []
    return raw.map(opt => typeof opt === 'string' ? { value: opt } : opt)
  }

  /**
   * Get visible properties (for task detail / grid columns)
   * @param {string} projectId
   * @returns {Object[]}
   */
  function visibleProperties(projectId) {
    return propertiesForProject(projectId).filter(p => p.isVisible !== false)
  }

  // ================================
  // Actions
  // ================================

  const fetchPromises = new Map()

  /**
   * Fetch all properties for a project
   * @param {string} projectId
   * @param {Object} [options]
   * @param {boolean} [options.force=false] - Force refetch even if cached
   */
  async function fetchProperties(projectId, { force = false } = {}) {
    if (!projectId) return

    // Skip if already loaded and not forced
    if (!force && propertiesByProject.value[projectId]?.length) return

    // Deduplicate active fetches
    if (!force && fetchPromises.has(projectId)) {
      return fetchPromises.get(projectId)
    }

    const promise = (async () => {
      isLoading.value = true
      try {
        const response = await propertyApi.getProjectProperties({ projectId })
        // Handle response — API may return { data: [...] } or just [...]
        const list = response?.data || response || []
        const sorted = Array.isArray(list)
          ? [...list].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          : []
        propertiesByProject.value[projectId] = sorted
      } catch (error) {
        console.error('[ProjectPropertyStore] Failed to fetch properties:', error)
        throw error
      } finally {
        isLoading.value = false
        fetchPromises.delete(projectId)
      }
    })()

    fetchPromises.set(projectId, promise)
    return promise
  }

  /**
   * Create a new property
   * @param {Object} data - Property data (must include projectId)
   * @returns {Promise<Object>} Created property
   */
  async function createProperty(data) {
    const response = await propertyApi.createProjectProperty(data)
    const property = response?.data || response?.property || response
    if (property && data.projectId) {
      const list = propertiesByProject.value[data.projectId] || []
      propertiesByProject.value[data.projectId] = [...list, property]
    }
    return property
  }

  /**
   * Update a property
   * @param {string} id - Property ID
   * @param {Object} data - Fields to update
   * @param {string} projectId - Project ID for local state update
   * @returns {Promise<Object>} Updated property
   */
  async function updateProperty(id, data, projectId) {
    const response = await propertyApi.updateProjectProperty(id, data)
    const updated = response?.data || response?.property || response

    if (updated && projectId) {
      const list = propertiesByProject.value[projectId] || []
      const idx = list.findIndex(p => p.id === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updated }
        propertiesByProject.value[projectId] = [...list]
      }
    }
    return updated
  }

  /**
   * Delete a property
   * @param {string} id - Property ID
   * @param {string} projectId - Project ID for local state update
   */
  async function deleteProperty(id, projectId) {
    await propertyApi.deleteProjectProperty(id)
    if (projectId) {
      const list = propertiesByProject.value[projectId] || []
      propertiesByProject.value[projectId] = list.filter(p => p.id !== id)
    }
  }

  /**
   * Reorder properties
   * @param {string} projectId
   * @param {string[]} propertyIds - Ordered array of property IDs
   */
  async function reorderProperties(projectId, propertyIds) {
    await propertyApi.reorderProjectProperties({ projectId, propertyIds })
    // Re-index locally
    const list = propertiesByProject.value[projectId] || []
    const ordered = propertyIds
      .map((id, idx) => {
        const prop = list.find(p => p.id === id)
        return prop ? { ...prop, index: idx + 1 } : null
      })
      .filter(Boolean)
    propertiesByProject.value[projectId] = ordered
  }

  /**
   * Clear properties for a project (e.g. when switching projects)
   * @param {string} [projectId] - If provided, clear only that project's properties
   */
  function clearProperties(projectId) {
    if (projectId) {
      delete propertiesByProject.value[projectId]
    } else {
      propertiesByProject.value = {}
    }
  }

  return {
    // State
    propertiesByProject,
    isLoading,

    // Getters
    propertiesForProject,
    systemProperties,
    customProperties,
    getPropertyByKey,
    statusProperty,
    statusOptions,
    priorityProperty,
    priorityOptions,
    visibleProperties,

    // Actions
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
    clearProperties
  }
})
