/**
 * Desidia v2 - Notification Store
 * 
 * Manages in-app notifications
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as notificationApi from '@/api/notification.api'
import { createNotification } from '@/models'

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
    limit: 20,
    total: 0
  })

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
      const response = await notificationApi.getNotifications({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      })

      notifications.value = response.notifications.map(n => createNotification(n))
      unreadCount.value = response.unreadCount
      pagination.value.total = response.total

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
      unreadCount.value = response.count
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
      await notificationApi.markAsRead(notificationId)
      
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
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
      await notificationApi.markAllAsRead()
      
      notifications.value.forEach(n => {
        n.isRead = true
      })
      unreadCount.value = 0
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
      await notificationApi.deleteNotification(notificationId)
      
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      
      notifications.value = notifications.value.filter(n => n.id !== notificationId)
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
    const newNotification = createNotification(notification)
    notifications.value.unshift(newNotification)
    unreadCount.value++
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

      const newNotifications = response.notifications.map(n => createNotification(n))
      notifications.value.push(...newNotifications)
      pagination.value.total = response.total
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
      limit: 20,
      total: 0
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
    clearState
  }
})

