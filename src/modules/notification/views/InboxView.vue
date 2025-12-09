<script setup>
/**
 * InboxView - Notifications inbox
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore, useUIStore } from '@/stores'
import { NotificationType } from '@/models'

// PrimeVue
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Skeleton from 'primevue/skeleton'

const router = useRouter()
const notificationStore = useNotificationStore()
const uiStore = useUIStore()

const notifications = computed(() => notificationStore.notifications)
const isLoading = computed(() => notificationStore.isLoading)
const hasMore = computed(() => notificationStore.hasMore())

onMounted(async () => {
  await notificationStore.fetchNotifications()
})

function getNotificationIcon(type) {
  const icons = {
    [NotificationType.TASK_ASSIGNED]: 'pi pi-user-plus',
    [NotificationType.TASK_COMPLETED]: 'pi pi-check-circle',
    [NotificationType.TASK_COMMENTED]: 'pi pi-comment',
    [NotificationType.TASK_DUE_SOON]: 'pi pi-clock',
    [NotificationType.TASK_OVERDUE]: 'pi pi-exclamation-triangle',
    [NotificationType.PROJECT_INVITED]: 'pi pi-users',
    [NotificationType.MENTION]: 'pi pi-at'
  }
  return icons[type] || 'pi pi-bell'
}

function getNotificationColor(type) {
  const colors = {
    [NotificationType.TASK_ASSIGNED]: 'bg-blue-100 text-blue-600',
    [NotificationType.TASK_COMPLETED]: 'bg-green-100 text-green-600',
    [NotificationType.TASK_COMMENTED]: 'bg-purple-100 text-purple-600',
    [NotificationType.TASK_DUE_SOON]: 'bg-yellow-100 text-yellow-600',
    [NotificationType.TASK_OVERDUE]: 'bg-red-100 text-red-600',
    [NotificationType.PROJECT_INVITED]: 'bg-indigo-100 text-indigo-600',
    [NotificationType.MENTION]: 'bg-pink-100 text-pink-600'
  }
  return colors[type] || 'bg-gray-100 text-gray-600'
}

function formatTime(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

async function handleNotificationClick(notification) {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id)
  }
  
  // Navigate based on notification type
  if (notification.taskId) {
    router.push({ name: 'TaskDetail', params: { taskId: notification.taskId } })
  } else if (notification.projectId) {
    router.push({ 
      name: 'Project', 
      params: { 
        workspaceId: notification.workspaceId,
        projectId: notification.projectId 
      } 
    })
  }
}

async function markAllRead() {
  await notificationStore.markAllAsRead()
  uiStore.showSuccess('All notifications marked as read')
}

async function loadMore() {
  await notificationStore.loadMore()
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark-edit:text-white">Inbox</h1>
        <p class="mt-1 text-sm text-gray-600 dark-edit:text-gray-400">
          {{ notificationStore.unreadCount }} unread notifications
        </p>
      </div>
      <Button 
        v-if="notificationStore.hasUnread"
        label="Mark all as read" 
        text
        @click="markAllRead"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading && notifications.length === 0" class="space-y-3">
      <Skeleton v-for="i in 5" :key="i" height="80px" />
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="notifications.length === 0" 
      class="flex flex-col items-center justify-center py-16"
    >
      <i class="pi pi-inbox text-6xl text-gray-300 dark-edit:text-gray-600"></i>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark-edit:text-white">No notifications</h3>
      <p class="mt-1 text-gray-500 dark-edit:text-gray-400">
        You're all caught up!
      </p>
    </div>

    <!-- Notifications List -->
    <div v-else class="space-y-2">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        @click="handleNotificationClick(notification)"
        :class="[
          'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors',
          notification.isRead 
            ? 'border-gray-100 bg-white hover:bg-gray-50 dark-edit:border-gray-700 dark-edit:bg-gray-800 dark-edit:hover:bg-gray-700/50'
            : 'border-primary-100 bg-primary-50/50 hover:bg-primary-50 dark-edit:border-primary-900/30 dark-edit:bg-primary-900/10 dark-edit:hover:bg-primary-900/20'
        ]"
      >
        <!-- Icon -->
        <div 
          :class="[
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
            getNotificationColor(notification.type)
          ]"
        >
          <i :class="getNotificationIcon(notification.type)"></i>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p 
            :class="[
              'text-sm',
              notification.isRead ? 'text-gray-600 dark-edit:text-gray-400' : 'text-gray-900 dark-edit:text-white font-medium'
            ]"
          >
            {{ notification.message }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ formatTime(notification.createdAt) }}
          </p>
        </div>

        <!-- Unread Indicator -->
        <div 
          v-if="!notification.isRead"
          class="h-2 w-2 flex-shrink-0 rounded-full bg-primary-600"
        ></div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="pt-4 text-center">
        <Button 
          label="Load More" 
          text 
          :loading="isLoading"
          @click="loadMore"
        />
      </div>
    </div>
  </div>
</template>

