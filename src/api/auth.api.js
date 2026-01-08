/**
 * Desidia v2 - Authentication API
 */

import { post, get, patch } from './httpClient'

/**
 * Login with email and password
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{accessToken: string, refreshToken?: string, user?: User}>}
 */
export async function login(credentials) {
  return post('/auth/login', credentials)
}

/**
 * Register a new user
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} data.name
 * @returns {Promise<{accessToken: string, refreshToken?: string, user?: User}>}
 */
export async function register(data) {
  return post('/auth/register', data)
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logout() {
  return post('/auth/logout')
}

/**
 * Get current authenticated user
 * @returns {Promise<User>}
 */
export async function getCurrentUser() {
  return get('/auth/profile')
}

/**
 * Update current user profile
 * @param {Object} data
 * @param {string} data.firstName
 * @param {string} data.lastName
 * @returns {Promise<User>}
 */
export async function updateProfile(data) {
  return patch('/auth/profile', data)
}

/**
 * Change password
 * @param {Object} data
 * @param {string} data.currentPassword
 * @param {string} data.newPassword
 * @param {string} data.confirmPassword
 * @returns {Promise<void>}
 */
export async function changePassword(data) {
  return post('/auth/change-password', data)
}

/**
 * Request password reset
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function requestPasswordReset(email) {
  return post('/auth/forgot-password', { email })
}

/**
 * Reset password with token
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.token
 * @param {string} data.password
 * @param {string} data.confirmPassword
 * @returns {Promise<void>}
 */
export async function resetPassword(data) {
  return post('/auth/reset-password', data)
}

/**
 * Verify email
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function verifyEmail(token) {
  return post('/auth/verify-email', { token })
}

/**
 * Resend verification email
 * @returns {Promise<void>}
 */
export async function resendVerificationEmail() {
  return post('/auth/resend-verification')
}
