/**
 * Desidia v2 - Task API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all tasks in a project
 * @param {string} projectId
 * @param {Object} params - Query parameters (can include kanbanColumnId, parentId, etc.)
 * @returns {Promise<any>}
 */
export async function getTasks(projectId, params = {}) {
  return get('/tasks', { projectId, ...params })
}

/**
 * Get a single task by ID
 * @param {string} taskId
 * @returns {Promise<any>}
 */
export async function getTask(taskId) {
  return get(`/tasks/${taskId}`)
}

/**
 * Create a new task
 * @param {Object} data - Should include projectId, kanbanColumnId, title, etc.
 * @returns {Promise<any>}
 */
export async function createTask(data) {
  return post('/tasks', data)
}

/**
 * Update a task
 * @param {string} taskId
 * @param {Object} data
 * @returns {Promise<any>}
 */
export async function updateTask(taskId, data) {
  return patch(`/tasks/${taskId}`, data)
}

/**
 * Delete a task
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  return del(`/tasks/${taskId}`)
}

/**
 * Update task status
 * @param {string} taskId
 * @param {string} status - 'completed' or 'incompleted'
 * @returns {Promise<any>}
 */
export async function updateTaskStatus(taskId, status) {
  return patch(`/tasks/${taskId}/status`, { status })
}

/**
 * Update task assignee
 * @param {string} taskId
 * @param {string|null} assigneeId
 * @returns {Promise<any>}
 */
export async function updateTaskAssignee(taskId, assigneeId) {
  return patch(`/tasks/${taskId}/assign`, { assignTo: assigneeId })
}

/**
 * Reorder tasks (for drag & drop)
 * @param {Object} data - { projectId, kanbanColumnId, taskIds }
 * @returns {Promise<void>}
 */
export async function reorderTasks(data) {
  return post('/tasks/reorder', data)
}

// ================================
// Comments (Kept as placeholder, not in tasks-kanban.json but likely exists)
// ================================

/**
 * Get comments for a task
 */
export async function getComments(taskId) {
  return get(`/tasks/${taskId}/comments`)
}

/**
 * Add a comment to a task
 */
export async function addComment(taskId, data) {
  return post(`/tasks/${taskId}/comments`, data)
}

// ================================
// Activity Log (Kept as placeholder)
// ================================

/**
 * Get activity log for a task
 */
export async function getTaskActivity(taskId) {
  return get(`/tasks/${taskId}/activity`)
}

// ================================
// Attachments
// ================================

/**
 * Get task attachments
 * @param {string} taskId
 * @returns {Promise<Attachment[]>}
 */
export async function getAttachments(taskId) {
  return get(`/tasks/${taskId}/attachments`)
}

/**
 * Delete an attachment
 * @param {string} taskId
 * @param {string} attachmentId
 * @returns {Promise<void>}
 */
export async function deleteAttachment(taskId, attachmentId) {
  return del(`/tasks/${taskId}/attachments/${attachmentId}`)
}

// ================================
// Watchers
// ================================

/**
 * Add watcher to task
 * @param {string} taskId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function addWatcher(taskId, userId) {
  return post(`/tasks/${taskId}/watchers`, { userId })
}

/**
 * Remove watcher from task
 * @param {string} taskId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function removeWatcher(taskId, userId) {
  return del(`/tasks/${taskId}/watchers/${userId}`)
}
