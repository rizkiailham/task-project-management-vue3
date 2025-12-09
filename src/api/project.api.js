/**
 * Desidia v2 - Project API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all projects in a workspace
 * @param {string} workspaceId
 * @param {Object} params - Query parameters
 * @returns {Promise<Project[]>}
 */
export async function getProjects(workspaceId, params = {}) {
  return get(`/workspaces/${workspaceId}/projects`, params)
}

/**
 * Get a single project by ID
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<Project>}
 */
export async function getProject(workspaceId, projectId) {
  return get(`/workspaces/${workspaceId}/projects/${projectId}`)
}

/**
 * Create a new project
 * @param {string} workspaceId
 * @param {Object} data
 * @returns {Promise<Project>}
 */
export async function createProject(workspaceId, data) {
  return post(`/workspaces/${workspaceId}/projects`, data)
}

/**
 * Update a project
 * @param {string} workspaceId
 * @param {string} projectId
 * @param {Object} data
 * @returns {Promise<Project>}
 */
export async function updateProject(workspaceId, projectId, data) {
  return patch(`/workspaces/${workspaceId}/projects/${projectId}`, data)
}

/**
 * Delete a project
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function deleteProject(workspaceId, projectId) {
  return del(`/workspaces/${workspaceId}/projects/${projectId}`)
}

/**
 * Archive a project
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<Project>}
 */
export async function archiveProject(workspaceId, projectId) {
  return post(`/workspaces/${workspaceId}/projects/${projectId}/archive`)
}

/**
 * Restore an archived project
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<Project>}
 */
export async function restoreProject(workspaceId, projectId) {
  return post(`/workspaces/${workspaceId}/projects/${projectId}/restore`)
}

/**
 * Duplicate a project
 * @param {string} workspaceId
 * @param {string} projectId
 * @param {Object} data
 * @returns {Promise<Project>}
 */
export async function duplicateProject(workspaceId, projectId, data = {}) {
  return post(`/workspaces/${workspaceId}/projects/${projectId}/duplicate`, data)
}

/**
 * Get project members
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<User[]>}
 */
export async function getProjectMembers(workspaceId, projectId) {
  return get(`/workspaces/${workspaceId}/projects/${projectId}/members`)
}

/**
 * Add member to project
 * @param {string} workspaceId
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function addProjectMember(workspaceId, projectId, userId) {
  return post(`/workspaces/${workspaceId}/projects/${projectId}/members`, { userId })
}

/**
 * Remove member from project
 * @param {string} workspaceId
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function removeProjectMember(workspaceId, projectId, userId) {
  return del(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`)
}

/**
 * Get project statistics
 * @param {string} workspaceId
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function getProjectStats(workspaceId, projectId) {
  return get(`/workspaces/${workspaceId}/projects/${projectId}/stats`)
}

