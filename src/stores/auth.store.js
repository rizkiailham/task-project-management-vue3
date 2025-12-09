/**
 * Desidia v2 - Auth Store
 * 
 * Manages authentication state, user data, and session handling
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth.api'
import { setAuthToken, clearAuth } from '@/api/httpClient'
import { createUser, UserRole } from '@/models'

export const useAuthStore = defineStore('auth', () => {
  // ================================
  // State
  // ================================
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  const isLoading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  // ================================
  // Getters
  // ================================
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  const userName = computed(() => user.value?.name || '')

  const userEmail = computed(() => user.value?.email || '')

  const userAvatar = computed(() => user.value?.avatar || null)

  const userInitials = computed(() => {
    if (!user.value?.name) return '?'
    const names = user.value.name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return user.value.name.substring(0, 2).toUpperCase()
  })

  const userRole = computed(() => user.value?.role || UserRole.MEMBER)

  const isOwner = computed(() => user.value?.role === UserRole.OWNER)

  const isAdmin = computed(() => 
    user.value?.role === UserRole.OWNER || user.value?.role === UserRole.ADMIN
  )

  // ================================
  // Actions
  // ================================

  /**
   * Initialize auth state on app load
   */
  async function initialize() {
    if (isInitialized.value) return

    isLoading.value = true
    error.value = null

    try {
      if (accessToken.value) {
        setAuthToken(accessToken.value)
        const userData = await authApi.getCurrentUser()
        user.value = createUser(userData)
      }
    } catch (err) {
      // Token might be expired, clear auth
      await logout()
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  /**
   * Login with credentials
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   */
  async function login(credentials) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)

      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken
      user.value = createUser(response.user)

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      setAuthToken(response.accessToken)

      return response
    } catch (err) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Register a new user
   * @param {Object} data
   */
  async function register(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.register(data)

      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken
      user.value = createUser(response.user)

      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      setAuthToken(response.accessToken)

      return response
    } catch (err) {
      error.value = err.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout user
   */
  async function logout() {
    try {
      if (accessToken.value) {
        await authApi.logout()
      }
    } catch {
      // Ignore logout API errors
    } finally {
      // Clear local state
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      error.value = null

      // Clear storage and headers
      clearAuth()
    }
  }

  /**
   * Update user profile
   * @param {Object} data
   */
  async function updateProfile(data) {
    isLoading.value = true
    error.value = null

    try {
      const updatedUser = await authApi.updateProfile(data)
      user.value = createUser(updatedUser)
      return updatedUser
    } catch (err) {
      error.value = err.message || 'Profile update failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Change password
   * @param {Object} data
   */
  async function changePassword(data) {
    isLoading.value = true
    error.value = null

    try {
      await authApi.changePassword(data)
    } catch (err) {
      error.value = err.message || 'Password change failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Request password reset
   * @param {string} email
   */
  async function requestPasswordReset(email) {
    isLoading.value = true
    error.value = null

    try {
      await authApi.requestPasswordReset(email)
    } catch (err) {
      error.value = err.message || 'Password reset request failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reset password with token
   * @param {Object} data
   */
  async function resetPassword(data) {
    isLoading.value = true
    error.value = null

    try {
      await authApi.resetPassword(data)
    } catch (err) {
      error.value = err.message || 'Password reset failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if user has a specific permission
   * @param {string} permission
   * @returns {boolean}
   */
  function hasPermission(permission) {
    if (!user.value) return false

    // Owner has all permissions
    if (user.value.role === UserRole.OWNER) return true

    // Define permissions by role
    const rolePermissions = {
      [UserRole.ADMIN]: [
        'workspace.manage',
        'project.create',
        'project.edit',
        'project.delete',
        'member.invite',
        'member.remove',
        'task.create',
        'task.edit',
        'task.delete',
        'settings.view'
      ],
      [UserRole.MEMBER]: [
        'project.view',
        'task.create',
        'task.edit',
        'task.view',
        'comment.create'
      ],
      [UserRole.GUEST]: [
        'project.view',
        'task.view'
      ]
    }

    const permissions = rolePermissions[user.value.role] || []
    return permissions.includes(permission)
  }

  /**
   * Check if user has a specific role
   * @param {string|string[]} roles
   * @returns {boolean}
   */
  function hasRole(roles) {
    if (!user.value) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.value.role)
  }

  // Listen for auth:logout event
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
      logout()
    })
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    isInitialized,

    // Getters
    isAuthenticated,
    userName,
    userEmail,
    userAvatar,
    userInitials,
    userRole,
    isOwner,
    isAdmin,

    // Actions
    initialize,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    hasPermission,
    hasRole
  }
})

