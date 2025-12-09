/**
 * Desidia v2 - Workspace API
 */

import { get, post, put, patch, del } from './httpClient'

/**
 * Get all workspaces for the current user
 * @returns {Promise<Workspace[]>}
 */
export async function getWorkspaces() {
  return get('/workspaces')
}

/**
 * Get a single workspace by ID
 * @param {string} id
 * @returns {Promise<Workspace>}
 */
export async function getWorkspace(id) {
  return get(`/workspaces/${id}`)
}

/**
 * Create a new workspace
 * @param {Object} data
 * @returns {Promise<Workspace>}
 */
export async function createWorkspace(data) {
  return post('/workspaces', data)
}

/**
 * Update a workspace
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Workspace>}
 */
export async function updateWorkspace(id, data) {
  return patch(`/workspaces/${id}`, data)
}

/**
 * Delete a workspace
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteWorkspace(id) {
  return del(`/workspaces/${id}`)
}

/**
 * Get workspace members
 * @param {string} workspaceId
 * @returns {Promise<WorkspaceMember[]>}
 */
export async function getWorkspaceMembers(workspaceId) {
  return get(`/workspaces/${workspaceId}/members`)
}

/**
 * Invite a member to workspace
 * @param {string} workspaceId
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.role
 * @returns {Promise<void>}
 */
export async function inviteMember(workspaceId, data) {
  return post(`/workspaces/${workspaceId}/members/invite`, data)
}

/**
 * Update member role
 * @param {string} workspaceId
 * @param {string} userId
 * @param {string} role
 * @returns {Promise<void>}
 */
export async function updateMemberRole(workspaceId, userId, role) {
  return patch(`/workspaces/${workspaceId}/members/${userId}`, { role })
}

/**
 * Remove a member from workspace
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function removeMember(workspaceId, userId) {
  return del(`/workspaces/${workspaceId}/members/${userId}`)
}

/**
 * Leave a workspace
 * @param {string} workspaceId
 * @returns {Promise<void>}
 */
export async function leaveWorkspace(workspaceId) {
  return post(`/workspaces/${workspaceId}/leave`)
}

/**
 * Get workspace tags
 * @param {string} workspaceId
 * @returns {Promise<Tag[]>}
 */
export async function getWorkspaceTags(workspaceId) {
  return get(`/workspaces/${workspaceId}/tags`)
}

/**
 * Create a tag in workspace
 * @param {string} workspaceId
 * @param {Object} data
 * @returns {Promise<Tag>}
 */
export async function createTag(workspaceId, data) {
  return post(`/workspaces/${workspaceId}/tags`, data)
}

/**
 * Delete a tag
 * @param {string} workspaceId
 * @param {string} tagId
 * @returns {Promise<void>}
 */
export async function deleteTag(workspaceId, tagId) {
  return del(`/workspaces/${workspaceId}/tags/${tagId}`)
}

