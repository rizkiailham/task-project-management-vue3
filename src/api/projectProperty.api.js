/**
 * Desidia v2 - Project Property API
 *
 * Dynamic per-project property definitions (status, priority, assignee, due_date, custom fields).
 * Replaces the previous hardcoded project-columns and project-tags APIs.
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all project properties for a given project
 * @param {Object} params - Query parameters (e.g. { projectId })
 * @returns {Promise<Object[]>} Array of property definitions
 */
export async function getProjectProperties(params = {}) {
  return get('/project-properties', params)
}

/**
 * Get a single project property by ID
 * @param {string} id - Property ID
 * @returns {Promise<Object>} Property definition
 */
export async function getProjectProperty(id) {
  return get(`/project-properties/${id}`)
}

/**
 * Create a new project property
 * @param {Object} data - Property data
 * @param {string} data.projectId - Project ID
 * @param {string} data.key - Property key (e.g. 'status', 'priority', 'my_custom_field')
 * @param {string} data.label - Display label
 * @param {string} data.type - Property type: text, number, boolean, date, select, multiselect, user, checkbox
 * @param {string} [data.description] - Optional description
 * @param {boolean} [data.isRequired] - Whether field is required
 * @param {boolean} [data.isVisible] - Whether field is visible in task views
 * @param {Object} [data.settings] - Type-specific settings (e.g. { options: [] } for select)
 * @returns {Promise<Object>} Created property
 */
export async function createProjectProperty(data) {
  return post('/project-properties', data)
}

/**
 * Update a project property
 * @param {string} id - Property ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated property
 */
export async function updateProjectProperty(id, data) {
  return patch(`/project-properties/${id}`, data)
}

/**
 * Delete a project property
 * @param {string} id - Property ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProjectProperty(id) {
  return del(`/project-properties/${id}`)
}

/**
 * Reorder project properties
 * @param {Object} data
 * @param {string} data.projectId - Project ID
 * @param {string[]} data.propertyIds - Ordered array of property IDs
 * @returns {Promise<Object>} Reorder result
 */
export async function reorderProjectProperties(data) {
  return post('/project-properties/reorder', data)
}

export default {
  getProjectProperties,
  getProjectProperty,
  createProjectProperty,
  updateProjectProperty,
  deleteProjectProperty,
  reorderProjectProperties
}
