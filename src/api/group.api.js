/**
 * Desidia v2 - Group API
 * 
 * API endpoints for group management
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get paginated list of groups
 * @param {Object} params - Query parameters (page, limit, keywords)
 * @returns {Promise<Object>} Paginated groups response
 */
export async function getGroups(params = {}) {
    return get('/groups', params)
}

/**
 * Get single group by ID
 * @param {string} id - Group ID
 * @returns {Promise<Object>} Group object with users
 */
export async function getGroup(id) {
    return get(`/groups/${id}`)
}

/**
 * Create new group
 * @param {Object} data - Group data (name, description)
 * @returns {Promise<Object>} Created group
 */
export async function createGroup(data) {
    return post('/groups', data)
}

/**
 * Update existing group
 * @param {string} id - Group ID
 * @param {Object} data - Group data to update
 * @returns {Promise<Object>} Updated group
 */
export async function updateGroup(id, data) {
    return patch(`/groups/${id}`, data)
}

/**
 * Delete group
 * @param {string} id - Group ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteGroup(id) {
    return del(`/groups/${id}`)
}

/**
 * Add users to group
 * @param {string} groupId - Group ID
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Updated group
 */
export async function addUsersToGroup(groupId, userIds) {
    return post(`/groups/${groupId}/users`, { userIds })
}

/**
 * Remove users from group
 * @param {string} groupId - Group ID
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Updated group
 */
export async function removeUsersFromGroup(groupId, userIds) {
    return del(`/groups/${groupId}/users`, { data: { userIds } })
}

/**
 * Search users for group membership
 * @param {string} groupId - Group ID
 * @param {string} keywords - Search keywords
 * @returns {Promise<Object>} Users with isJoined flag
 */
export async function searchGroupUsers(groupId, keywords = '') {
    return get(`/groups/${groupId}/users`, { keywords })
}

export default {
    getGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    addUsersToGroup,
    removeUsersFromGroup,
    searchGroupUsers
}
