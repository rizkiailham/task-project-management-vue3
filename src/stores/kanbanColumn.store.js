/**
 * Desidia v2 - Kanban Column Store
 *
 * Manages kanban column state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as kanbanColumnApi from '@/api/kanbanColumn.api'
import { createKanbanColumn } from '@/models'
import { useProjectStore } from './project.store'

export const useKanbanColumnStore = defineStore('kanbanColumn', () => {
  // ================================
  // State
  // ================================
  const columns = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const hasLoaded = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // ================================
  // Getters
  // ================================
  const columnCount = computed(() => columns.value.length)
  const sortedColumns = computed(() => {
    return [...columns.value].sort((a, b) => {
      const indexA = Number.isFinite(a.index) ? a.index : Number(a.index) || 0
      const indexB = Number.isFinite(b.index) ? b.index : Number(b.index) || 0
      if (indexA !== indexB) return indexA - indexB
      return a.name.localeCompare(b.name)
    })
  })

  // ================================
  // Actions
  // ================================
  async function fetchColumns(params = {}) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return []

    isLoading.value = true
    error.value = null

    try {
      const response = await kanbanColumnApi.getKanbanColumns({
        page: pagination.value.page,
        limit: pagination.value.limit,
        sortBy: 'index:ASC',
        projectId: projectStore.currentProjectId,
        ...params
      })

      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []

      columns.value = payload.map((column) => createKanbanColumn(column))

      if (response?.meta?.totalItems !== undefined) {
        pagination.value = {
          page: response.meta.currentPage || 1,
          limit: response.meta.itemsPerPage || pagination.value.limit,
          total: response.meta.totalItems || 0,
          totalPages: response.meta.totalPages || 1
        }
      } else {
        pagination.value.total = columns.value.length
      }

      return columns.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch kanban columns'
      throw err
    } finally {
      isLoading.value = false
      hasLoaded.value = true
    }
  }

  async function createColumn(data) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return null

    isLoading.value = true
    error.value = null

    try {
      const response = await kanbanColumnApi.createKanbanColumn({
        projectId: projectStore.currentProjectId,
        ...data
      })
      const columnData = response.column || response.data || response
      const column = createKanbanColumn(columnData)
      columns.value.push(column)
      return response
    } catch (err) {
      error.value = err.message || 'Failed to create kanban column'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateColumn(columnId, data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await kanbanColumnApi.updateKanbanColumn(columnId, data)
      const columnData = response.column || response.data || response
      const updated = createKanbanColumn(columnData)
      const index = columns.value.findIndex((column) => column.id === columnId)
      if (index !== -1) {
        columns.value[index] = updated
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to update kanban column'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteColumn(columnId) {
    isLoading.value = true
    error.value = null

    try {
      const response = await kanbanColumnApi.deleteKanbanColumn(columnId)
      columns.value = columns.value.filter((column) => column.id !== columnId)
      return response
    } catch (err) {
      error.value = err.message || 'Failed to delete kanban column'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function reorderColumns(columnIds) {
    const projectStore = useProjectStore()
    if (!projectStore.currentProjectId) return

    const orderedIds = Array.from(new Set(columnIds.filter(Boolean)))
    if (!orderedIds.length) return

    try {
      const response = await kanbanColumnApi.reorderKanbanColumns({
        projectId: projectStore.currentProjectId,
        columnIds: orderedIds
      })
      const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]))
      columns.value = columns.value.map((column) => {
        if (!orderMap.has(column.id)) return column
        return { ...column, index: orderMap.get(column.id) }
      })
      return response
    } catch (err) {
      error.value = err.message || 'Failed to reorder kanban columns'
      throw err
    }
  }

  function clearState() {
    columns.value = []
    error.value = null
    hasLoaded.value = false
  }

  return {
    columns,
    sortedColumns,
    columnCount,
    isLoading,
    error,
    hasLoaded,
    pagination,
    fetchColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    clearState
  }
})
