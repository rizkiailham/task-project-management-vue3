/**
 * Desidia v2 - Task Store
 * 
 * Manages task state, subtasks, comments, and activity logs
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import * as taskApi from '@/api/task.api'
import { createTask, createSubtask, createComment, TaskStatus } from '@/models'
import { useProjectStore } from './project.store'
import { useAuthStore } from './auth.store'

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

  const projectStore = useProjectStore()
  const inFlightTaskFetches = new Map()
  const loadedSubtasksByParent = new Set()
  let latestTaskFetchToken = 0

  const buildSubtaskCacheKey = (projectItemId, parentId) =>
    `${projectItemId}:${parentId}`

  function resetTaskDetailState({ keepCurrentTask = false } = {}) {
    if (!keepCurrentTask) {
      currentTask.value = null
    }
    subtasks.value = []
    comments.value = []
    activityLog.value = []
  }

  function clearSubtaskCache() {
    loadedSubtasksByParent.clear()
  }

  watch(
    () => projectStore.activeProjectItemId,
    (nextId, prevId) => {
      if (!nextId || String(nextId) === String(prevId)) return
      resetTaskDetailState()
      clearSubtaskCache()
    }
  )

  watch(
    () => projectStore.currentProjectId,
    (nextId, prevId) => {
      if (!nextId || String(nextId) === String(prevId)) return
      resetTaskDetailState()
      clearSubtaskCache()
    }
  )

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

  function upsertTasks(nextTasks) {
    if (!Array.isArray(nextTasks) || nextTasks.length === 0) return
    const indexById = new Map(tasks.value.map((task, index) => [String(task.id), index]))
    nextTasks.forEach((task) => {
      const key = String(task.id)
      if (indexById.has(key)) {
        tasks.value[indexById.get(key)] = task
      } else {
        tasks.value.push(task)
      }
    })
  }

  function flattenRawTasks(raw, acc = []) {
    if (!raw) return acc
    const { subTasks, children, ...rest } = raw
    acc.push(rest)
    const nested = Array.isArray(subTasks) ? subTasks : Array.isArray(children) ? children : []
    nested.forEach((item) => flattenRawTasks(item, acc))
    return acc
  }

  function resolveProjectItemId(projectItemId) {
    return (
      projectItemId ||
      projectStore.activeProjectItemId ||
      currentTask.value?.projectItemId ||
      currentTask.value?.projectId ||
      null
    )
  }

  function findTaskById(taskId) {
    if (!taskId) return null
    const taskIdStr = String(taskId)

    const fromCurrent =
      currentTask.value?.id && String(currentTask.value.id) === taskIdStr
        ? currentTask.value
        : null
    if (fromCurrent) return fromCurrent

    const fromSubtasks = subtasks.value.find((task) => String(task.id) === taskIdStr)
    if (fromSubtasks) return fromSubtasks

    return tasks.value.find((task) => String(task.id) === taskIdStr) || null
  }

  function resolveProjectItemIdForTask(taskId, projectItemId = null) {
    if (projectItemId) return projectItemId

    const task = findTaskById(taskId)
    if (!task) return resolveProjectItemId(null)

    const taskProjectItemId = task.projectItemId || task.projectId
    if (taskProjectItemId) return taskProjectItemId

    const parentId = task.parentId || task.parentTaskId
    if (!parentId) return resolveProjectItemId(null)

    const parentTask = findTaskById(parentId)
    const parentProjectItemId = parentTask?.projectItemId || parentTask?.projectId
    if (parentProjectItemId) return parentProjectItemId

    return resolveProjectItemId(null)
  }

  // ================================
  // Actions
  // ================================

  /**
   * Fetch tasks for current project
   * @param {Object} params - Query parameters
   */
  async function fetchTasks(params = {}) {
    const projectStore = useProjectStore()
    const projectId = projectStore.activeProjectItemId
    if (!projectId) return []

    isLoading.value = true
    error.value = null

    try {
      const response = await taskApi.getTasks({
        projectItemId: projectId,
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
  async function fetchTask(taskId, options = {}) {
    if (!taskId) return null

    const force = options.force === true
    const currentId = currentTask.value?.id

    if (!force && currentId && String(currentId) === String(taskId) && !isLoadingTask.value) {
      return currentTask.value
    }

    if (inFlightTaskFetches.has(taskId)) {
      return inFlightTaskFetches.get(taskId)
    }

    const isSwitchingTask = currentId && String(currentId) !== String(taskId)
    resetTaskDetailState({ keepCurrentTask: !isSwitchingTask })
    isLoadingTask.value = true
    error.value = null

    const fetchToken = ++latestTaskFetchToken

    const promise = (async () => {
      try {
        const data = await taskApi.getTask(taskId)
        if (fetchToken !== latestTaskFetchToken) return null

        const taskData = data?.task || data?.data || data
        const nextTask = createTask(taskData)
        currentTask.value = nextTask
        upsertTasks([nextTask])
        subtasks.value = Array.isArray(nextTask.children) ? nextTask.children : []

        const projectItemId = resolveProjectItemId(nextTask.projectItemId || nextTask.projectId)
        if (projectItemId) {
          loadedSubtasksByParent.add(buildSubtaskCacheKey(projectItemId, nextTask.id))
        }

        return currentTask.value
      } catch (err) {
        error.value = err.message || 'Failed to fetch task'
        throw err
      } finally {
        if (fetchToken === latestTaskFetchToken) {
          isLoadingTask.value = false
        }
        inFlightTaskFetches.delete(taskId)
      }
    })()

    inFlightTaskFetches.set(taskId, promise)
    return promise
  }

  /**
   * Create a new task
   * @param {Object} data
   */
  async function createNewTask(data) {
    const requestedParentId = data?.parentId || data?.parentTaskId || null
    const isSubtaskCreate = Boolean(requestedParentId)
    if (!isSubtaskCreate) {
      isLoading.value = true
    }
    error.value = null

    try {
      const parentTask = requestedParentId ? findTaskById(requestedParentId) : null
      const resolvedProjectItemId = resolveProjectItemId(
        data?.projectItemId || parentTask?.projectItemId || parentTask?.projectId
      )
      if (!resolvedProjectItemId) return null

      const response = await taskApi.createTask({
        ...data,
        projectItemId: resolvedProjectItemId
      }, isSubtaskCreate ? { metadata: { skipGlobalLoader: true } } : {})
      const taskData = response.task || response.data || response
      let task = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })

      // If creating a subtask, update parent's children array for immediate UI reflection
      if (requestedParentId) {
        const parentIndex = tasks.value.findIndex(t => String(t.id) === String(requestedParentId))
        if (parentIndex !== -1) {
          const parent = tasks.value[parentIndex]
          const children = Array.isArray(parent.subTasks) ? parent.subTasks
            : Array.isArray(parent.children) ? parent.children : []

          tasks.value[parentIndex] = {
            ...parent,
            subTasks: [...children, task],
            children: [...children, task]
          }
        }
      }

      if (requestedParentId && (taskData?.subTasks || taskData?.children)) {
        const flattened = flattenRawTasks(taskData)
        const mapped = flattened.map((item) =>
          createTask({
            ...item,
            projectItemId: item?.projectItemId || resolvedProjectItemId
          })
        )
        upsertTasks(mapped)

        const createdCandidates = mapped.filter((item) => {
          const parentId = item.parentId || item.parentTaskId
          return parentId && String(parentId) === String(requestedParentId)
        })
        if (createdCandidates.length) {
          createdCandidates.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          task = createdCandidates[0]
        }
      }

      // Basic order management for local UI consistency
      if (task.kanbanColumnId) {
        const columnTasks = tasks.value.filter(t => t.kanbanColumnId === task.kanbanColumnId)
        const minOrder = columnTasks.reduce((min, item) => {
          const order = Number.isFinite(item.order) ? item.order : Number(item.order) || 0
          return Math.min(min, order)
        }, Number.MAX_SAFE_INTEGER)

        const safeMin = minOrder === Number.MAX_SAFE_INTEGER ? 0 : minOrder
        // Assign smaller order to put at top. 
        // Note: Backend should support negative or float order, or handle reordering separately.
        task.order = safeMin - 1
      }

      if (task?.id) {
        upsertTasks([task])
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to create task'
      throw err
    } finally {
      if (!isSubtaskCreate) {
        isLoading.value = false
      }
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
      const resolvedProjectItemId = resolveProjectItemIdForTask(taskId, data?.projectItemId)
      const payload = {
        ...data,
        ...(resolvedProjectItemId ? { projectItemId: resolvedProjectItemId } : {})
      }
      const response = await taskApi.updateTask(taskId, payload)
      const taskData = response.task || response.data || response
      const task = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })

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
      const resolvedProjectItemId = resolveProjectItemIdForTask(taskId)
      await taskApi.deleteTask(taskId, resolvedProjectItemId)
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
      const resolvedProjectItemId = resolveProjectItemIdForTask(taskId)
      const response = await taskApi.updateTaskStatus(taskId, apiStatus, resolvedProjectItemId)
      const taskData = response.task || response.data || response
      const task = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })

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
      const resolvedProjectItemId = resolveProjectItemIdForTask(taskId)
      const response = await taskApi.updateTaskAssignee(taskId, assigneeId, resolvedProjectItemId)
      const taskData = response.task || response.data || response
      const task = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })

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
    const projectId = projectStore.activeProjectItemId
    if (!projectId) return

    try {
      const taskIds = tasks.value
        .filter(task => task.kanbanColumnId === targetStatus)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map(task => task.id)
      if (!taskIds.length) return

      const response = await taskApi.reorderTasks({
        projectItemId: projectId,
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
    const projectId = projectStore.activeProjectItemId
    if (!projectId || !kanbanColumnId) return

    try {
      const orderedIds = Array.from(new Set(taskIds.filter(Boolean)))
      if (!orderedIds.length) return

      const response = await taskApi.reorderTasks({
        projectItemId: projectId,
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
    const { silent = false, ...queryParams } = params
    if (!silent) {
      isLoading.value = true
    }
    error.value = null

    try {
      const authStore = useAuthStore()
      // Try to fetch specific "my tasks" if endpoint exists, otherwise use getTasks with assigneeId
      const response = await taskApi.getTasks({
        assigneeId: authStore.userId,
        ...queryParams
      }, silent ? { metadata: { skipGlobalLoader: true } } : {})

      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.tasks)
          ? response.tasks
          : Array.isArray(response)
            ? response
            : []

      myTasks.value = payload.map(t => createTask(t))

      if (response?.meta?.totalItems !== undefined) {
        pagination.value.total = response.meta.totalItems
        pagination.value.page = response.meta.currentPage || 1
        pagination.value.limit = response.meta.itemsPerPage || pagination.value.limit
        pagination.value.totalPages = response.meta.totalPages || 1
      } else {
        pagination.value.total = myTasks.value.length
      }

      return myTasks.value
    } catch (err) {
      console.warn('Failed to fetch my tasks (might need project context)', err)
      return []
    } finally {
      if (!silent) {
        isLoading.value = false
      }
    }
  }

  // ================================
  // Subtask Actions
  // ================================

  async function fetchSubtasksForParent(parentId, options = {}) {
    const resolvedProjectItemId = resolveProjectItemId(options.projectItemId)
    if (!parentId || !resolvedProjectItemId) return []

    const cacheKey = buildSubtaskCacheKey(resolvedProjectItemId, parentId)
    if (!options.force && loadedSubtasksByParent.has(cacheKey)) {
      return tasks.value.filter((task) => {
        const taskParentId = task.parentId || task.parentTaskId
        return taskParentId && String(taskParentId) === String(parentId)
      })
    }

    const fromTasks = tasks.value.filter((task) => {
      const taskParentId = task.parentId || task.parentTaskId
      return taskParentId && String(taskParentId) === String(parentId)
    })
    if (fromTasks.length) {
      loadedSubtasksByParent.add(cacheKey)
      return fromTasks
    }

    const parentTask = currentTask.value?.id && String(currentTask.value.id) === String(parentId)
      ? currentTask.value
      : tasks.value.find((task) => String(task.id) === String(parentId))

    const rawChildren = parentTask?.children || parentTask?.subTasks || []
    const mapped = Array.isArray(rawChildren) ? rawChildren.map((item) => createTask(item)) : []
    if (mapped.length) {
      upsertTasks(mapped)
      loadedSubtasksByParent.add(cacheKey)
      return mapped
    }

    loadedSubtasksByParent.add(cacheKey)
    return []
  }

  async function fetchSubtasks(taskId, options = {}) {
    const results = await fetchSubtasksForParent(taskId, options)
    if (currentTask.value?.id && String(currentTask.value.id) === String(taskId)) {
      subtasks.value = results
    }
    return results
  }

  async function addSubtask(data) {
    if (!currentTask.value) return null

    try {
      const resolvedProjectItemId = resolveProjectItemIdForTask(
        currentTask.value.id,
        data?.projectItemId || currentTask.value.projectItemId || currentTask.value.projectId
      )
      if (!resolvedProjectItemId) return null

      const response = await taskApi.createTask({
        projectItemId: resolvedProjectItemId,
        kanbanColumnId: currentTask.value.kanbanColumnId,
        parentId: currentTask.value.id,
        ...data
      })
      const taskData = response.task || response.data || response
      const subtask = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })
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

      const resolvedProjectItemId = resolveProjectItemIdForTask(
        subtaskId,
        subtask.projectItemId || subtask.projectId
      )
      const response = await taskApi.updateTaskStatus(subtaskId, newStatus, resolvedProjectItemId)
      const taskData = response.task || response.data || response
      const updated = createTask({
        ...taskData,
        projectItemId: taskData?.projectItemId || resolvedProjectItemId
      })

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
      const resolvedProjectItemId = resolveProjectItemIdForTask(subtaskId)
      await taskApi.deleteTask(subtaskId, resolvedProjectItemId)
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
    resetTaskDetailState()
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

    const projectItemId = resolveProjectItemId(task?.projectItemId || task?.projectId)
    if (task?.id && projectItemId) {
      loadedSubtasksByParent.add(buildSubtaskCacheKey(projectItemId, task.id))
    }
  }

  function clearCurrentTask() {
    resetTaskDetailState()
  }

  function clearState() {
    tasks.value = []
    resetTaskDetailState()
    myTasks.value = []
    error.value = null
    clearFilters()
    clearSubtaskCache()
    inFlightTaskFetches.clear()
    latestTaskFetchToken = 0
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
    fetchSubtasksForParent,
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

