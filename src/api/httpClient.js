/**
 * Desidia v2 - HTTP Client
 * 
 * Centralized Axios instance with request/response interceptors,
 * authentication handling, and error management.
 */

import axios from 'axios'

// API Base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// Create axios instance with default config
const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// ================================
// Request Interceptor
// ================================
httpClient.interceptors.request.use(
  (config) => {
    // Get access token from localStorage
    const token = localStorage.getItem('accessToken')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Get current workspace ID if available
    const workspaceId = localStorage.getItem('currentWorkspaceId')
    if (workspaceId) {
      config.headers['X-Workspace-ID'] = workspaceId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ================================
// Response Interceptor
// ================================
httpClient.interceptors.response.use(
  (response) => {
    // Return data directly for convenience
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Attempt to refresh token
        const refreshToken = localStorage.getItem('refreshToken')
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          })

          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return httpClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('currentWorkspaceId')
        
        // Dispatch custom event for auth failure
        window.dispatchEvent(new CustomEvent('auth:logout'))
        
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    const errorResponse = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errors: error.response?.data?.errors || [],
      code: error.response?.data?.code || 'UNKNOWN_ERROR'
    }

    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('[HTTP Error]', errorResponse)
    }

    return Promise.reject(errorResponse)
  }
)

// ================================
// Helper Methods
// ================================

/**
 * Set authorization header
 * @param {string} token - Access token
 */
export function setAuthToken(token) {
  if (token) {
    httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('accessToken', token)
  } else {
    delete httpClient.defaults.headers.common['Authorization']
    localStorage.removeItem('accessToken')
  }
}

/**
 * Set current workspace ID header
 * @param {string} workspaceId - Workspace ID
 */
export function setWorkspaceId(workspaceId) {
  if (workspaceId) {
    httpClient.defaults.headers.common['X-Workspace-ID'] = workspaceId
    localStorage.setItem('currentWorkspaceId', workspaceId)
  } else {
    delete httpClient.defaults.headers.common['X-Workspace-ID']
    localStorage.removeItem('currentWorkspaceId')
  }
}

/**
 * Clear all auth-related data
 */
export function clearAuth() {
  delete httpClient.defaults.headers.common['Authorization']
  delete httpClient.defaults.headers.common['X-Workspace-ID']
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('currentWorkspaceId')
}

/**
 * Generic GET request
 * @param {string} url - Endpoint URL
 * @param {Object} params - Query parameters
 * @returns {Promise<any>}
 */
export async function get(url, params = {}) {
  return httpClient.get(url, { params })
}

/**
 * Generic POST request
 * @param {string} url - Endpoint URL
 * @param {Object} data - Request body
 * @returns {Promise<any>}
 */
export async function post(url, data = {}) {
  return httpClient.post(url, data)
}

/**
 * Generic PUT request
 * @param {string} url - Endpoint URL
 * @param {Object} data - Request body
 * @returns {Promise<any>}
 */
export async function put(url, data = {}) {
  return httpClient.put(url, data)
}

/**
 * Generic PATCH request
 * @param {string} url - Endpoint URL
 * @param {Object} data - Request body
 * @returns {Promise<any>}
 */
export async function patch(url, data = {}) {
  return httpClient.patch(url, data)
}

/**
 * Generic DELETE request
 * @param {string} url - Endpoint URL
 * @returns {Promise<any>}
 */
export async function del(url) {
  return httpClient.delete(url)
}

/**
 * Upload file with progress tracking
 * @param {string} url - Endpoint URL
 * @param {FormData} formData - Form data with file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<any>}
 */
export async function upload(url, formData, onProgress = null) {
  return httpClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    }
  })
}

export default httpClient

