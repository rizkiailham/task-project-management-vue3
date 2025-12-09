/**
 * Desidia v2 - Workspace Store
 * 
 * Manages workspace state, members, and workspace-level settings
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as workspaceApi from '@/api/workspace.api'
import { setWorkspaceId } from '@/api/httpClient'
import { createWorkspace, createTag } from '@/models'

export const useWorkspaceStore = defineStore('workspace', () => {
  // ================================
  // State
  // ================================
  const workspaces = ref([])
  const currentWorkspace = ref(null)
  const members = ref([])
  const tags = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // ================================
  // Getters
  // ================================
  const currentWorkspaceId = computed(() => currentWorkspace.value?.id || null)

  const currentWorkspaceName = computed(() => currentWorkspace.value?.name || '')

  const workspaceCount = computed(() => workspaces.value.length)

  const hasWorkspaces = computed(() => workspaces.value.length > 0)

  const memberCount = computed(() => members.value.length)

  const membersByRole = computed(() => {
    return members.value.reduce((acc, member) => {
      if (!acc[member.role]) {
        acc[member.role] = []
      }
      acc[member.role].push(member)
      return acc
    }, {})
  })

  const tagsByColor = computed(() => {
    return tags.value.reduce((acc, tag) => {
      if (!acc[tag.color]) {
        acc[tag.color] = []
      }
      acc[tag.color].push(tag)
      return acc
    }, {})
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch all workspaces for current user
   */
  async function fetchWorkspaces() {
    isLoading.value = true
    error.value = null

    try {
      const data = await workspaceApi.getWorkspaces()
      workspaces.value = data.map(w => createWorkspace(w))

      // Auto-select first workspace if none selected
      if (!currentWorkspace.value && workspaces.value.length > 0) {
        await selectWorkspace(workspaces.value[0].id)
      }

      return workspaces.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch workspaces'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Select a workspace as current
   * @param {string} workspaceId
   */
  async function selectWorkspace(workspaceId) {
    isLoading.value = true
    error.value = null

    try {
      // Find in existing workspaces or fetch
      let workspace = workspaces.value.find(w => w.id === workspaceId)

      if (!workspace) {
        const data = await workspaceApi.getWorkspace(workspaceId)
        workspace = createWorkspace(data)
      }

      currentWorkspace.value = workspace
      setWorkspaceId(workspaceId)
      localStorage.setItem('currentWorkspaceId', workspaceId)

      // Fetch members and tags for the workspace
      await Promise.all([
        fetchMembers(workspaceId),
        fetchTags(workspaceId)
      ])

      return workspace
    } catch (err) {
      error.value = err.message || 'Failed to select workspace'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new workspace
   * @param {Object} data
   */
  async function createNewWorkspace(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await workspaceApi.createWorkspace(data)
      const workspace = createWorkspace(response)
      workspaces.value.push(workspace)

      // Select the new workspace
      await selectWorkspace(workspace.id)

      return workspace
    } catch (err) {
      error.value = err.message || 'Failed to create workspace'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update current workspace
   * @param {Object} data
   */
  async function updateCurrentWorkspace(data) {
    if (!currentWorkspace.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await workspaceApi.updateWorkspace(currentWorkspace.value.id, data)
      const workspace = createWorkspace(response)

      // Update in list
      const index = workspaces.value.findIndex(w => w.id === workspace.id)
      if (index !== -1) {
        workspaces.value[index] = workspace
      }

      currentWorkspace.value = workspace
      return workspace
    } catch (err) {
      error.value = err.message || 'Failed to update workspace'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a workspace
   * @param {string} workspaceId
   */
  async function deleteWorkspace(workspaceId) {
    isLoading.value = true
    error.value = null

    try {
      await workspaceApi.deleteWorkspace(workspaceId)
      workspaces.value = workspaces.value.filter(w => w.id !== workspaceId)

      // Select another workspace if current was deleted
      if (currentWorkspace.value?.id === workspaceId) {
        currentWorkspace.value = null
        if (workspaces.value.length > 0) {
          await selectWorkspace(workspaces.value[0].id)
        }
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete workspace'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch workspace members
   * @param {string} workspaceId
   */
  async function fetchMembers(workspaceId) {
    try {
      const data = await workspaceApi.getWorkspaceMembers(workspaceId)
      members.value = data
      return data
    } catch (err) {
      error.value = err.message || 'Failed to fetch members'
      throw err
    }
  }

  /**
   * Invite a new member
   * @param {Object} data
   */
  async function inviteMember(data) {
    if (!currentWorkspace.value) return

    try {
      await workspaceApi.inviteMember(currentWorkspace.value.id, data)
      await fetchMembers(currentWorkspace.value.id)
    } catch (err) {
      error.value = err.message || 'Failed to invite member'
      throw err
    }
  }

  /**
   * Remove a member
   * @param {string} userId
   */
  async function removeMember(userId) {
    if (!currentWorkspace.value) return

    try {
      await workspaceApi.removeMember(currentWorkspace.value.id, userId)
      members.value = members.value.filter(m => m.userId !== userId)
    } catch (err) {
      error.value = err.message || 'Failed to remove member'
      throw err
    }
  }

  /**
   * Fetch workspace tags
   * @param {string} workspaceId
   */
  async function fetchTags(workspaceId) {
    try {
      const data = await workspaceApi.getWorkspaceTags(workspaceId)
      tags.value = data.map(t => createTag(t))
      return tags.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch tags'
      throw err
    }
  }

  /**
   * Create a new tag
   * @param {Object} data
   */
  async function createTagInWorkspace(data) {
    if (!currentWorkspace.value) return

    try {
      const response = await workspaceApi.createTag(currentWorkspace.value.id, data)
      const tag = createTag(response)
      tags.value.push(tag)
      return tag
    } catch (err) {
      error.value = err.message || 'Failed to create tag'
      throw err
    }
  }

  /**
   * Delete a tag
   * @param {string} tagId
   */
  async function deleteTagFromWorkspace(tagId) {
    if (!currentWorkspace.value) return

    try {
      await workspaceApi.deleteTag(currentWorkspace.value.id, tagId)
      tags.value = tags.value.filter(t => t.id !== tagId)
    } catch (err) {
      error.value = err.message || 'Failed to delete tag'
      throw err
    }
  }

  /**
   * Get member by user ID
   * @param {string} userId
   */
  function getMember(userId) {
    return members.value.find(m => m.userId === userId)
  }

  /**
   * Get tag by ID
   * @param {string} tagId
   */
  function getTag(tagId) {
    return tags.value.find(t => t.id === tagId)
  }

  /**
   * Clear workspace state (on logout)
   */
  function clearState() {
    workspaces.value = []
    currentWorkspace.value = null
    members.value = []
    tags.value = []
    error.value = null
    localStorage.removeItem('currentWorkspaceId')
  }

  return {
    // State
    workspaces,
    currentWorkspace,
    members,
    tags,
    isLoading,
    error,

    // Getters
    currentWorkspaceId,
    currentWorkspaceName,
    workspaceCount,
    hasWorkspaces,
    memberCount,
    membersByRole,
    tagsByColor,

    // Actions
    fetchWorkspaces,
    selectWorkspace,
    createNewWorkspace,
    updateCurrentWorkspace,
    deleteWorkspace,
    fetchMembers,
    inviteMember,
    removeMember,
    fetchTags,
    createTagInWorkspace,
    deleteTagFromWorkspace,
    getMember,
    getTag,
    clearState
  }
})

