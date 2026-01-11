/**
 * Desidia v2 - Role API
 * 
 * API endpoints for role management
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get paginated list of roles
 * @param {Object} params - Query parameters (page, limit, keywords)
 * @returns {Promise<Object>} Paginated roles response
 */
export async function getRoles(params = {}) {
    return get('/roles', params)
}

/**
 * Get single role by ID
 * @param {string} id - Role ID
 * @returns {Promise<Object>} Role object with permissions
 */
export async function getRole(id) {
    return get(`/roles/${id}`)
}

/**
 * Create new role
 * @param {Object} data - Role data (name, description, isAdmin, permissions)
 * @returns {Promise<Object>} Created role
 */
export async function createRole(data) {
    return post('/roles', data)
}

/**
 * Update existing role
 * @param {string} id - Role ID
 * @param {Object} data - Role data to update
 * @returns {Promise<Object>} Updated role
 */
export async function updateRole(id, data) {
    return patch(`/roles/${id}`, data)
}

/**
 * Delete role
 * @param {string} id - Role ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteRole(id) {
    return del(`/roles/${id}`)
}

export default {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole
}
