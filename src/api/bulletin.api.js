/**
 * Desidia v2 - Bulletin API
 *
 * API endpoints for bulletin management
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get paginated list of bulletins
 * @param {Object} params - Query parameters (page, limit, keywords, sortBy, isPublished, category_id)
 * @returns {Promise<Object>} Paginated bulletins response
 */
export async function getBulletins(params = {}) {
  return get('/bulletins', params)
}

/**
 * Get single bulletin by ID
 * @param {string} id - Bulletin ID
 * @returns {Promise<Object>} Bulletin object
 */
export async function getBulletin(id) {
  return get(`/bulletins/${id}`)
}

/**
 * Create new bulletin
 * @param {Object} data - Bulletin data
 * @returns {Promise<Object>} Created bulletin
 */
export async function createBulletin(data) {
  return post('/bulletins', data)
}

/**
 * Update existing bulletin
 * @param {string} id - Bulletin ID
 * @param {Object} data - Bulletin data to update
 * @returns {Promise<Object>} Updated bulletin
 */
export async function updateBulletin(id, data) {
  return patch(`/bulletins/${id}`, data)
}

/**
 * Delete bulletin
 * @param {string} id - Bulletin ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteBulletin(id) {
  return del(`/bulletins/${id}`)
}

export default {
  getBulletins,
  getBulletin,
  createBulletin,
  updateBulletin,
  deleteBulletin
}
