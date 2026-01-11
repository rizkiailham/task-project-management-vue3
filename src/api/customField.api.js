/**
 * Desidia v2 - Custom Field API
 * 
 * API endpoints for custom field definitions (meta fields)
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all custom field definitions
 * @returns {Promise<Object[]>} Array of custom field definitions
 */
export async function getCustomFields() {
    return get('/custom-field-user-definitions')
}

/**
 * Get single custom field definition
 * @param {string} id - Custom field ID
 * @returns {Promise<Object>} Custom field definition
 */
export async function getCustomField(id) {
    return get(`/custom-field-user-definitions/${id}`)
}

/**
 * Create custom field definition
 * @param {Object} data - Field data (key, label, type, settings)
 * @returns {Promise<Object>} Created custom field
 */
export async function createCustomField(data) {
    return post('/custom-field-user-definitions', data)
}

/**
 * Update custom field definition
 * @param {string} id - Custom field ID
 * @param {Object} data - Field data to update
 * @returns {Promise<Object>} Updated custom field
 */
export async function updateCustomField(id, data) {
    return patch(`/custom-field-user-definitions/${id}`, data)
}

/**
 * Delete custom field definition
 * @param {string} id - Custom field ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCustomField(id) {
    return del(`/custom-field-user-definitions/${id}`)
}

export default {
    getCustomFields,
    getCustomField,
    createCustomField,
    updateCustomField,
    deleteCustomField
}
