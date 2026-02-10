/**
 * Desidia v2 - Project API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all projects
 * @param {Object} params - Query parameters
 * @returns {Promise<Project[]>}
 */
export async function getProjects(params = {}) {
  return get('/projects', params)
}

/**
 * Get a single project by ID
 * @param {string} projectId
 * @returns {Promise<Project>}
 */
export async function getProject(projectId) {
  return get(`/projects/${projectId}`)
}

/**
 * Create a new project
 * @param {Object} data
 * @returns {Promise<Project>}
 */
export async function createProject(data) {
  return post('/projects', data)
}

/**
 * Duplicate a project
 * @param {string} projectId
 * @returns {Promise<Project>}
 */
export async function duplicateProject(projectId) {
  return post(`/projects/${projectId}/duplicate`)
}

/**
 * Update a project
 * @param {string} projectId
 * @param {Object} data
 * @returns {Promise<Project>}
 */
export async function updateProject(projectId, data) {
  return patch(`/projects/${projectId}`, data)
}

/**
 * Delete a project
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  return del(`/projects/${projectId}`)
}

/**
 * Add users to a project
 * @param {string} projectId
 * @param {string[]} userIds
 * @returns {Promise<void>}
 */
export async function addProjectUsers(projectId, userIds) {
  return post(`/projects/${projectId}/users`, { userIds })
}

/**
 * Invite users by email to a project
 * @param {string} projectId
 * @param {string[]} emails
 * @returns {Promise<void>}
 */
export async function inviteProjectEmails(projectId, emails) {
  return post(`/projects/${projectId}/invite/emails`, { emails })
}

/**
 * Search users in a project
 * @param {string} projectId
 * @param {Object} query
 * @returns {Promise<User[]>}
 */
export async function searchProjectUsers(projectId, query = {}) {
  return get(`/projects/${projectId}/users`, query)
}

/**
 * Remove users from a project
 * @param {string} projectId
 * @param {string[]} userIds
 * @returns {Promise<void>}
 */
export async function removeProjectUsers(projectId, userIds) {
  return del(`/projects/${projectId}/users`, { data: { userIds } })
}

/**
 * Get project access entries
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function getProjectAccesses(projectId, config = {}) {
  return get(`/projects/${projectId}/accesses`, {}, config)
}

/**
 * Add users/groups to a project access list
 * @param {string} projectId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function addProjectAccesses(projectId, payload, config = {}) {
  return post(`/projects/${projectId}/accesses`, payload, config)
}

/**
 * Remove users/groups from a project access list
 * @param {string} projectId
 * @param {string[]} accessIds
 * @returns {Promise<Object>}
 */
export async function removeProjectAccesses(projectId, accessIds, config = {}) {
  return del(`/projects/${projectId}/accesses`, { data: { accessIds }, ...config })
}

/**
 * Search users/groups for project access
 * @param {string} projectId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function searchProjectAccesses(projectId, query = {}, config = {}) {
  return get(`/projects/${projectId}/accesses/search`, query, config)
}

/**
 * Update role for a project access entry
 * @param {string} projectId
 * @param {string} accessId
 * @param {string} roleId
 * @returns {Promise<Object>}
 */
export async function updateAccessRole(projectId, accessId, roleId, config = {}) {
  return patch(`/projects/${projectId}/accesses/${accessId}/role`, { roleId }, config)
}

/**
 * Get project items (boards, reports, etc.)
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function getProjectItems(projectId) {
  return get(`/projects/${projectId}/items`)
}

/**
 * Create a project item
 * @param {string} projectId
 * @param {Object} data - { name, type, ... }
 * @returns {Promise<Object>}
 */
export async function createProjectItem(projectId, data) {
  return post(`/projects/${projectId}/items`, data)
}

/**
 * Update a project item (e.g. rename)
 * @param {string} projectId
 * @param {string} itemId
 * @param {Object} data - e.g. { name: 'New Name' }
 * @returns {Promise<Object>}
 */
export async function updateProjectItem(projectId, itemId, data) {
  return patch(`/projects/${projectId}/items/${itemId}`, data)
}

/**
 * Delete a project item
 * @param {string} projectId
 * @param {string} itemId
 * @returns {Promise<void>}
 */
export async function deleteProjectItem(projectId, itemId) {
  return del(`/projects/${projectId}/items/${itemId}`)
}

/**
 * Reorder project items
 * @param {string} projectId
 * @param {string[]} itemIds
 * @returns {Promise<void>}
 */
export async function reorderProjectItems(projectId, itemIds) {
  return post(`/projects/${projectId}/items/reorder`, { itemIds })
}
/**
 * Get project tags
 * @param {Object} params - { projectId }
 * @returns {Promise<Object[]>}
 */
export async function getProjectTags(params = {}) {
  return get('/project-tags', params)
}

/**
 * Create a project tag
 * @param {Object} data - { projectId, name, color }
 * @returns {Promise<Object>}
 */
export async function createProjectTag(data) {
  return post('/project-tags', data)
}

/**
 * Update a project tag
 * @param {string} tagId
 * @param {Object} data - { name, color }
 * @returns {Promise<Object>}
 */
export async function updateProjectTag(tagId, data) {
  return patch(`/project-tags/${tagId}`, data)
}

/**
 * Delete a project tag
 * @param {string} tagId
 * @returns {Promise<void>}
 */
export async function deleteProjectTag(tagId) {
  return del(`/project-tags/${tagId}`)
}

/**
 * Reorder project tags
 * @param {Object} data - { projectId, tagIds[] }
 * @returns {Promise<void>}
 */
export async function reorderProjectTags(data) {
  return post('/project-tags/reorder', data)
}

/**
 * Get project AI instruction by project ID
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function getProjectInstruction(projectId) {
  return get(`/project-ai-instruction/${projectId}`)
}

/**
 * Create or update project AI instruction
 * @param {Object} data - { projectId, prompt, preferredLanguage }
 * @returns {Promise<Object>}
 */
export async function upsertProjectInstruction(data) {
  return post('/project-ai-instruction', data)
}

/**
 * Reset project AI instruction to default
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function deleteProjectInstruction(projectId) {
  return del(`/project-ai-instruction/${projectId}`)
}
