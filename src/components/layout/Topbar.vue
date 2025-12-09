<script setup>
/**
 * Topbar - Top navigation bar with breadcrumbs, search, and user actions
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useAuthStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'
import { ViewType } from '@/models'

// PrimeVue
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
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

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
    <!-- Left Section -->
    <div class="flex items-center gap-4">
      <!-- Mobile Menu Toggle -->
      <Button 
        v-if="uiStore.isMobile"
        icon="pi pi-bars"
        text
        rounded
        @click="uiStore.openMobileSidebar"
        class="lg:hidden"
      />
      
      <!-- Breadcrumbs -->
      <nav class="hidden items-center gap-2 text-sm md:flex">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <router-link 
            :to="crumb.route"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {{ crumb.label }}
          </router-link>
          <i v-if="index < breadcrumbs.length - 1" class="pi pi-chevron-right text-xs text-gray-400"></i>
        </template>
      </nav>
      
      <!-- Page Title (Mobile) -->
      <h1 class="text-lg font-semibold text-gray-900 dark:text-white md:hidden">
        {{ pageTitle }}
      </h1>
    </div>

    <!-- Center Section - View Switcher -->
    <div v-if="showViewSwitcher" class="hidden items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700 md:flex">
      <button
        v-for="option in viewOptions"
        :key="option.value"
        @click="setView(option.value)"
        :class="[
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          uiStore.currentView === option.value
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
        ]"
      >
        <i :class="option.icon"></i>
        <span>{{ option.label }}</span>
      </button>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <!-- Create Task Button -->
      <Button 
        icon="pi pi-plus"
        label="New Task"
        size="small"
        @click="openCreateTaskModal"
        class="hidden md:flex"
      />
      <Button 
        icon="pi pi-plus"
        size="small"
        rounded
        @click="openCreateTaskModal"
        class="md:hidden"
        v-tooltip.bottom="'New Task'"
      />
      
      <!-- Notifications -->
      <div class="relative">
        <Button 
          icon="pi pi-bell"
          text
          rounded
          @click="toggleNotifications"
          v-tooltip.bottom="'Notifications'"
        />
        <span 
          v-if="notificationStore.hasUnread"
          class="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
        >
          {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
        </span>
      </div>
      
      <!-- User Menu -->
      <button 
        @click="toggleUserMenu"
        class="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Avatar 
          v-if="authStore.userAvatar"
          :image="authStore.userAvatar"
          shape="circle"
          size="normal"
        />
        <Avatar 
          v-else
          :label="authStore.userInitials"
          shape="circle"
          size="normal"
          class="bg-primary-100 text-primary-700"
        />
      </button>
      
      <Menu ref="userMenu" :model="userMenuItems" popup />
    </div>
    
    <!-- Notification Panel -->
    <OverlayPanel ref="notificationPanel" class="w-80">
      <div class="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <Button 
          v-if="notificationStore.hasUnread"
          label="Mark all read"
          text
          size="small"
          @click="notificationStore.markAllAsRead"
        />
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
            'flex gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
            !notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
          ]"
        >
          <div class="flex-shrink-0">
            <i :class="['pi', notification.icon || 'pi-bell', 'text-gray-400']"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900 dark:text-white">{{ notification.title }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ notification.message }}</p>
          </div>
        </div>
      </div>
      
      <div class="border-t border-gray-200 pt-2 dark:border-gray-700">
        <Button 
          label="View all notifications"
          text
          size="small"
          class="w-full"
          @click="router.push({ name: 'Inbox' }); notificationPanel.hide()"
        />
      </div>
    </OverlayPanel>
  </header>
</template>

<style scoped>
/* Custom styles if needed */
</style>

