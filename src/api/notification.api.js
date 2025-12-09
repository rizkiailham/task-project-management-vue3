/**
 * Desidia v2 - Notification API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all notifications for current user
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {boolean} params.unreadOnly
 * @returns {Promise<{notifications: Notification[], total: number, unreadCount: number}>}
 */
export async function getNotifications(params = {}) {
  return get('/notifications', params)
}

/**
 * Get unread notification count
 * @returns {Promise<{count: number}>}
 */
export async function getUnreadCount() {
  return get('/notifications/unread-count')
}

/**
 * Mark notification as read
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  return patch(`/notifications/${notificationId}/read`)
}

/**
 * Mark all notifications as read
 * @returns {Promise<void>}
 */
export async function markAllAsRead() {
  return post('/notifications/mark-all-read')
}

/**
 * Delete a notification
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  return del(`/notifications/${notificationId}`)
}

/**
 * Update notification preferences
 * @param {Object} preferences
 * @returns {Promise<void>}
 */
export async function updatePreferences(preferences) {
  return patch('/notifications/preferences', preferences)
}

/**
 * Get notification preferences
 * @returns {Promise<Object>}
 */
export async function getPreferences() {
  return get('/notifications/preferences')
}

