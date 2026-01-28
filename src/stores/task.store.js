/**
 * Desidia v2 - Task Store
 * 
 * Manages task state, subtasks, comments, and activity logs
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as taskApi from '@/api/task.api'
import { createTask, createSubtask, createComment, TaskStatus } from '@/models'
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
    assigneeId: null
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
      grouped[status].sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? a.order : Number(a.order) || 0
        const orderB = Number.isFinite(b.order) ? b.order : Number(b.order) || 0
        if (orderA !== orderB) return orderA - orderB
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    })

    return grouped
  })

  const kanbanColumns = computed(() => {
    const map = new Map()
    tasks.value.forEach((task) => {
      const column = task.kanbanColumn
      const columnId = column?.id || task.kanbanColumnId
      if (!columnId || map.has(columnId)) return
      map.set(columnId, {
        id: columnId,
        name: column?.name || '',
        index: column?.index ?? 0
      })
    })
    return Array.from(map.values()).sort((a, b) => {
      const indexA = Number.isFinite(a.index) ? a.index : Number(a.index) || 0
      const indexB = Number.isFinite(b.index) ? b.index : Number(b.index) || 0
      if (indexA !== indexB) return indexA - indexB
      return a.name.localeCompare(b.name)
    })
  })

  const tasksByKanbanColumn = computed(() => {
    const grouped = {}
    tasks.value.forEach((task) => {
      const columnId = task.kanbanColumnId || 'unassigned'
      if (!grouped[columnId]) {
        grouped[columnId] = []
      }
      grouped[columnId].push(task)
    })

    Object.keys(grouped).forEach((columnId) => {
      grouped[columnId].sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? a.order : Number(a.order) || 0
        const orderB = Number.isFinite(b.order) ? b.order : Number(b.order) || 0
        if (orderA !== orderB) return orderA - orderB
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    })

    return grouped
  })

  const hasKanbanColumns = computed(() => kanbanColumns.value.length > 0)

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

    return result
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch tasks for current project
   * @param {Object} params - Query parameters

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
        ...filters.value,
        ...params
      })

      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []

      tasks.value = payload.map(t => createTask(t))

      if (response?.meta?.totalItems !== undefined) {
        pagination.value.total = response.meta.totalItems
        pagination.value.page = response.meta.currentPage || 1
        pagination.value.limit = response.meta.itemsPerPage || pagination.value.limit
      } else {
        pagination.value.total = tasks.value.length
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
      const taskData = data?.task || data?.data || data
      currentTask.value = createTask(taskData)

      const results = await Promise.allSettled([
        fetchSubtasks(taskId)
      ])
      results.forEach((result) => {
        if (result.status === 'rejected') {
          if (import.meta.env.DEV) {
            console.warn('[task.store] related task data failed to load', result.reason)
          }
        }
      })

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
      const response = await taskApi.createTask({
        projectId: projectStore.currentProjectId,
        ...data
      })
      const taskData = response.task || response.data || response
      const task = createTask(taskData)

      // Basic order management for local UI consistency
      if (task.kanbanColumnId) {
        const columnTasks = tasks.value.filter(t => t.kanbanColumnId === task.kanbanColumnId)
        const maxOrder = columnTasks.reduce((max, item) => {
          const order = Number.isFinite(item.order) ? item.order : Number(item.order) || 0
          return Math.max(max, order)
        }, 0)
        task.order = maxOrder + 1
      }

      tasks.value.push(task)
      return response
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
      const taskData = response.task || response.data || response
      const task = createTask(taskData)

      // Update in list
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      }

      // Update current if same
      if (currentTask.value?.id === taskId) {
        currentTask.value = task
      }

      return response
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
    let apiStatus = 'incompleted'
    if (status === TaskStatus.DONE || status === 'completed') {
      apiStatus = 'completed'
    }

    try {
      const response = await taskApi.updateTaskStatus(taskId, apiStatus)
      const taskData = response.task || response.data || response
      const task = createTask(taskData)

      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      }
      if (currentTask.value?.id === taskId) {
        currentTask.value = task
      }

      return response
    } catch (err) {
      error.value = err.message || 'Failed to update status'
      throw err
    }
  }

  /**
   * Update task assignee
   * @param {string} taskId
   * @param {string|null} assigneeId
   */
  async function changeTaskAssignee(taskId, assigneeId) {
    try {
      const response = await taskApi.updateTaskAssignee(taskId, assigneeId)
      const taskData = response.task || response.data || response
      const task = createTask(taskData)

      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = task
      }

      if (currentTask.value?.id === taskId) {
        currentTask.value = task
      }

      return response
    } catch (err) {
      error.value = err.message || 'Failed to update task assignee'
      throw err
    }
  }

  /**
   * Update task description
   * @param {string} taskId
   * @param {string} description - HTML content from NotionEditor
   */
  async function updateTaskDescription(taskId, description) {
    return updateTask(taskId, { description })
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
      const taskIds = tasks.value
        .filter(task => task.kanbanColumnId === targetStatus)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map(task => task.id)
      if (!taskIds.length) return

      const response = await taskApi.reorderTasks({
        projectId: projectStore.currentProjectId,
        kanbanColumnId: targetStatus,
        taskIds
      })

      // Update local state
      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        task.kanbanColumnId = targetStatus
        task.order = newOrder
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to reorder task'
      throw err
    }
  }

  /**
   * Reorder tasks for Kanban columns
   * @param {string} taskId
   * @param {string} kanbanColumnId
   * @param {string[]} taskIds
   */
  async function reorderKanbanTasks(taskId, kanbanColumnId, taskIds) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId || !kanbanColumnId) return

    try {
      const orderedIds = Array.from(new Set(taskIds.filter(Boolean)))
      if (!orderedIds.length) return

      const response = await taskApi.reorderTasks({
        projectId: projectStore.currentProjectId,
        kanbanColumnId,
        taskIds: orderedIds
      })

      const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
      tasks.value = tasks.value.map((task) => {
        if (!orderMap.has(task.id)) return task
        return {
          ...task,
          kanbanColumnId,
          order: orderMap.get(task.id)
        }
      })

      return response
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
    // TODO: Re-enable when backend implements GET /tasks/my-tasks endpoint
    // Currently disabled to prevent 404 errors in the frontend
    console.warn('[task.store] fetchMyTasks disabled - backend not implemented yet')
    myTasks.value = []
    return myTasks.value

    // Original implementation:
    // isLoading.value = true
    // error.value = null

    // try {
    //   const response = await taskApi.getMyTasks(params)
    //   myTasks.value = (response.tasks || response).map(t => createTask(t))
    //   return myTasks.value
    // } catch (err) {
    //   error.value = err.message || 'Failed to fetch my tasks'
    //   throw err
    // } finally {
    //   isLoading.value = false
    // }
  }

  // ================================
  // Subtask Actions
  // ================================

  async function fetchSubtasks(taskId) {
    if (!currentTask.value?.projectId) return []
    try {
      // Fetch tasks that have this taskId as parentId
      const response = await taskApi.getTasks(currentTask.value.projectId, { parentId: taskId })
      const payload = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      subtasks.value = payload.map(s => createTask(s))
      return subtasks.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch subtasks'
      throw err
    }
  }

  async function addSubtask(data) {
    if (!currentTask.value) return null

    try {
      const response = await taskApi.createTask({
        projectId: currentTask.value.projectId,
        parentId: currentTask.value.id,
        kanbanColumnId: currentTask.value.kanbanColumnId,
        ...data
      })
      const taskData = response.task || response.data || response
      const subtask = createTask(taskData)
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
      const subtask = subtasks.value.find(s => s.id === subtaskId)
      if (!subtask) return

      const newStatus = subtask.status === 'completed' || subtask.status === TaskStatus.DONE
        ? 'incompleted'
        : 'completed'

      const response = await taskApi.updateTaskStatus(subtaskId, newStatus)
      const taskData = response.task || response.data || response
      const updated = createTask(taskData)

      const index = subtasks.value.findIndex(s => s.id === subtaskId)
      if (index !== -1) {
        subtasks.value[index] = updated
      }
    } catch (err) {
      error.value = err.message || 'Failed to toggle subtask'
      throw err
    }
  }

  async function deleteSubtaskItem(subtaskId) {
    try {
      await taskApi.deleteTask(subtaskId)
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
      assigneeId: null
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

  function setCurrentTask(task) {
    currentTask.value = task
    // Reset related data when setting a new task
    subtasks.value = task?.children?.map((child, index) => ({
      id: child.id || `subtask-${index}`,
      title: child.title,
      isCompleted: child.status === 'Done' || child.status === 'done',
      assignee: child.assignee ? { name: child.assignee } : null
    })) || []
    comments.value = []
    activityLog.value = []
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
    kanbanColumns,
    tasksByKanbanColumn,
    hasKanbanColumns,
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
    updateTaskDescription,
    reorderTask,
    reorderKanbanTasks,
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
    setCurrentTask,
    clearCurrentTask,
    clearState
  }
})

