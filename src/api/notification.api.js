/**
 * Desidia v2 - Notification API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get inbox notifications for current user
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {0|1} [params.isRead] - 0 = unread only, 1 = read only
 * @param {string} [params.projectId]
 * @param {string} [params.entityType]
 * @param {string} [params.keywords]
 * @param {string} [params.sortBy] - e.g. "createdAt:DESC"
 * @returns {Promise<{data: any[], meta: any, links?: any}>}
 */
export async function getNotifications(params = {}) {
  return get('/inbox', params)
}

/**
 * Get unread notification count
 * @returns {Promise<{count: number} | {data: number} | number>}
 */
export async function getUnreadCount() {
  return get('/inbox/unread-count')
}

/**
 * Mark notification as read
 * @param {string} notificationId
 * @returns {Promise<any>}
 */
export async function markAsRead(notificationId) {
  return patch('/inbox/read', { ids: [notificationId] })
}

/**
 * Mark all notifications as read
 * @returns {Promise<any>}
 */
export async function markAllAsRead() {
  return patch('/inbox/read/all')
}

/**
 * Delete a notification
 * @param {string} notificationId
 * @returns {Promise<any>}
 */
export async function deleteNotification(notificationId) {
  return del(`/inbox/${notificationId}`)
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
