/**
 * Desidia v2 - Project Store
 * 
 * Manages project state within a workspace
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as projectApi from '@/api/project.api'
import { createProject, ProjectStatus } from '@/models'
import { useWorkspaceStore } from './workspace.store'

export const useProjectStore = defineStore('project', () => {
  // ================================
  // State
  // ================================
  const projects = ref([])
  const currentProject = ref(null)
  const projectMembers = ref([])
  const projectStats = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // ================================
  // Getters
  // ================================
  const currentProjectId = computed(() => currentProject.value?.id || null)

  const currentProjectName = computed(() => currentProject.value?.name || '')

  const projectCount = computed(() => projects.value.length)

  const activeProjects = computed(() => 
    projects.value.filter(p => p.status === ProjectStatus.ACTIVE)
  )

  const archivedProjects = computed(() =>
    projects.value.filter(p => p.status === ProjectStatus.ARCHIVED)
  )

  const projectsByStatus = computed(() => {
    return projects.value.reduce((acc, project) => {
      if (!acc[project.status]) {
        acc[project.status] = []
      }
      acc[project.status].push(project)
      return acc
    }, {})
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch all projects in current workspace
   * @param {Object} params - Query parameters
   */
  async function fetchProjects(params = {}) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return []

    isLoading.value = true
    error.value = null

    try {
      const data = await projectApi.getProjects(workspaceStore.currentWorkspaceId, params)
      projects.value = data.map(p => createProject(p))
      return projects.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch projects'
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
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return null

    isLoading.value = true
    error.value = null

    try {
      // Find in existing projects or fetch
      let project = projects.value.find(p => p.id === projectId)

      if (!project) {
        const data = await projectApi.getProject(workspaceStore.currentWorkspaceId, projectId)
        project = createProject(data)
      }

      currentProject.value = project

      // Fetch project members and stats in parallel
      await Promise.all([
        fetchProjectMembers(projectId),
        fetchProjectStats(projectId)
      ])

      return project
    } catch (err) {
      error.value = err.message || 'Failed to select project'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new project
   * @param {Object} data
   */
  async function createNewProject(data) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return null

    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.createProject(workspaceStore.currentWorkspaceId, data)
      const project = createProject(response)
      projects.value.push(project)
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
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return null

    isLoading.value = true
    error.value = null

    try {
      const response = await projectApi.updateProject(
        workspaceStore.currentWorkspaceId,
        projectId,
        data
      )
      const project = createProject(response)

      // Update in list
      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = project
      }

      // Update current if same
      if (currentProject.value?.id === projectId) {
        currentProject.value = project
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
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return

    isLoading.value = true
    error.value = null

    try {
      await projectApi.deleteProject(workspaceStore.currentWorkspaceId, projectId)
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
   * Archive a project
   * @param {string} projectId
   */
  async function archiveProject(projectId) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return

    try {
      const response = await projectApi.archiveProject(
        workspaceStore.currentWorkspaceId,
        projectId
      )
      const project = createProject(response)

      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = project
      }

      return project
    } catch (err) {
      error.value = err.message || 'Failed to archive project'
      throw err
    }
  }

  /**
   * Restore an archived project
   * @param {string} projectId
   */
  async function restoreProject(projectId) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return

    try {
      const response = await projectApi.restoreProject(
        workspaceStore.currentWorkspaceId,
        projectId
      )
      const project = createProject(response)

      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = project
      }

      return project
    } catch (err) {
      error.value = err.message || 'Failed to restore project'
      throw err
    }
  }

  /**
   * Fetch project members
   * @param {string} projectId
   */
  async function fetchProjectMembers(projectId) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return []

    try {
      const data = await projectApi.getProjectMembers(
        workspaceStore.currentWorkspaceId,
        projectId
      )
      projectMembers.value = data
      return data
    } catch (err) {
      error.value = err.message || 'Failed to fetch project members'
      throw err
    }
  }

  /**
   * Fetch project statistics
   * @param {string} projectId
   */
  async function fetchProjectStats(projectId) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.currentWorkspaceId) return null

    try {
      const data = await projectApi.getProjectStats(
        workspaceStore.currentWorkspaceId,
        projectId
      )
      projectStats.value = data
      return data
    } catch (err) {
      error.value = err.message || 'Failed to fetch project stats'
      throw err
    }
  }

  /**
   * Get project by ID
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
    projectMembers.value = []
    projectStats.value = null
    error.value = null
  }

  return {
    // State
    projects,
    currentProject,
    projectMembers,
    projectStats,
    isLoading,
    error,

    // Getters
    currentProjectId,
    currentProjectName,
    projectCount,
    activeProjects,
    archivedProjects,
    projectsByStatus,

    // Actions
    fetchProjects,
    selectProject,
    createNewProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,
    fetchProjectMembers,
    fetchProjectStats,
    getProject,
    clearState
  }
})

