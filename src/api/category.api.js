/**
 * Desidia v2 - Category API
 *
 * API endpoints for bulletin category management
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get paginated list of categories
 * @param {Object} params - Query parameters (page, limit, keywords, isParent)
 * @returns {Promise<Object>} Paginated categories response
 */
export async function getCategories(params = {}) {
  return get('/categories', params)
}

/**
 * Get single category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Category object
 */
export async function getCategory(id) {
  return get(`/categories/${id}`)
}

/**
 * Create new category
 * @param {Object} data - Category data
 * @returns {Promise<Object>} Created category
 */
export async function createCategory(data) {
  return post('/categories', data)
}

/**
 * Update existing category
 * @param {string} id - Category ID
 * @param {Object} data - Category data to update
 * @returns {Promise<Object>} Updated category
 */
export async function updateCategory(id, data) {
  return patch(`/categories/${id}`, data)
}

/**
 * Delete category
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCategory(id) {
  return del(`/categories/${id}`)
}

export default {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
}
