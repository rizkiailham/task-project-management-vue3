<script setup>
/**
 * Sidebar - Main navigation sidebar based on DartAI design
 * 
 * Features:
 * - Collapsible sections
 * - Workspace/Project navigation
 * - Quick actions
 * - Responsive mobile support
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore, useAuthStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'

// PrimeVue
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import Menu from 'primevue/menu'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()

// Computed
const isCollapsed = computed(() => uiStore.isSidebarCollapsed && !uiStore.isMobile)

const sidebarClasses = computed(() => ({
  'sidebar': true,
  'sidebar--collapsed': isCollapsed.value,
  'sidebar--mobile-open': uiStore.isSidebarMobileOpen
}))

// Navigation items
const mainNavItems = computed(() => [
  {
    label: 'Home',
    icon: 'pi pi-home',
    route: { name: 'Home' },
    active: route.name === 'Home'
  },
  {
    label: 'My Tasks',
    icon: 'pi pi-check-square',
    route: { name: 'MyTasks' },
    active: route.name === 'MyTasks'
  },
  {
    label: 'Inbox',
    icon: 'pi pi-inbox',
    route: { name: 'Inbox' },
    active: route.name === 'Inbox',
    badge: notificationStore.unreadCount
  }
])

// Methods
function navigateTo(item) {
  if (item.route) {
    router.push(item.route)
    if (uiStore.isMobile) {
      uiStore.closeMobileSidebar()
    }
  }
}

function navigateToProject(project) {
  router.push({
    name: 'Project',
    params: {
      workspaceId: workspaceStore.currentWorkspaceId,
      projectId: project.id
    }
  })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function openCreateProjectModal() {
  uiStore.openModal('createProject')
}

function openCreateWorkspaceModal() {
  uiStore.openModal('createWorkspace')
}

function openSearch() {
  uiStore.openSearch()
}
</script>

<template>
  <aside 
    :class="sidebarClasses"
    class="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
    :style="{ width: uiStore.sidebarWidth }"
  >
    <!-- Header -->
    <div class="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
          D
        </div>
        <span class="font-semibold text-gray-900 dark:text-white">Desidia</span>
      </div>
      <div v-else class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold mx-auto">
        D
      </div>
      
      <Button 
        v-if="!uiStore.isMobile"
        :icon="isCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
        text
        rounded
        size="small"
        @click="uiStore.toggleSidebar"
        class="text-gray-500"
      />
      <Button 
        v-else
        icon="pi pi-times"
        text
        rounded
        size="small"
        @click="uiStore.closeMobileSidebar"
        class="text-gray-500"
      />
    </div>

    <!-- Search Button -->
    <div v-if="!isCollapsed" class="p-3">
      <button 
        @click="openSearch"
        class="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
      >
        <i class="pi pi-search text-xs"></i>
        <span>Search...</span>
        <kbd class="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-600">⌘K</kbd>
      </button>
    </div>
    <div v-else class="p-2">
      <Button 
        icon="pi pi-search"
        text
        rounded
        @click="openSearch"
        class="w-full"
        v-tooltip.right="'Search (⌘K)'"
      />
    </div>

    <!-- Main Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-2">
      <!-- Main Nav Items -->
      <ul class="space-y-1">
        <li v-for="item in mainNavItems" :key="item.label">
          <button
            @click="navigateTo(item)"
            :class="[
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              item.active 
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            ]"
            :title="isCollapsed ? item.label : ''"
          >
            <i :class="[item.icon, 'text-base']"></i>
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <Badge 
              v-if="item.badge && !isCollapsed" 
              :value="item.badge" 
              severity="danger" 
              class="ml-auto"
            />
          </button>
        </li>
      </ul>

      <!-- Spaces Section -->
      <div class="mt-6">
        <button
          v-if="!isCollapsed"
          @click="uiStore.toggleSidebarSection('spaces')"
          class="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
        >
          <span>Spaces</span>
          <i :class="['pi text-xs', uiStore.isSectionExpanded('spaces') ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
        </button>
        
        <Transition name="collapse">
          <ul v-if="uiStore.isSectionExpanded('spaces') || isCollapsed" class="mt-1 space-y-1">
            <li v-for="project in projectStore.activeProjects" :key="project.id">
              <button
                @click="navigateToProject(project)"
                :class="[
                  'sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  projectStore.currentProjectId === project.id
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
                ]"
                :title="isCollapsed ? project.name : ''"
              >
                <span 
                  class="flex h-5 w-5 items-center justify-center rounded text-xs font-medium text-white"
                  :style="{ backgroundColor: project.color || '#6366f1' }"
                >
                  {{ project.name.charAt(0).toUpperCase() }}
                </span>
                <span v-if="!isCollapsed" class="truncate">{{ project.name }}</span>
              </button>
            </li>
            
            <!-- Add Project Button -->
            <li>
              <button
                @click="openCreateProjectModal"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-300"
                :title="isCollapsed ? 'Add Project' : ''"
              >
                <i class="pi pi-plus text-xs"></i>
                <span v-if="!isCollapsed">Add Project</span>
              </button>
            </li>
          </ul>
        </Transition>
      </div>
    </nav>

    <!-- Footer / User Section -->
    <div class="border-t border-gray-200 p-3 dark:border-gray-700">
      <div 
        :class="[
          'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer',
          isCollapsed ? 'justify-center' : ''
        ]"
        @click="router.push({ name: 'Settings' })"
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
        <div v-if="!isCollapsed" class="flex-1 min-w-0">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
            {{ authStore.userName }}
          </p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
            {{ authStore.userEmail }}
          </p>
        </div>
        <Button 
          v-if="!isCollapsed"
          icon="pi pi-cog"
          text
          rounded
          size="small"
          class="text-gray-400"
          v-tooltip="'Settings'"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  --sidebar-bg: #ffffff;
  --sidebar-border: #e5e7eb;
}

.dark .sidebar {
  --sidebar-bg: #1f2937;
  --sidebar-border: #374151;
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Sidebar item with vertical line indicator */
.sidebar-item {
  position: relative;
}

.sidebar-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background-color: var(--p-primary-500);
  border-radius: 0 2px 2px 0;
  transition: height 0.2s ease;
}

.sidebar-item:hover::before,
.sidebar-item.active::before {
  height: 60%;
}
</style>

