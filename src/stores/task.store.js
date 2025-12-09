/**
 * Desidia v2 - Task Store
 * 
 * Manages task state, subtasks, comments, and activity logs
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as taskApi from '@/api/task.api'
import { createTask, createSubtask, createComment, TaskStatus, TaskPriority } from '@/models'
import { useProjectStore } from './project.store'

export const useTaskStore = defineStore('task', () => {
  // ================================
  // State
  // ================================
  const tasks = ref([])
  const currentTask = ref(null)
  const subtasks = ref([])
  const comments = ref([])
  const activityLog = ref([])
  const myTasks = ref([])
  const isLoading = ref(false)
  const isLoadingTask = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 50,
    total: 0
  })
  const filters = ref({
    status: null,
    priority: null,
    assigneeId: null,
    search: ''
  })

  // ================================
  // Getters
  // ================================
  const currentTaskId = computed(() => currentTask.value?.id || null)

  const taskCount = computed(() => tasks.value.length)

  const tasksByStatus = computed(() => {
    const grouped = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
      [TaskStatus.BLOCKED]: []
    }

    tasks.value.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })

    // Sort by order within each status
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => a.order - b.order)
    })

    return grouped
  })

  const tasksByPriority = computed(() => {
    return tasks.value.reduce((acc, task) => {
      if (!acc[task.priority]) {
        acc[task.priority] = []
      }
      acc[task.priority].push(task)
      return acc
    }, {})
  })

  const tasksByAssignee = computed(() => {
    return tasks.value.reduce((acc, task) => {
      const key = task.assigneeId || 'unassigned'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(task)
      return acc
    }, {})
  })

  const completedTasks = computed(() =>
    tasks.value.filter(t => t.status === TaskStatus.DONE)
  )

  const pendingTasks = computed(() =>
    tasks.value.filter(t => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED)
  )

  const overdueTasks = computed(() => {
    const now = new Date()
    return tasks.value.filter(t => {
      if (!t.dueDate || t.status === TaskStatus.DONE) return false
      return new Date(t.dueDate) < now
    })
  })

  const subtaskProgress = computed(() => {
    if (!currentTask.value) return 0
    const total = currentTask.value.subtaskCount || subtasks.value.length
    const completed = currentTask.value.completedSubtaskCount || 
      subtasks.value.filter(s => s.isCompleted).length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  })

  const filteredTasks = computed(() => {
    let result = [...tasks.value]

    if (filters.value.status) {
      result = result.filter(t => t.status === filters.value.status)
    }

    if (filters.value.priority) {
      result = result.filter(t => t.priority === filters.value.priority)
    }

    if (filters.value.assigneeId) {
      result = result.filter(t => t.assigneeId === filters.value.assigneeId)
    }

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      )
    }

    return result
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch tasks for current project
   * @param {Object} params - Query parameters
   */
  async function fetchTasks(params = {}) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return []

    isLoading.value = true
    error.value = null

    try {
      const response = await taskApi.getTasks(projectStore.currentProjectId, {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...filters.value,
        ...params
      })

      tasks.value = (response.tasks || response).map(t => createTask(t))
      
      if (response.total !== undefined) {
        pagination.value.total = response.total
      }

      return tasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch tasks'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a single task with details
   * @param {string} taskId
   */
  async function fetchTask(taskId) {
    isLoadingTask.value = true
    error.value = null

    try {
      const data = await taskApi.getTask(taskId)
      currentTask.value = createTask(data)

      // Fetch subtasks and comments in parallel
      await Promise.all([
        fetchSubtasks(taskId),
        fetchComments(taskId),
        fetchActivity(taskId)
      ])

      return currentTask.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch task'
      throw err
    } finally {
      isLoadingTask.value = false
    }
  }

  /**
   * Create a new task
   * @param {Object} data
   */
  async function createNewTask(data) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return null

    isLoading.value = true
    error.value = null

    try {
      const response = await taskApi.createTask(projectStore.currentProjectId, data)
      const task = createTask(response)
      tasks.value.unshift(task)
      return task
    } catch (err) {
      error.value = err.message || 'Failed to create task'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a task
   * @param {string} taskId
   * @param {Object} data
   */
  async function updateTask(taskId, data) {
    error.value = null

    try {
      const response = await taskApi.updateTask(taskId, data)
      const task = createTask(response)

      // Update in list
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      }

      // Update current if same
      if (currentTask.value?.id === taskId) {
        currentTask.value = task
      }

      return task
    } catch (err) {
      error.value = err.message || 'Failed to update task'
      throw err
    }
  }

  /**
   * Delete a task
   * @param {string} taskId
   */
  async function deleteTask(taskId) {
    error.value = null

    try {
      await taskApi.deleteTask(taskId)
      tasks.value = tasks.value.filter(t => t.id !== taskId)

      if (currentTask.value?.id === taskId) {
        currentTask.value = null
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete task'
      throw err
    }
  }

  /**
   * Update task status
   * @param {string} taskId
   * @param {string} status
   */
  async function changeTaskStatus(taskId, status) {
    return updateTask(taskId, { status })
  }

  /**
   * Update task assignee
   * @param {string} taskId
   * @param {string|null} assigneeId
   */
  async function changeTaskAssignee(taskId, assigneeId) {
    return updateTask(taskId, { assigneeId })
  }

  /**
   * Reorder tasks (for drag & drop)
   * @param {string} taskId
   * @param {string} targetStatus
   * @param {number} newOrder
   */
  async function reorderTask(taskId, targetStatus, newOrder) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return

    try {
      await taskApi.reorderTasks(projectStore.currentProjectId, {
        taskId,
        targetStatus,
        newOrder
      })

      // Update local state
      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = targetStatus
        task.order = newOrder
      }
    } catch (err) {
      error.value = err.message || 'Failed to reorder task'
      throw err
    }
  }

  /**
   * Fetch my tasks (assigned to current user)
   * @param {Object} params
   */
  async function fetchMyTasks(params = {}) {
    isLoading.value = true
    error.value = null

    try {
      const response = await taskApi.getMyTasks(params)
      myTasks.value = (response.tasks || response).map(t => createTask(t))
      return myTasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch my tasks'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ================================
  // Subtask Actions
  // ================================

  async function fetchSubtasks(taskId) {
    try {
      const data = await taskApi.getSubtasks(taskId)
      subtasks.value = data.map(s => createSubtask(s))
      return subtasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch subtasks'
      throw err
    }
  }

  async function addSubtask(data) {
    if (!currentTask.value) return null

    try {
      const response = await taskApi.createSubtask(currentTask.value.id, data)
      const subtask = createSubtask(response)
      subtasks.value.push(subtask)
      return subtask
    } catch (err) {
      error.value = err.message || 'Failed to create subtask'
      throw err
    }
  }

  async function toggleSubtaskCompletion(subtaskId) {
    if (!currentTask.value) return

    try {
      const response = await taskApi.toggleSubtask(currentTask.value.id, subtaskId)
      const index = subtasks.value.findIndex(s => s.id === subtaskId)
      if (index !== -1) {
        subtasks.value[index] = createSubtask(response)
      }
    } catch (err) {
      error.value = err.message || 'Failed to toggle subtask'
      throw err
    }
  }

  async function deleteSubtaskItem(subtaskId) {
    if (!currentTask.value) return

    try {
      await taskApi.deleteSubtask(currentTask.value.id, subtaskId)
      subtasks.value = subtasks.value.filter(s => s.id !== subtaskId)
    } catch (err) {
      error.value = err.message || 'Failed to delete subtask'
      throw err
    }
  }

  // ================================
  // Comment Actions
  // ================================

  async function fetchComments(taskId) {
    try {
      const data = await taskApi.getComments(taskId)
      comments.value = data.map(c => createComment(c))
      return comments.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch comments'
      throw err
    }
  }

  async function addCommentToTask(content) {
    if (!currentTask.value) return null

    try {
      const response = await taskApi.addComment(currentTask.value.id, { content })
      const comment = createComment(response)
      comments.value.push(comment)
      return comment
    } catch (err) {
      error.value = err.message || 'Failed to add comment'
      throw err
    }
  }

  async function deleteCommentFromTask(commentId) {
    if (!currentTask.value) return

    try {
      await taskApi.deleteComment(currentTask.value.id, commentId)
      comments.value = comments.value.filter(c => c.id !== commentId)
    } catch (err) {
      error.value = err.message || 'Failed to delete comment'
      throw err
    }
  }

  // ================================
  // Activity Log Actions
  // ================================

  async function fetchActivity(taskId) {
    try {
      const data = await taskApi.getTaskActivity(taskId)
      activityLog.value = data
      return activityLog.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch activity'
      throw err
    }
  }

  // ================================
  // Filter Actions
  // ================================

  function setFilter(key, value) {
    filters.value[key] = value
  }

  function clearFilters() {
    filters.value = {
      status: null,
      priority: null,
      assigneeId: null,
      search: ''
    }
  }

  function setPage(page) {
    pagination.value.page = page
  }

  // ================================
  // Utility Actions
  // ================================

  function getTask(taskId) {
    return tasks.value.find(t => t.id === taskId)
  }

  function clearCurrentTask() {
    currentTask.value = null
    subtasks.value = []
    comments.value = []
    activityLog.value = []
  }

  function clearState() {
    tasks.value = []
    currentTask.value = null
    subtasks.value = []
    comments.value = []
    activityLog.value = []
    myTasks.value = []
    error.value = null
    clearFilters()
  }

  return {
    // State
    tasks,
    currentTask,
    subtasks,
    comments,
    activityLog,
    myTasks,
    isLoading,
    isLoadingTask,
    error,
    pagination,
    filters,

    // Getters
    currentTaskId,
    taskCount,
    tasksByStatus,
    tasksByPriority,
    tasksByAssignee,
    completedTasks,
    pendingTasks,
    overdueTasks,
    subtaskProgress,
    filteredTasks,

    // Task Actions
    fetchTasks,
    fetchTask,
    createNewTask,
    updateTask,
    deleteTask,
    changeTaskStatus,
    changeTaskAssignee,
    reorderTask,
    fetchMyTasks,

    // Subtask Actions
    fetchSubtasks,
    addSubtask,
    toggleSubtaskCompletion,
    deleteSubtaskItem,

    // Comment Actions
    fetchComments,
    addCommentToTask,
    deleteCommentFromTask,

    // Activity Actions
    fetchActivity,

    // Filter Actions
    setFilter,
    clearFilters,
    setPage,

    // Utility Actions
    getTask,
    clearCurrentTask,
    clearState
  }
})

