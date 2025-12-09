<script setup>
/**
 * Topbar - Top navigation bar with hamburger menu, breadcrumbs, search, and AI chat
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useAuthStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'
import { ViewType } from '@/models'

// PrimeVue
import Menu from 'primevue/menu'
import OverlayPanel from 'primevue/overlaypanel'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()

// Refs
const userMenu = ref(null)
const notificationPanel = ref(null)
const searchQuery = ref('')

// Computed
const pageTitle = computed(() => {
  if (route.name === 'Home') return 'Home'
  if (route.name === 'MyTasks') return 'My Tasks'
  if (route.name === 'Inbox') return 'Inbox'
  if (projectStore.currentProject) return projectStore.currentProject.name
  return route.meta?.title || 'Desidia'
})

const breadcrumbs = computed(() => {
  const items = []

  if (workspaceStore.currentWorkspace) {
    items.push({
      label: workspaceStore.currentWorkspace.name,
      route: { name: 'Workspace', params: { workspaceId: workspaceStore.currentWorkspaceId } }
    })
  }

  if (projectStore.currentProject) {
    items.push({
      label: projectStore.currentProject.name,
      route: {
        name: 'Project',
        params: {
          workspaceId: workspaceStore.currentWorkspaceId,
          projectId: projectStore.currentProjectId
        }
      }
    })
  }

  return items
})

const showViewSwitcher = computed(() => {
  return ['Project', 'ProjectBoard', 'ProjectList', 'ProjectCalendar'].includes(route.name)
})

const viewOptions = [
  { label: 'Board', value: ViewType.KANBAN, icon: 'pi pi-th-large' },
  { label: 'List', value: ViewType.LIST, icon: 'pi pi-list' },
  { label: 'Calendar', value: ViewType.CALENDAR, icon: 'pi pi-calendar' }
]

// User menu items
const userMenuItems = ref([
  {
    label: 'Profile',
    icon: 'pi pi-user',
    command: () => router.push({ name: 'Settings' })
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push({ name: 'SettingsAccount' })
  },
  { separator: true },
  {
    label: 'Dark Mode',
    icon: uiStore.isDarkMode ? 'pi pi-sun' : 'pi pi-moon',
    command: () => uiStore.toggleDarkMode()
  },
  { separator: true },
  {
    label: 'Sign Out',
    icon: 'pi pi-sign-out',
    command: handleLogout
  }
])

// Methods
function toggleSidebar() {
  if (uiStore.isMobile) {
    uiStore.openMobileSidebar()
  } else {
    uiStore.toggleSidebar()
  }
}

function toggleUserMenu(event) {
  userMenu.value.toggle(event)
}

function toggleNotifications(event) {
  notificationPanel.value.toggle(event)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}

function setView(view) {
  uiStore.setView(view)

  // Navigate to corresponding route
  const routeMap = {
    [ViewType.KANBAN]: 'ProjectBoard',
    [ViewType.LIST]: 'ProjectList',
    [ViewType.CALENDAR]: 'ProjectCalendar'
  }

  if (routeMap[view] && projectStore.currentProjectId) {
    router.push({
      name: routeMap[view],
      params: {
        workspaceId: workspaceStore.currentWorkspaceId,
        projectId: projectStore.currentProjectId
      }
    })
  }
}

function openAIChat() {
  // TODO: Implement AI chat modal/panel
  uiStore.openModal('aiChat')
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-14 items-center border-b border-gray-200 bg-white px-4">
    <!-- Left Section -->
    <div class="flex items-center gap-3">
      <!-- Hamburger Menu Toggle -->
      <button
        @click="toggleSidebar"
        class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
        title="Toggle sidebar"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <!-- Home Icon with Page Title -->
      <div class="flex items-center gap-2 text-gray-600">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="text-sm font-medium">{{ pageTitle }}</span>
      </div>
    </div>

    <!-- Center Section - Search -->
    <div class="flex-1 flex justify-center px-4">
      <div class="relative w-full max-w-md">
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search"
          class="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
        />
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <!-- AI Chat Button -->
      <button
        @click="openAIChat"
        class="flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        AI chat
        <svg class="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <Menu ref="userMenu" :model="userMenuItems" popup />
    </div>

    <!-- Notification Panel -->
    <OverlayPanel ref="notificationPanel" class="w-80">
      <div class="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 class="font-semibold text-gray-900">Notifications</h3>
        <button
          v-if="notificationStore.hasUnread"
          class="text-sm text-orange-600 hover:text-orange-700"
          @click="notificationStore.markAllAsRead"
        >
          Mark all read
        </button>
      </div>

      <div class="max-h-80 overflow-y-auto py-2">
        <div
          v-if="notificationStore.notifications.length === 0"
          class="py-8 text-center text-sm text-gray-500"
        >
          No notifications yet
        </div>

        <div
          v-for="notification in notificationStore.notifications.slice(0, 5)"
          :key="notification.id"
          :class="[
            'flex gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50',
            !notification.isRead ? 'bg-orange-50/50' : ''
          ]"
        >
          <div class="flex-shrink-0">
            <i :class="['pi', notification.icon || 'pi-bell', 'text-gray-400']"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900">{{ notification.title }}</p>
            <p class="text-xs text-gray-500">{{ notification.message }}</p>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200 pt-2">
        <button
          class="w-full text-center text-sm text-orange-600 hover:text-orange-700 py-2"
          @click="router.push({ name: 'Inbox' }); notificationPanel.hide()"
        >
          View all notifications
        </button>
      </div>
    </OverlayPanel>
  </header>
</template>

<style scoped>
/* Search input focus styles */
input:focus {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}
</style>

