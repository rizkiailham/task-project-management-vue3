/**
 * Desidia v2 - Inbox Store
 * 
 * Manages inbox data (notifications list) for the Inbox View
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as notificationApi from '@/api/notification.api'
import { useNotificationStore } from './notification.store'

export const useInboxStore = defineStore('inbox', () => {
  const notificationStore = useNotificationStore()

  // ================================
  // State
  // ================================
  const items = ref([])
  const isLoading = ref(false)
  const filterMode = ref('unread') // 'unread' | 'all'

  // Pagination state
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // ================================
  // Getters
  // ================================
  const hasItems = computed(() => items.value.length > 0)

  const totalItems = computed(() => pagination.value.total)

  // ================================
  // Actions
  // ================================

  function resolveUserFromPayload(payload) {
    const candidate = payload?.createdBy || payload?.updatedBy || payload?.user || null
    if (!candidate) return null
    const firstName = candidate.firstName || ''
    const lastName = candidate.lastName || ''
    const name = `${firstName} ${lastName}`.trim() || candidate.name || candidate.email || ''
    return {
      id: candidate.id || null,
      name,
      avatar: candidate.avatar || null,
      email: candidate.email || ''
    }
  }

  function formatInboxTime(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    try {
      return date.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return date.toISOString()
    }
  }

  function normalizeInboxItem(item = {}) {
    const payload = item.payload || null
    const projectName =
      payload?.project?.name ||
      payload?.projectItem?.project?.name ||
      payload?.projectItem?.name ||
      ''

    return {
      id: item.id || null,
      userId: item.userId || null,
      projectId: item.projectId || payload?.projectId || payload?.project?.id || null,
      entityType: item.entityType || null,
      entityId: item.entityId || payload?.id || null,
      action: item.action || '',
      title: item.title || '',
      body: item.body || '',
      payload,
      isRead: !!item.isRead,
      createdAt: item.createdAt || new Date().toISOString(),

      // View helpers
      user: resolveUserFromPayload(payload),
      context: projectName,
      subtitle: item.body || '',
      time: formatInboxTime(item.createdAt),
      isComment: false,
      preview: item.body || ''
    }
  }

  async function fetchInbox(params = {}) {
    isLoading.value = true
    try {
      const queryParams = {
        page: params.page || pagination.value.page,
        limit: params.limit || pagination.value.limit,
        ...params
      }

      const response = await notificationApi.getNotifications(queryParams)

      if (response?.data) {
        items.value = response.data.map(normalizeInboxItem)
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || queryParams.limit || 10,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else {
        const list = Array.isArray(response) ? response : []
        items.value = list.map(normalizeInboxItem)
        pagination.value.total = list.length
      }

      return items.value
    } finally {
      isLoading.value = false
    }
  }

  async function markAsRead(id) {
    try {
      const response = await notificationApi.markAsRead(id)

      // Update local state
      const item = items.value.find(i => i.id === id)
      if (item) {
        item.isRead = true
        // If filtering by unread, remove it
        if (filterMode.value === 'unread') {
          items.value = items.value.filter(i => i.id !== id)
          pagination.value.total = Math.max(0, pagination.value.total - 1)
        }
      }

      // Sync global unread count
      notificationStore.fetchUnreadCount()

      return response
    } catch (error) {
      throw error
    }
  }

  async function markAllAsRead() {
    try {
      const response = await notificationApi.markAllAsRead()

      if (filterMode.value === 'unread') {
        items.value = []
        pagination.value.total = 0
      } else {
        items.value.forEach(item => item.isRead = true)
      }

      // Sync global unread count
      notificationStore.fetchUnreadCount()

      return response
    } catch (error) {
      throw error
    }
  }

  function setFilterMode(mode) {
    if (['unread', 'all'].includes(mode)) {
      filterMode.value = mode
    }
  }

  return {
    // State
    items,
    isLoading,
    pagination,
    filterMode,

    // Getters
    hasItems,
    totalItems,

    // Actions
    fetchInbox,
    markAsRead,
    markAllAsRead,
    setFilterMode
  }
})
