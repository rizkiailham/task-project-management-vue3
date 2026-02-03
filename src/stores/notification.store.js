/**
 * Desidia v2 - Notification Store
 * 
 * Manages in-app notifications
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as notificationApi from '@/api/notification.api'

export const useNotificationStore = defineStore('notification', () => {
  // ================================
  // State
  // ================================
  const notifications = ref([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const filterMode = ref('unread') // 'unread' | 'all'

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

      // View helpers (InboxView.vue expects these)
      user: resolveUserFromPayload(payload),
      context: projectName,
      subtitle: item.body || '',
      time: formatInboxTime(item.createdAt),
      isComment: false,
      preview: item.body || ''
    }
  }

  // ================================
  // Getters
  // ================================
  const hasUnread = computed(() => unreadCount.value > 0)

  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.isRead)
  )

  const readNotifications = computed(() =>
    notifications.value.filter(n => n.isRead)
  )

  const notificationsByDate = computed(() => {
    const grouped = {}

    notifications.value.forEach(notification => {
      const date = new Date(notification.createdAt).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(notification)
    })

    return grouped
  })

  // ================================
  // Actions
  // ================================

  /**
   * Fetch notifications
   * @param {Object} params
   */
  async function fetchNotifications(params = {}) {
    isLoading.value = true
    error.value = null

    try {
      const queryParams = {
        page: params.page || pagination.value.page,
        limit: params.limit || pagination.value.limit,
        ...params
      }

      const response = await notificationApi.getNotifications(queryParams)

      // Handle nestjs-paginate response format
      if (response?.data) {
        notifications.value = response.data.map(normalizeInboxItem)
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || queryParams.limit || 10,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else {
        // Fallback for unexpected formats
        const list = Array.isArray(response) ? response : []
        notifications.value = list.map(normalizeInboxItem)
        pagination.value = {
          page: queryParams.page || 1,
          limit: queryParams.limit || 10,
          total: list.length,
          totalPages: 1
        }
      }

      return notifications.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch notifications'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch unread count only
   */
  async function fetchUnreadCount() {
    try {
      const response = await notificationApi.getUnreadCount()
      unreadCount.value =
        Number(response?.count) ||
        Number(response?.data) ||
        (Number.isFinite(response) ? response : 0)
      return unreadCount.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch unread count'
      throw err
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId
   */
  async function markAsRead(notificationId) {
    try {
      const response = await notificationApi.markAsRead(notificationId)

      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      if (filterMode.value === 'unread') {
        notifications.value = notifications.value.filter(n => n.id !== notificationId)
      }
      return response
    } catch (err) {
      error.value = err.message || 'Failed to mark as read'
      throw err
    }
  }

  /**
   * Mark all notifications as read
   */
  async function markAllAsRead() {
    try {
      const response = await notificationApi.markAllAsRead()

      if (filterMode.value === 'unread') {
        notifications.value = []
      } else {
        notifications.value.forEach(n => {
          n.isRead = true
        })
      }
      unreadCount.value = 0
      return response
    } catch (err) {
      error.value = err.message || 'Failed to mark all as read'
      throw err
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId
   */
  async function deleteNotification(notificationId) {
    try {
      const response = await notificationApi.deleteNotification(notificationId)

      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }

      notifications.value = notifications.value.filter(n => n.id !== notificationId)
      return response
    } catch (err) {
      error.value = err.message || 'Failed to delete notification'
      throw err
    }
  }

  /**
   * Add a new notification (from real-time updates)
   * @param {Object} notification
   */
  function addNotification(notification) {
    const newNotification = normalizeInboxItem(notification)
    notifications.value.unshift(newNotification)
    if (!newNotification.isRead) {
      unreadCount.value++
    }
  }

  /**
   * Load more notifications
   */
  async function loadMore() {
    if (isLoading.value) return

    pagination.value.page++

    try {
      const response = await notificationApi.getNotifications({
        page: pagination.value.page,
        limit: pagination.value.limit
      })

      const newNotifications = (response?.data || []).map(normalizeInboxItem)
      notifications.value.push(...newNotifications)
      pagination.value.total = response?.meta?.totalItems ?? pagination.value.total
      pagination.value.totalPages = response?.meta?.totalPages ?? pagination.value.totalPages
    } catch (err) {
      error.value = err.message || 'Failed to load more'
      pagination.value.page--
      throw err
    }
  }

  /**
   * Check if there are more notifications to load
   */
  function hasMore() {
    return notifications.value.length < pagination.value.total
  }

  /**
   * Clear state
   */
  function clearState() {
    notifications.value = []
    unreadCount.value = 0
    error.value = null
    pagination.value = {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  }

  function setFilterMode(mode) {
    if (['unread', 'all'].includes(mode)) {
      filterMode.value = mode
    }
  }

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    pagination,

    // Getters
    hasUnread,
    unreadNotifications,
    readNotifications,
    notificationsByDate,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    loadMore,
    hasMore,
    clearState,
    filterMode,
    setFilterMode,

    // Helpers
    normalizeInboxItem
  }
})
