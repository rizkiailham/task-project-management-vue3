/**
 * Desidia v2 - User Store (Backend-Integrated)
 * 
 * Manages user data via real backend API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as userApi from '@/api/user.api'
import * as roleApi from '@/api/role.api'
import * as groupApi from '@/api/group.api'
import * as customFieldApi from '@/api/customField.api'

export const useUserStore = defineStore('user', () => {
  // ================================
  // State
  // ================================
  const users = ref([])
  const selectedUser = ref(null)
  const isLoading = ref(false)

  // Pagination state
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Available options (fetched from backend)
  const availableRoles = ref([])
  const availableGroups = ref([])
  const availableProjects = ref([])
  const customFieldDefinitions = ref([])

  // Static language options
  const availableLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Chinese',
    'Japanese',
    'Portuguese',
    'Russian'
  ]

  // ================================
  // Getters
  // ================================
  const totalUsers = computed(() => pagination.value.total)

  const activeUsers = computed(() =>
    users.value.filter(u => u.isActive).length
  )

  const invitedUsers = computed(() =>
    users.value.filter(u => !u.isActive).length
  )

  const inactiveUsers = computed(() =>
    users.value.filter(u => !u.isActive).length
  )

  // ================================
  // Actions
  // ================================

  async function fetchUsers(params = {}) {
    isLoading.value = true
    try {
      const queryParams = {
        page: params.page || pagination.value.page,
        limit: params.limit || pagination.value.limit,
        ...params
      }

      const response = await userApi.getUsers(queryParams)

      // Handle nestjs-paginate response format
      if (response.data) {
        users.value = response.data
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || 20,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else {
        users.value = response
      }

      return users.value
    } finally {
      isLoading.value = false
    }
  }

  async function fetchUser(id) {
    isLoading.value = true
    try {
      const user = await userApi.getUser(id)
      return user
    } finally {
      isLoading.value = false
    }
  }

  async function createUser(userData) {
    isLoading.value = true
    try {
      const response = await userApi.createUser(userData)
      const newUser = response.user || response
      users.value.unshift(newUser)
      return newUser
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(userId, userData) {
    isLoading.value = true
    try {
      const response = await userApi.updateUser(userId, userData)
      const updatedUser = response.user || response

      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updatedUser }
      }
      return updatedUser
    } finally {
      isLoading.value = false
    }
  }

  async function deleteUser(userId) {
    isLoading.value = true
    try {
      await userApi.deleteUser(userId)
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value.splice(index, 1)
      }
      return true
    } finally {
      isLoading.value = false
    }
  }

  async function resendInvite(userId) {
    isLoading.value = true
    try {
      const response = await userApi.resendInvite(userId)
      return response
    } finally {
      isLoading.value = false
    }
  }

  async function exportToExcel(roleId = null) {
    isLoading.value = true
    try {
      const response = await userApi.exportUsersExcel(roleId)
      return response
    } finally {
      isLoading.value = false
    }
  }

  // Fetch available options for dropdowns
  async function fetchRoles() {
    try {
      const response = await roleApi.getRoles({ limit: 100 })
      availableRoles.value = response.data || response
      return availableRoles.value
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      return []
    }
  }

  async function fetchGroups() {
    try {
      const response = await groupApi.getGroups({ limit: 100 })
      availableGroups.value = response.data || response
      return availableGroups.value
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      return []
    }
  }

  async function fetchProjects() {
    try {
      // Using existing project API if available
      const { get } = await import('@/api/httpClient')
      const response = await get('/projects', { limit: 100 })
      availableProjects.value = response.data || response
      return availableProjects.value
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      return []
    }
  }

  async function fetchCustomFieldDefinitions() {
    try {
      const response = await customFieldApi.getCustomFields()
      customFieldDefinitions.value = response.data || response
      return customFieldDefinitions.value
    } catch (error) {
      console.error('Failed to fetch custom fields:', error)
      return []
    }
  }

  // Initialize all dropdown data
  async function initializeOptions() {
    await Promise.all([
      fetchRoles(),
      fetchGroups(),
      fetchProjects(),
      fetchCustomFieldDefinitions()
    ])
  }

  function selectUser(user) {
    selectedUser.value = user ? { ...user } : null
  }

  function clearSelectedUser() {
    selectedUser.value = null
  }

  // Compute user status from isActive
  function getUserStatus(user) {
    if (!user) return 'Unknown'
    return user.isActive ? 'Active' : 'Invited'
  }

  return {
    // State
    users,
    selectedUser,
    isLoading,
    pagination,
    availableRoles,
    availableGroups,
    availableProjects,
    availableLanguages,
    customFieldDefinitions,

    // Getters
    totalUsers,
    activeUsers,
    invitedUsers,
    inactiveUsers,

    // Actions
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    resendInvite,
    exportToExcel,
    fetchRoles,
    fetchGroups,
    fetchProjects,
    fetchCustomFieldDefinitions,
    initializeOptions,
    selectUser,
    clearSelectedUser,
    getUserStatus
  }
})
