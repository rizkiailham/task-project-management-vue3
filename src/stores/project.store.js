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
    isLoading.value = true
    error.value = null

    try {
      const project = await projectApi.getProject(projectId)
      currentProject.value = project
      return project
    } catch (err) {
      error.value = err.message || 'Failed to fetch project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Select a project as current
   * @param {string} projectId
   */
  async function selectProject(projectId) {
    let project = projects.value.find(p => p.id === projectId)
    
    if (!project) {
      project = await fetchProject(projectId)
    }
    
    currentProject.value = project
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
      const project = response.project || response
      projects.value.unshift(project)
      return project
    } catch (err) {
      error.value = err.message || 'Failed to create project'
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
      const project = await projectApi.updateProject(projectId, data)

      // Update in list
      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...project }
      }

      // Update current if same
      if (currentProject.value?.id === projectId) {
        currentProject.value = { ...currentProject.value, ...project }
      }

      return project
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
      await projectApi.deleteProject(projectId)
      projects.value = projects.value.filter(p => p.id !== projectId)

      if (currentProject.value?.id === projectId) {
        currentProject.value = null
      }
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
   * Clear project state
   */
  function clearState() {
    projects.value = []
    currentProject.value = null
    error.value = null
  }

  return {
    // State
    projects,
    currentProject,
    isLoading,
    error,
    pagination,

    // Getters
    currentProjectId,
    currentProjectName,
    projectCount,

    // Actions
    fetchProjects,
    fetchProject,
    selectProject,
    createNewProject,
    updateProject,
    deleteProject,
    addUsers,
    removeUsers,
    getProject,
    clearState
  }
})
