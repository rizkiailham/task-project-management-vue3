/**
 * Desidia v2 - Task API
 */

import { get, post, patch, del } from './httpClient'

/**
 * Get all tasks in a project
 * @param {string} projectId
 * @param {Object} params - Query parameters (status, assignee, priority, etc.)
 * @returns {Promise<{tasks: Task[], total: number, page: number, limit: number}>}
 */
export async function getTasks(projectId, params = {}) {
  return get(`/projects/${projectId}/tasks`, params)
}

/**
 * Get a single task by ID
 * @param {string} taskId
 * @returns {Promise<Task>}
 */
export async function getTask(taskId) {
  return get(`/tasks/${taskId}`)
}

/**
 * Create a new task
 * @param {string} projectId
 * @param {Object} data
 * @returns {Promise<Task>}
 */
export async function createTask(projectId, data) {
  return post(`/projects/${projectId}/tasks`, data)
}

/**
 * Update a task
 * @param {string} taskId
 * @param {Object} data
 * @returns {Promise<Task>}
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
 * Get tasks assigned to current user (My Tasks)
 * @param {Object} params
 * @returns {Promise<{tasks: Task[], total: number}>}
 */
export async function getMyTasks(params = {}) {
  return get('/tasks/my-tasks', params)
}

/**
 * Update task status
 * @param {string} taskId
 * @param {string} status
 * @returns {Promise<Task>}
 */
export async function updateTaskStatus(taskId, status) {
  return patch(`/tasks/${taskId}/status`, { status })
}

/**
 * Update task assignee
 * @param {string} taskId
 * @param {string|null} assigneeId
 * @returns {Promise<Task>}
 */
export async function updateTaskAssignee(taskId, assigneeId) {
  return patch(`/tasks/${taskId}/assignee`, { assigneeId })
}

/**
 * Reorder tasks (for drag & drop)
 * @param {string} projectId
 * @param {Object} data
 * @param {string} data.taskId
 * @param {string} data.targetStatus - New status column
 * @param {number} data.newOrder - New position
 * @returns {Promise<void>}
 */
export async function reorderTasks(projectId, data) {
  return post(`/projects/${projectId}/tasks/reorder`, data)
}

/**
 * Bulk update tasks
 * @param {string[]} taskIds
 * @param {Object} data - Fields to update
 * @returns {Promise<Task[]>}
 */
export async function bulkUpdateTasks(taskIds, data) {
  return post('/tasks/bulk-update', { taskIds, ...data })
}

/**
 * Bulk delete tasks
 * @param {string[]} taskIds
 * @returns {Promise<void>}
 */
export async function bulkDeleteTasks(taskIds) {
  return post('/tasks/bulk-delete', { taskIds })
}

// ================================
// Subtasks
// ================================

/**
 * Get subtasks of a task
 * @param {string} taskId
 * @returns {Promise<Subtask[]>}
 */
export async function getSubtasks(taskId) {
  return get(`/tasks/${taskId}/subtasks`)
}

/**
 * Create a subtask
 * @param {string} taskId
 * @param {Object} data
 * @returns {Promise<Subtask>}
 */
export async function createSubtask(taskId, data) {
  return post(`/tasks/${taskId}/subtasks`, data)
}

/**
 * Update a subtask
 * @param {string} taskId
 * @param {string} subtaskId
 * @param {Object} data
 * @returns {Promise<Subtask>}
 */
export async function updateSubtask(taskId, subtaskId, data) {
  return patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data)
}

/**
 * Delete a subtask
 * @param {string} taskId
 * @param {string} subtaskId
 * @returns {Promise<void>}
 */
export async function deleteSubtask(taskId, subtaskId) {
  return del(`/tasks/${taskId}/subtasks/${subtaskId}`)
}

/**
 * Toggle subtask completion
 * @param {string} taskId
 * @param {string} subtaskId
 * @returns {Promise<Subtask>}
 */
export async function toggleSubtask(taskId, subtaskId) {
  return post(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`)
}

// ================================
// Comments
// ================================

/**
 * Get comments for a task
 * @param {string} taskId
 * @returns {Promise<Comment[]>}
 */
export async function getComments(taskId) {
  return get(`/tasks/${taskId}/comments`)
}

/**
 * Add a comment to a task
 * @param {string} taskId
 * @param {Object} data
 * @returns {Promise<Comment>}
 */
export async function addComment(taskId, data) {
  return post(`/tasks/${taskId}/comments`, data)
}

/**
 * Update a comment
 * @param {string} taskId
 * @param {string} commentId
 * @param {Object} data
 * @returns {Promise<Comment>}
 */
export async function updateComment(taskId, commentId, data) {
  return patch(`/tasks/${taskId}/comments/${commentId}`, data)
}

/**
 * Delete a comment
 * @param {string} taskId
 * @param {string} commentId
 * @returns {Promise<void>}
 */
export async function deleteComment(taskId, commentId) {
  return del(`/tasks/${taskId}/comments/${commentId}`)
}

// ================================
// Activity Log
// ================================

/**
 * Get activity log for a task
 * @param {string} taskId
 * @returns {Promise<ActivityLog[]>}
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

