<script setup>
/**
 * Topbar - Top navigation bar with hamburger menu, breadcrumbs, search, and AI chat
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useAuthStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'
import { ViewType } from '@/models'

// PrimeVue
import OverlayPanel from 'primevue/overlaypanel'

// Components
import AIChatButton from '@/components/ai/AIChatButton.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { LayoutGrid, List, Calendar, ChevronDown } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()

// Refs
const searchQuery = ref('')

// View Menu Options for DropdownMenu
const viewMenuItems = computed(() => [
  {
    id: 'list',
    label: 'Table',
    icon: List,
    action: () => uiStore.setMyTasksViewMode(ViewType.LIST)
  },
  {
    id: 'board',
    label: 'Board',
    icon: LayoutGrid,
    action: () => uiStore.setMyTasksViewMode(ViewType.KANBAN)
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    action: () => uiStore.setMyTasksViewMode(ViewType.CALENDAR)
  }
])

// Computed
const pageTitle = computed(() => {
  if (route.name === 'Home') return 'Home'
  if (route.name === 'Users') return 'Users'
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


</script>

<template>
  <header class="flex h-14 items-center border-b border-gray-200 bg-white px-4">
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

      <!-- Page Title -->
      <h1 class="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{{ pageTitle }}</h1>
    </div>

    <!-- Spacer to push content to right -->
    <div class="flex-1"></div>

    <!-- Right Section -->
    <div class="flex items-center gap-3">
      <!-- Search Input -->
      <div class="relative w-64">
        <div class="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
          <svg class="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search"
          class="w-full h-8 pl-8 pr-3 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-700 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
        />
      </div>

      <!-- View Switcher (My Tasks only) -->
      <DropdownMenu v-if="route.name === 'MyTasks'" :items="viewMenuItems" position="right" width="8rem">
        <template #trigger>
          <button
            class="flex items-center gap-2 h-8 px-3 rounded-md bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LayoutGrid v-if="uiStore.myTasksViewMode === ViewType.KANBAN" class="w-4 h-4" />
            <List v-else-if="uiStore.myTasksViewMode === ViewType.LIST" class="w-4 h-4" />
            <Calendar v-else-if="uiStore.myTasksViewMode === ViewType.CALENDAR" class="w-4 h-4" />
            <span>View</span>
            <ChevronDown class="w-4 h-4 text-gray-400" />
          </button>
        </template>
      </DropdownMenu>

      <!-- AI Chat Button with Dropdown -->
      <AIChatButton />
    </div>
    
  </header>
</template>

<style scoped>
/* Search input focus styles */
input:focus {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}
</style>

