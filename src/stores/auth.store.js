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
  const isAuthenticated = computed(() => !!accessToken.value)

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

  // Normalize API user payload to app user model
  function normalizeUser(apiUser = {}) {
    const firstName = apiUser.firstName || ''
    const lastName = apiUser.lastName || ''
    const nameFromParts = [firstName, lastName].filter(Boolean).join(' ').trim()
    const name = apiUser.name || nameFromParts || apiUser.email || ''
    const roleName = apiUser.role?.name || apiUser.role || UserRole.MEMBER

    const normalized = createUser({
      id: apiUser.id,
      email: apiUser.email,
      name,
      avatar: apiUser.avatar ?? null,
      role: roleName,
      createdAt: apiUser.createdAt,
      updatedAt: apiUser.updatedAt
    })

    normalized.firstName = firstName
    normalized.lastName = lastName
    normalized.roleDetail = apiUser.role || null
    normalized.isActive = apiUser.isActive

    return normalized
  }

  function decodeJwtPayload(token) {
    try {
      const [, payload] = token.split('.')
      if (!payload) return null
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const json = atob(normalized)
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  function isTokenExpired(token) {
    const payload = decodeJwtPayload(token)
    if (!payload?.exp) return false
    return Date.now() >= payload.exp * 1000
  }

  // ================================
  // Actions
  // ================================

  /**
   * Initialize auth state on app load
   * In development mode, restores user from localStorage if token exists
   */
  async function initialize() {
    if (isInitialized.value) return

    isLoading.value = true
    error.value = null

    try {
      if (accessToken.value) {
        if (isTokenExpired(accessToken.value)) {
          await logout()
          return
        }

        setAuthToken(accessToken.value)

        // Development mode: Restore user from localStorage if dev token
        if (import.meta.env.DEV && accessToken.value.startsWith('dev_')) {
          const savedUser = localStorage.getItem('devUser')
          if (savedUser) {
            user.value = createUser(JSON.parse(savedUser))
          } else {
            // Create a default dev user if none saved
            user.value = createUser({
              id: 'user_dev_001',
              email: 'demo@desidia.app',
              name: 'Demo User',
              avatar: null,
              role: 'owner',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
          }
        } else {
          // Production: Fetch user from API
          const userData = await authApi.getCurrentUser()
          user.value = normalizeUser(userData)
        }
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
   * In development mode, allows dummy login for testing
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   */
  async function login(credentials) {
    isLoading.value = true
    error.value = null

    try {
      let response

      // Development mode: Allow dummy login only when explicitly enabled
      const allowDummyAuth = import.meta.env.VITE_ALLOW_DUMMY_AUTH === 'true'
      if (import.meta.env.DEV && allowDummyAuth) {
        // Check for dummy credentials
        const isDummyLogin = credentials.email === 'demo@desidia.app' && credentials.password === 'demo1234'
        const isAnyLogin = credentials.email && credentials.password && credentials.password.length >= 8

        if (isDummyLogin || isAnyLogin) {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500))

          // Create dummy response
          response = {
            accessToken: 'dev_access_token_' + Date.now(),
            refreshToken: 'dev_refresh_token_' + Date.now(),
            user: {
              id: 'user_dev_001',
              email: credentials.email,
              name: credentials.email === 'demo@desidia.app' ? 'Demo User' : credentials.email.split('@')[0],
              avatar: null,
              role: 'owner',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        } else {
          throw new Error('Invalid email or password')
        }
      } else {
        // Production: Use real API
        response = await authApi.login(credentials)
      }

      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken || null

      // Store tokens and set auth header before fetching profile
      localStorage.setItem('accessToken', response.accessToken)
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      } else {
        localStorage.removeItem('refreshToken')
      }
      setAuthToken(response.accessToken)

      if (response.user) {
        user.value = normalizeUser(response.user)
      } else {
        const userData = await authApi.getCurrentUser()
        user.value = normalizeUser(userData)
      }

      // In dev mode, also save user data for persistence
      if (import.meta.env.DEV) {
        localStorage.setItem('devUser', JSON.stringify(response.user))
      }

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
   * In development mode, allows dummy registration for testing
   * @param {Object} data
   */
  async function register(data) {
    isLoading.value = true
    error.value = null

    try {
      let response

      // Development mode: Allow dummy registration only when explicitly enabled
      const allowDummyAuth = import.meta.env.VITE_ALLOW_DUMMY_AUTH === 'true'
      if (import.meta.env.DEV && allowDummyAuth) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))

        // Create dummy response
        response = {
          accessToken: 'dev_access_token_' + Date.now(),
          refreshToken: 'dev_refresh_token_' + Date.now(),
          user: {
            id: 'user_dev_' + Date.now(),
            email: data.email,
            name: data.name,
            avatar: null,
            role: 'owner',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      } else {
        // Production: Use real API
        response = await authApi.register(data)
      }

      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken
      user.value = createUser(response.user)

      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      setAuthToken(response.accessToken)

      // In dev mode, also save user data for persistence
      if (import.meta.env.DEV) {
        localStorage.setItem('devUser', JSON.stringify(response.user))
      }

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
      // Only call API in production mode
      if (accessToken.value && !import.meta.env.DEV) {
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

      // In dev mode, also clear devUser
      if (import.meta.env.DEV) {
        localStorage.removeItem('devUser')
      }
    }
  }

  /**
   * Ensure token is valid and user is loaded
   * @returns {Promise<boolean>}
   */
  async function ensureSession() {
    if (!accessToken.value) return false

    if (isTokenExpired(accessToken.value)) {
      await logout()
      return false
    }

    setAuthToken(accessToken.value)

    if (!user.value && !import.meta.env.DEV) {
      try {
        const userData = await authApi.getCurrentUser()
        user.value = normalizeUser(userData)
      } catch {
        await logout()
        return false
      }
    }

    return true
  }

  /**
   * Update user profile
   * @param {Object} data
   */
  async function updateProfile(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.updateProfile(data)
      const updatedUser = response.user || response.data || response
      user.value = normalizeUser(updatedUser)
      return response
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
      const response = await authApi.changePassword(data)
      return response
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
      const response = await authApi.requestPasswordReset(email)
      return response
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
      const response = await authApi.resetPassword(data)
      return response
    } catch (err) {
      error.value = err.message || 'Password reset failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Request login link
   * @param {string} email
   */
  async function requestLoginLink(email) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.requestLoginLink(email)
      return response
    } catch (err) {
      error.value = err.message || 'Login link request failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Verify login link token
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.token
   */
  async function verifyLoginLink(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.verifyLoginLink(data)

      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken || null

      localStorage.setItem('accessToken', response.accessToken)
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      } else {
        localStorage.removeItem('refreshToken')
      }
      setAuthToken(response.accessToken)

      if (response.user) {
        user.value = normalizeUser(response.user)
      } else {
        const userData = await authApi.getCurrentUser()
        user.value = normalizeUser(userData)
      }

      return response
    } catch (err) {
      error.value = err.message || 'Login link verification failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function completeSocialLogin(response) {
    accessToken.value = response.accessToken
    refreshToken.value = response.refreshToken || null

    localStorage.setItem('accessToken', response.accessToken)
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }
    setAuthToken(response.accessToken)

    if (response.user) {
      user.value = normalizeUser(response.user)
    } else {
      const userData = await authApi.getCurrentUser()
      user.value = normalizeUser(userData)
    }

    return response
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
    requestLoginLink,
    verifyLoginLink,
    completeSocialLogin,
    ensureSession,
    hasPermission,
    hasRole
  }
})
