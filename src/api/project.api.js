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
export async function getProjectAccesses(projectId) {
  return get(`/projects/${projectId}/accesses`)
}

/**
 * Add users/groups to a project access list
 * @param {string} projectId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function addProjectAccesses(projectId, payload) {
  return post(`/projects/${projectId}/accesses`, payload)
}

/**
 * Remove users/groups from a project access list
 * @param {string} projectId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function removeProjectAccesses(projectId, payload) {
  return del(`/projects/${projectId}/accesses`, { data: payload })
}

/**
 * Search users/groups for project access
 * @param {string} projectId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function searchProjectAccesses(projectId, query = {}) {
  return get(`/projects/${projectId}/accesses/search`, query)
}
