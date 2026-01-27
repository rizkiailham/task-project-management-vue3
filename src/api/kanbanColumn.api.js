/**
 * Desidia v2 - Kanban Column API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all kanban columns
 * @param {Object} params
 * @returns {Promise<any>}
 */
export async function getKanbanColumns(params = {}) {
  return get('/kanban-columns', params)
}

/**
 * Get a single kanban column by ID
 * @param {string} columnId
 * @returns {Promise<any>}
 */
export async function getKanbanColumn(columnId) {
  return get(`/kanban-columns/${columnId}`)
}

/**
 * Create a kanban column
 * @param {Object} data
 * @returns {Promise<any>}
 */
export async function createKanbanColumn(data) {
  return post('/kanban-columns', data)
}

/**
 * Update a kanban column
 * @param {string} columnId
 * @param {Object} data
 * @returns {Promise<any>}
 */
export async function updateKanbanColumn(columnId, data) {
  return patch(`/kanban-columns/${columnId}`, data)
}

/**
 * Delete a kanban column
 * @param {string} columnId
 * @returns {Promise<any>}
 */
export async function deleteKanbanColumn(columnId) {
  return del(`/kanban-columns/${columnId}`)
}

/**
 * Reorder kanban columns
 * @param {Object} data
 * @param {string} data.projectId
 * @param {string[]} data.columnIds
 * @returns {Promise<any>}
 */
export async function reorderKanbanColumns(data) {
  return post('/kanban-columns/reorder', data)
}
