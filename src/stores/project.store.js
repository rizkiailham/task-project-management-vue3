/**
 * Desidia v2 - Project Store
 * 
 * Manages project state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as projectApi from '@/api/project.api'

export const useProjectStore = defineStore('project', () => {
  // ================================
  // State
  // ================================
  const projects = ref([])
  const currentProject = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const projectItems = ref({}) // Map projectId -> items[]
  const currentProjectItemId = ref(null)
  const projectItemsLoaded = new Set()
  const projectItemsRequests = new Map()
  const projectRequests = new Map()

  // Pagination
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // ================================
  // Getters
  // ================================
  const currentProjectId = computed(() => currentProject.value?.id || null)

  const currentProjectName = computed(() => currentProject.value?.name || '')
  const projectCount = computed(() => projects.value.length)

  const activeProjectItemId = computed(() => {
    if (currentProjectItemId.value) return currentProjectItemId.value
    // Default to first task board if available
    const pid = currentProjectId.value
    if (pid && projectItems.value[pid]) {
      const taskBoard = projectItems.value[pid].find(i => i.type === 'task')
      if (taskBoard) return taskBoard.id
    }
    // No fallback - return null if no item is selected
    return null
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch all projects
   * @param {Object} params - Query parameters
   */
  async function fetchProjects(params = {}) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.getProjects(params)

      // Backend returns paginated response with { data, meta, links }
      if (response.data && Array.isArray(response.data)) {
        projects.value = response.data
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || 20,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        projects.value = response
      } else {
        projects.value = []
      }

      return projects.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch projects'
      console.error('Failed to fetch projects:', err)
      // Don't throw - just return empty array
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get a single project
   * @param {string} projectId
   */
  async function fetchProject(projectId) {
    if (!projectId) return null

    const key = String(projectId)
    if (currentProject.value?.id && String(currentProject.value.id) === key) {
      return currentProject.value
    }
    if (projectRequests.has(key)) {
      return projectRequests.get(key)
    }

    isLoading.value = true
    error.value = null

    const promise = (async () => {
      try {
        const project = await projectApi.getProject(projectId)
        currentProject.value = project
        return project
      } catch (err) {
        error.value = err.message || 'Failed to fetch project'
        throw err
      } finally {
        projectRequests.delete(key)
        isLoading.value = false
      }
    })()

    projectRequests.set(key, promise)
    return promise
  }

  /**
   * Fetch project items
   * @param {string} projectId
   */
  async function fetchProjectItems(projectId) {
    if (!projectId) return []

    const key = String(projectId)
    if (projectItemsLoaded.has(key)) {
      return projectItems.value[projectId] || []
    }
    if (projectItemsRequests.has(key)) {
      return projectItemsRequests.get(key)
    }

    const promise = (async () => {
      try {
        const response = await projectApi.getProjectItems(projectId)
        const items = Array.isArray(response) ? response : (response.items || response.data || [])
        projectItems.value[projectId] = items
        projectItemsLoaded.add(key)
        return items
      } catch (err) {
        console.error('Failed to fetch project items:', err)
        return [] // Don't block flow on items failure
      } finally {
        projectItemsRequests.delete(key)
      }
    })()

    projectItemsRequests.set(key, promise)
    return promise
  }

  /**
   * Select a project item
   * @param {string} itemId
   */
  function selectProjectItem(itemId) {
    currentProjectItemId.value = itemId
  }

  /**
   * Select a project as current
   * @param {string} projectId
   */
  async function selectProject(projectId) {
    // Always fetch fresh details
    const [project, itemsResponse] = await Promise.all([
      fetchProject(projectId),
      fetchProjectItems(projectId)
    ])

    // Update in list
    const index = projects.value.findIndex(p => p.id === projectId)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...project }
    }

    currentProject.value = project
    currentProjectItemId.value = null // Reset selected item so activeProjectItemId falls back to default

    return project
  }

  /**
   * Create a new project
   * @param {Object} data
   */
  async function createNewProject(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.createProject(data)
      // Backend returns { message, project }
      const project = response.project || response.data || response
      projects.value.unshift(project)
      return response
    } catch (err) {
      error.value = err.message || 'Failed to create project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Duplicate a project
   * @param {string} projectId
   */
  async function duplicateProject(projectId) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.duplicateProject(projectId)
      const project = response.project || response.data || response
      if (project) {
        projects.value.unshift(project)
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to replicate project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a project
   * @param {string} projectId
   * @param {Object} data
   */
  async function updateProject(projectId, data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.updateProject(projectId, data)
      const project = response.project || response.data || response

      // Update in list
      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...project }
      }

      // Update current if same
      if (currentProject.value?.id === projectId) {
        currentProject.value = { ...currentProject.value, ...project }
      }

      return response
    } catch (err) {
      error.value = err.message || 'Failed to update project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a project
   * @param {string} projectId
   */
  async function deleteProject(projectId) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.deleteProject(projectId)
      projects.value = projects.value.filter(p => p.id !== projectId)

      if (currentProject.value?.id === projectId) {
        currentProject.value = null
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to delete project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add users to a project
   * @param {string} projectId
   * @param {string[]} userIds
   */
  async function addUsers(projectId, userIds) {
    try {
      await projectApi.addProjectUsers(projectId, userIds)
    } catch (err) {
      error.value = err.message || 'Failed to add users'
      throw err
    }
  }

  /**
   * Remove users from a project
   * @param {string} projectId
   * @param {string[]} userIds
   */
  async function removeUsers(projectId, userIds) {
    try {
      await projectApi.removeProjectUsers(projectId, userIds)
    } catch (err) {
      error.value = err.message || 'Failed to remove users'
      throw err
    }
  }

  /**
   * Get project by ID from local state
   * @param {string} projectId
   */
  function getProject(projectId) {
    return projects.value.find(p => p.id === projectId)
  }

  /**
   * Get project items
   * @param {string} projectId
   */
  function getProjectItems(projectId) {
    const items = projectItems.value[projectId] || []
    // Return sorted copy to avoid mutating state in components
    return [...items].sort((a, b) => {
      // API uses 'index', fallback to 'order' if needed
      const orderA = a.index !== undefined ? a.index : (a.order !== undefined ? a.order : 0)
      const orderB = b.index !== undefined ? b.index : (b.order !== undefined ? b.order : 0)
      return orderA - orderB
    })
  }

  /**
   * Clear project state
   */
  function clearState() {
    projects.value = []
    currentProject.value = null
    currentProjectItemId.value = null
    projectItems.value = {}
    error.value = null
    projectItemsLoaded.clear()
    projectItemsRequests.clear()
    projectRequests.clear()
  }

  /**
   * Create a project item
   * @param {string} projectId
   * @param {Object} data
   */
  async function createProjectItem(projectId, data) {
    try {
      const response = await projectApi.createProjectItem(projectId, data)
      const newItem = response.item || response.data || response

      // Update local state
      if (!projectItems.value[projectId]) {
        projectItems.value[projectId] = []
      }
      projectItems.value[projectId].push(newItem)
      projectItemsLoaded.add(String(projectId))

      return response
    } catch (err) {
      console.error('Failed to create project item:', err)
      throw err
    }
  }

  /**
   * Update a project item
   * @param {string} projectId
   * @param {string} itemId
   * @param {Object} data
   */
  async function updateProjectItem(projectId, itemId, data) {
    try {
      const response = await projectApi.updateProjectItem(projectId, itemId, data)

      // Update local state
      if (projectItems.value[projectId]) {
        const index = projectItems.value[projectId].findIndex(i => i.id === itemId)
        if (index !== -1) {
          projectItems.value[projectId][index] = { ...projectItems.value[projectId][index], ...data }
        }
      }
      return response
    } catch (err) {
      console.error('Failed to update project item:', err)
      throw err
    }
  }

  /**
   * Delete a project item
   * @param {string} projectId
   * @param {string} itemId
   */
  async function deleteProjectItem(projectId, itemId) {
    try {
      const response = await projectApi.deleteProjectItem(projectId, itemId)

      // Update local state
      if (projectItems.value[projectId]) {
        projectItems.value[projectId] = projectItems.value[projectId].filter(i => i.id !== itemId)
      }

      // If deleted item was active, switch to another
      if (currentProjectItemId.value === itemId) {
        currentProjectItemId.value = null
      }

      return response
    } catch (err) {
      console.error('Failed to delete project item:', err)
      throw err
    }
  }

  /**
   * Reorder project items
   * @param {string} projectId
   * @param {string[]} itemIds
   */
  async function reorderProjectItems(projectId, itemIds) {
    try {
      // Optimistic update
      if (projectItems.value[projectId]) {
        const currentItems = projectItems.value[projectId]
        const newItemOrder = []
        itemIds.forEach(id => {
          const item = currentItems.find(i => i.id === id)
          if (item) newItemOrder.push(item)
        })
        projectItems.value[projectId] = newItemOrder
      }

      await projectApi.reorderProjectItems(projectId, itemIds)
    } catch (err) {
      console.error('Failed to reorder project items:', err)
      // Revert would be nice here, but maybe just refetch
      fetchProjectItems(projectId)
      throw err
    }
  }



  function hasProjectItemsLoaded(projectId) {
    if (!projectId) return false
    return projectItemsLoaded.has(String(projectId))
  }

  function updateLocalItemsOrder(projectId, orderedIds) {
    const items = projectItems.value[projectId]
    if (!items) return

    const itemMap = new Map(items.map(i => [i.id, i]))
    const reorderedItems = []
    const processedIds = new Set()

    orderedIds.forEach((id, index) => {
      const item = itemMap.get(id)
      if (item) {
        reorderedItems.push({ ...item, index: index + 1, order: index + 1 })
        processedIds.add(id)
      }
    })

    items.forEach(item => {
      if (!processedIds.has(item.id)) {
        reorderedItems.push(item)
      }
    })

    projectItems.value[projectId] = reorderedItems
  }

  return {
    // State
    projects,
    currentProject,
    isLoading,
    error,
    projectItems,
    currentProjectItemId,

    // Getters
    currentProjectId,
    currentProjectName,
    projectCount,
    activeProjectItemId,

    // Actions
    fetchProjects,
    fetchProject,
    fetchProjectItems,
    selectProject,
    selectProjectItem,
    createProject: createNewProject, // Renamed for external use
    createNewProject, // Also export with original name for backward compatibility
    duplicateProject,
    updateProject,
    deleteProject,
    addUsers,
    removeUsers,
    getProject,
    clearState,
    hasProjectItemsLoaded,

    // Item Actions
    createProjectItem,
    updateProjectItem,
    deleteProjectItem,
    reorderProjectItems,
    getProjectItems,
    updateLocalItemsOrder
  }
})
