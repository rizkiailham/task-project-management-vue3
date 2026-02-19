<script setup>
/**
 * Topbar - Top navigation bar with hamburger menu, breadcrumbs, search, and AI chat
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useAuthStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'
import { ViewType } from '@/models'
import { useI18n } from 'vue-i18n'

// PrimeVue
import OverlayPanel from 'primevue/overlaypanel'

// Components
import AIChatButton from '@/components/ai/AIChatButton.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { LayoutGrid, List, Calendar, ChevronDown, Check, CheckCircle, CheckCheck, Settings } from 'lucide-vue-next'
import Button from 'primevue/button'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()
const { t } = useI18n()

const isMarkingAllRead = ref(false)


// Refs
const searchQuery = ref(uiStore.searchQuery)
watch(() => uiStore.searchQuery, (newVal) => {
  if (searchQuery.value !== newVal) {
    searchQuery.value = newVal
  }
})
watch(searchQuery, (newVal) => {
  uiStore.setSearchQuery(newVal)
})

// View Menu Options Logic
const currentViewMode = computed(() => {
  if (route.name === 'MyTasks') {
    return uiStore.myTasksViewMode
  }
  return uiStore.currentView
})

const currentViewMenuItems = computed(() => {
  const isMyTasks = route.name === 'MyTasks'
  
  return [
    {
      id: 'list',
      label: 'List',
      icon: List,
      action: () => isMyTasks ? uiStore.setMyTasksViewMode(ViewType.LIST) : setView(ViewType.LIST)
    },
    {
      id: 'board',
      label: 'Board',
      icon: LayoutGrid,
      action: () => isMyTasks ? uiStore.setMyTasksViewMode(ViewType.KANBAN) : setView(ViewType.KANBAN)
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      action: () => isMyTasks ? uiStore.setMyTasksViewMode(ViewType.CALENDAR) : setView(ViewType.CALENDAR)
    }
  ]
})

const inboxFilterItems = computed(() => [
  {
    id: 'unread',
    label: t('notifications.filters.unread'),
    action: () => notificationStore.setFilterMode('unread'),
    checked: notificationStore.filterMode === 'unread'
  },
  {
    id: 'all',
    label: t('common.all'),
    action: () => notificationStore.setFilterMode('all'),
    checked: notificationStore.filterMode !== 'unread'
  }
])

async function handleMarkAllAsRead() {
  if (isMarkingAllRead.value) return
  isMarkingAllRead.value = true
  try {
    const response = await notificationStore.markAllAsRead()
    uiStore.showApiSuccess(response, t('notifications.markAllRead'))
  } catch (error) {
    console.error('Error marking all as read:', error)
    uiStore.showApiError(error, t('notifications.markAllRead'))
  } finally {
    isMarkingAllRead.value = false
  }
}

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
  } else if (authStore.user) {
    items.push({
      label: authStore.user.name || 'User',
      route: { name: 'Home' }
    })
  }

  if (projectStore.currentProject) {
    items.push({
      label: projectStore.currentProject.name,
      route: {
        name: 'ProjectList',
        params: {
          projectId: projectStore.currentProjectId
        }
      }
    })
  }

  return items
})

const showViewSwitcher = computed(() => {
  return ['ProjectBoard', 'ProjectList', 'ProjectCalendar'].includes(route.name)
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
    const params = {
      projectId: projectStore.currentProjectId
    }

    // For all views (List, Board, Calendar), maintain consistency with itemId and type
    let targetItemId = projectStore.activeProjectItemId || route.params.itemId

      // If no active item (e.g. coming from List/Calendar view first load), try to find first task list
      if (!targetItemId) {
        const items = projectStore.getProjectItems(projectStore.currentProjectId) || []
        const firstTask = items.find(i => i.type === 'task')
        if (firstTask) targetItemId = firstTask.id
      }
      
      if (targetItemId) {
        params.itemId = targetItemId
      } else if (view === ViewType.KANBAN) {
        // Fallback or error handling if no boards exist for Kanban
        console.warn('No board item found for Kanban view')
        return
      }

    router.push({
      name: routeMap[view],
      params,
      query: { type: 'task' }
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

      <!-- Page Title / Breadcrumbs -->
      <div v-if="breadcrumbs.length > 0 && route.name !== 'Inbox' && !String(route.path).includes('inbox')" class="flex items-center text-sm font-semibold text-gray-900 max-w-[300px]">
        <span v-for="(item, index) in breadcrumbs" :key="index" class="flex items-center min-w-0">
          <span v-if="index > 0" class="mx-1 text-gray-400 flex-shrink-0">/</span>
          <span class="truncate block" :class="{ 'text-gray-500': index < breadcrumbs.length - 1 }">{{ item.label }}</span>
        </span>
      </div>
      <h1 v-else-if="route.name !== 'Inbox' && !String(route.path).includes('inbox')" class="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{{ pageTitle }}</h1>

      <!-- Inbox specific title with Breadcrumb Dropdown -->
      <div v-else class="flex items-center">
         <h1 class="text-sm font-semibold text-gray-900 mr-1">Inbox / </h1>
         <DropdownMenu :items="inboxFilterItems" position="left" width="10rem">
            <template #trigger>
              <button
                class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
              >
                <span>{{ notificationStore.filterMode === 'unread' ? t('notifications.filters.unread') : t('common.all') }}</span>
                <ChevronDown class="w-4 h-4 text-gray-500" />
              </button>
            </template>
            <template #item="{ item }">
               <div class="flex items-center justify-between w-full">
                  <span>{{ item.label }}</span>
                  <Check v-if="item.checked" class="w-4 h-4 text-blue-600" />
               </div>
            </template>
         </DropdownMenu>
      </div>
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

      <!-- Create Task Button (Project View) -->
      <Button 
        v-if="showViewSwitcher"
        label="Create Task" 
        icon="pi pi-plus" 
        class="!h-8 !px-3 !text-xs !bg-blue-600 !border-blue-600 hover:!bg-blue-700 !text-white flex items-center gap-2"
        @click="uiStore.openTaskPanel()"
      />



      <!-- View Switcher (My Tasks & Projects) -->
      <DropdownMenu v-if="route.name === 'MyTasks' || showViewSwitcher" :items="currentViewMenuItems" position="right" width="8rem">
        <template #trigger>
          <button
            class="flex items-center gap-2 h-8 px-3 rounded-md bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LayoutGrid v-if="currentViewMode === ViewType.KANBAN" class="w-4 h-4" />
            <List v-else-if="currentViewMode === ViewType.LIST" class="w-4 h-4" />
            <Calendar v-else-if="currentViewMode === ViewType.CALENDAR" class="w-4 h-4" />
            <span>View</span>
            <ChevronDown class="w-4 h-4 text-gray-400" />
          </button>
        </template>
      </DropdownMenu>

      <!-- Inbox Controls -->
      <div v-if="route.name === 'Inbox' || String(route.path).includes('inbox')" class="flex items-center gap-2">
         
         <AIChatButton />

         <!-- Mark all as read -->
         <button
            @click="handleMarkAllAsRead"
            class="flex items-center gap-2 h-8 px-3 rounded-md bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            :disabled="isMarkingAllRead"
            :title="t('notifications.markAllRead')"
         >
            <CheckCheck class="w-3.5 h-3.5" />
            <span>{{ t('notifications.markAllRead') }}</span>
         </button>

         <!-- Settings Button -->
         <button
            class="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Settings"
         >
            <Settings class="w-4 h-4" />
         </button>
      </div>

      <!-- AI Chat Button (Default position for non-Inbox pages) -->
      <AIChatButton v-if="!(route.name === 'Inbox' || String(route.path).includes('inbox'))" />
    </div>
    
  </header>
</template>

<style scoped>
/* Search input focus styles */
input:focus {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}
</style>

