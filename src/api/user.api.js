/**
 * Desidia v2 - User API
 * 
 * API endpoints for user management
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get paginated list of users
 * @param {Object} params - Query parameters (page, limit, keywords, sortBy)
 * @returns {Promise<Object>} Paginated users response
 */
export async function getUsers(params = {}) {
    return get('/users', params)
}

/**
 * Get single user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object>} User object
 */
export async function getUser(id) {
    return get(`/users/${id}`)
}

/**
 * Create new user
 * @param {Object} data - User data (firstName, lastName, email, roleId, groupIds, projectIds, etc.)
 * @returns {Promise<Object>} Created user
 */
export async function createUser(data) {
    return post('/users', data)
}

/**
 * Update existing user
 * @param {string} id - User ID
 * @param {Object} data - User data to update
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(id, data) {
    return patch(`/users/${id}`, data)
}

/**
 * Delete user
 * @param {string} id - User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(id) {
    return del(`/users/${id}`)
}

/**
 * Resend invitation email to user
 * @param {string} id - User ID
 * @returns {Promise<Object>} Result message
 */
export async function resendInvite(id) {
    return post(`/users/${id}/resend-invite`)
}

/**
 * Export users to Excel
 * @param {string} roleId - Optional role ID filter
 * @returns {Promise<Object>} File URL
 */
export async function exportUsersExcel(roleId = null) {
    const params = roleId ? { roleId } : {}
    return get('/users/export/excel', params)
}

export default {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resendInvite,
    exportUsersExcel
}
