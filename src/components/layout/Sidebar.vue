<script setup>
/**
 * Sidebar - Main navigation sidebar based on DartAI design
 *
 * Features:
 * - Collapsible sections with dropdown spaces
 * - Workspace/Project navigation
 * - Quick actions
 * - Responsive mobile support
 * - Smooth animation transitions
 * - Resizable width (min 190px, max 400px)
 */
import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore, useWorkspaceStore, useNotificationStore, useAuthStore } from '@/stores'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

// User menu items for DropdownMenu component
const userMenuItems = computed(() => [
  {
    id: 'account',
    type: 'item',
    label: 'Account',
    action: goToAccount
  },
  {
    id: 'invite',
    type: 'item',
    label: 'Invite teammates',
    action: inviteTeammates
  },
  {
    id: 'settings',
    type: 'item',
    label: 'Settings',
    action: goToSettings
  },
  {
    id: 'trash',
    type: 'item',
    label: 'Trash',
    shortcut: 'G then R',
    action: goToTrash
  },
  { type: 'divider' },
  {
    id: 'logout',
    type: 'item',
    label: 'Log out',
    shortcut: 'Alt ↑ Q',
    action: handleLogout
  },
  { type: 'divider' },
  {
    type: 'header',
    label: 'Intelligence'
  }
])

// Resizable sidebar - Optimized with RAF
const isResizing = ref(false)
const sidebarRef = ref(null)
let startX = 0
let startWidth = 0
let rafId = null
let pendingWidth = 0

function startResize(e) {
  e.preventDefault()
  isResizing.value = true
  startX = e.clientX
  startWidth = uiStore.sidebarCustomWidth
  pendingWidth = startWidth
  uiStore.startResizingSidebar()

  // Use capture phase and passive for better performance
  document.addEventListener('mousemove', handleResize, { passive: true })
  document.addEventListener('mouseup', stopResize)

  // Prevent text selection during resize
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e) {
  if (!isResizing.value) return

  const diff = e.clientX - startX
  const minWidth = 190
  const maxWidth = 400
  pendingWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff))

  // Cancel previous frame to avoid stacking
  if (rafId) cancelAnimationFrame(rafId)

  // Schedule update on next frame
  rafId = requestAnimationFrame(() => {
    // Direct DOM update for instant feedback
    if (sidebarRef.value) {
      sidebarRef.value.style.width = `${pendingWidth}px`
    }
    // Update store (no localStorage write)
    uiStore.setSidebarWidth(pendingWidth)
  })
}

function stopResize() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  isResizing.value = false
  uiStore.stopResizingSidebar() // This will persist to localStorage

  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

// Navigation items
const mainNavItems = computed(() => [
  {
    label: 'Home',
    icon: 'home',
    route: { name: 'Home' },
    active: route.name === 'Home'
  },
  {
    label: 'My tasks',
    icon: 'clock',
    route: { name: 'MyTasks' },
    active: route.name === 'MyTasks'
  },
  {
    label: 'Inbox',
    icon: 'bell',
    route: { name: 'Inbox' },
    active: route.name === 'Inbox',
    badge: notificationStore.unreadCount || 57
  },
  {
    label: 'Intelligence',
    icon: 'star',
    route: { name: 'Home' },
    active: false
  }
])

// Dashboard items
const dashboardsOpen = ref(false)
const dashboardItems = ref([
  { id: 'd1', name: 'Overview', emoji: '📊', color: 'bg-blue-100' },
  { id: 'd2', name: 'Analytics', emoji: '📈', color: 'bg-green-100' },
  { id: 'd3', name: 'Performance', emoji: '📉', color: 'bg-purple-100' }
])

// Dummy spaces data (like DartAI reference)
const spaces = ref([
  {
    id: 's1',
    name: 'VERKSTEDHAGEN',
    emoji: '🏢',
    color: 'bg-purple-100',
    isOpen: false,
    items: [
      { id: 'v1', name: 'HMS 25/26', emoji: '🚨', color: 'bg-red-100' },
      { id: 'v2', name: 'HMS ARKIV 2025', emoji: '📁', color: 'bg-orange-100' },
      { id: 'v3', name: 'Serviceleverandører', emoji: '🔧', color: 'bg-yellow-100' },
      { id: 'v4', name: 'Beboere', emoji: '👥', color: 'bg-green-100' },
      { id: 'v5', name: 'Arkiv Verkstedhagen', emoji: '📚', color: 'bg-blue-100' },
      { id: 'v6', name: 'DevHub', emoji: '💻', color: 'bg-teal-100' },
      { id: 'v7', name: 'Docs', emoji: '📄', color: 'bg-green-100' },
      { id: 'v8', name: 'Kunnskap', emoji: '📖', color: 'bg-purple-100' }
    ]
  },
  {
    id: 's2',
    name: 'LO MEDIA',
    emoji: '🖥️',
    color: 'bg-blue-100',
    isOpen: false,
    items: [
      { id: 'l1', name: 'Videos', emoji: '📹', color: 'bg-blue-100' },
      { id: 'l2', name: 'Graphics', emoji: '🎨', color: 'bg-pink-100' }
    ]
  },
  {
    id: 's3',
    name: 'PRISER',
    emoji: '💰',
    color: 'bg-pink-100',
    isOpen: false,
    items: [
      { id: 'p1', name: 'Standard', emoji: '💵', color: 'bg-green-100' },
      { id: 'p2', name: 'Premium', emoji: '👑', color: 'bg-purple-100' }
    ]
  },
  {
    id: 's4',
    name: 'DESIDIA',
    emoji: '🔥',
    color: 'bg-orange-100',
    isOpen: true,
    items: [
      { id: 'd1', name: 'Utvikling', emoji: '🚀', color: 'bg-yellow-100' },
      { id: 'd2', name: 'Tasks', emoji: '✅', color: 'bg-blue-100' },
      { id: 'd3', name: 'DesidiaDocs', emoji: '📝', color: 'bg-green-100' }
    ]
  },
  {
    id: 's5',
    name: 'PERSONAL',
    emoji: '👤',
    color: 'bg-teal-100',
    isOpen: false,
    items: [
      { id: 'pe1', name: 'Notes', emoji: '📋', color: 'bg-blue-100' },
      { id: 'pe2', name: 'Favorites', emoji: '⭐', color: 'bg-purple-100' }
    ]
  },
  {
    id: 's6',
    name: 'TEST KIA',
    emoji: '🎯',
    color: 'bg-green-100',
    isOpen: false,
    items: [
      { id: 'tk1', name: 'Tasks', emoji: '✅', color: 'bg-blue-100' },
      { id: 'tk2', name: 'Tests', emoji: '🧪', color: 'bg-orange-100' }
    ]
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

function toggleDashboards() {
  dashboardsOpen.value = !dashboardsOpen.value
}

function toggleSpace(space) {
  space.isOpen = !space.isOpen
}

function navigateToItem(item) {
  router.push({
    name: 'Project',
    params: {
      workspaceId: workspaceStore.currentWorkspaceId || 'default',
      projectId: item.id
    }
  })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

function openCreateProjectModal() {
  uiStore.openModal('createProject')
}

function goToSettings() {
  router.push({ name: 'Settings' })
}

function goToAccount() {
  router.push({ name: 'SettingsAccount' })
}

function goToTrash() {
  // TODO: Navigate to trash when implemented
}

function inviteTeammates() {
  // TODO: Open invite teammates modal when implemented
}

function notify(message) {
  uiStore.showInfo(message)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}

</script>

<template>
  <!-- Overlay for mobile -->
  <Transition name="fade">
    <div
      v-if="uiStore.isMobile && uiStore.isSidebarMobileOpen"
      class="fixed inset-0 bg-black/40 z-40"
      @click="uiStore.closeMobileSidebar"
    ></div>
  </Transition>

  <!-- Sidebar Container -->
  <div
    v-show="(!uiStore.isSidebarCollapsed && !uiStore.isMobile) || (uiStore.isMobile && uiStore.isSidebarMobileOpen)"
    class="fixed left-0 top-0 z-50 h-full flex"
    :class="{ 'translate-x-0': uiStore.isSidebarMobileOpen || !uiStore.isMobile, '-translate-x-full': uiStore.isMobile && !uiStore.isSidebarMobileOpen }"
  >
    <!-- Sidebar -->
	    <aside
	      ref="sidebarRef"
	      class="sidebar relative h-full border-r border-gray-200 bg-[#f4f4f5] will-change-[width] overflow-x-hidden font-sans"
	      :class="{ 'transition-[width] duration-150': !isResizing }"
	      :style="{ width: uiStore.isMobile ? '288px' : `${uiStore.sidebarCustomWidth}px` }"
	    >
	      <div class="absolute inset-0 sidebar-scroll pr-2">
	        <div class="sticky top-0 z-10 bg-[#f4f4f5] pt-4 pb-3 px-3 ">
          <!-- Header -->
	          <div class="flex items-center justify-between px-2 mb-4">
	            <div class="flex items-center gap-2 font-semibold text-sm text-gray-900 min-w-0">
	              <div class="w-7 h-7 flex-shrink-0 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-700 text-xs font-semibold">
	                AB
	              </div>
	              <span class="truncate tracking-tight">COMPANY ID</span>
	            </div>

            <!-- User Avatar with DropdownMenu Component -->
            <DropdownMenu :items="userMenuItems" position="left" width="13rem">
              <template #trigger>
                <!-- show profile picutre or dummy user icon -->
	                <button
	                  type="button"
	                  class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
	                  title="Account"
	                >
	                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
	                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
	                    <circle cx="9" cy="7" r="4"></circle>
	                    <path d="M20 8v6"></path>
	                    <path d="M23 11h-6"></path>
	                  </svg>
	                </button>
	              </template>

              <!-- Custom icons for menu items -->
              <template #icon-account>
                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </template>
              <template #icon-invite>
                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </template>
              <template #icon-settings>
                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </template>
              <template #icon-trash>
                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </template>
              <template #icon-logout>
                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </template>
            </DropdownMenu>
          </div>

          <!-- New Task Button -->
	          <!-- <button
	            @click="openCreateTaskModal"
	            class="flex items-center gap-2 w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm cursor-pointer mb-2 hover:bg-gray-50 transition-colors"
	          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New task
          </button> -->
        </div>

        <div class="pb-10 pt-4 space-y-4">
          <!-- Main Navigation -->
          <nav class="mb-6">
            <button
              v-for="item in mainNavItems"
              :key="item.label"
              @click="navigateTo(item)"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                item.active
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:bg-white/70'
              ]"
            >
              <span class="w-5 h-5 flex items-center justify-center opacity-70">
                <svg v-if="item.icon === 'home'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <svg v-else-if="item.icon === 'clock'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <svg v-else-if="item.icon === 'bell'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <svg v-else-if="item.icon === 'star'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </span>
              <span class="flex-1 text-left truncate">{{ item.label }}</span>
              <span v-if="item.badge" class="bg-primary-500 text-white text-[11px] py-0.5 px-2 rounded-full font-medium ml-1">
                {{ item.badge }}
              </span>
            </button>

            <!-- Dashboards Dropdown -->
            <div class="dropdown-section mb-1 relative">
              <button
                @click="toggleDashboards"
                class="group flex items-center gap-2.5 py-2 px-3 rounded-md text-gray-700 text-sm cursor-pointer hover:bg-white/70 transition-colors w-full"
              >
                <span class="w-5 h-5 relative flex items-center justify-center">
                  <span :class="['dropdown-arrow absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-all duration-200 rounded hover:bg-gray-200', dashboardsOpen ? 'rotate-90' : '']">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                  <span class="dropdown-icon opacity-70 group-hover:opacity-0 transition-all duration-200">
                    <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </span>
                </span>
                <span class="flex-1 text-left">Dashboards</span>
              </button>

              <!-- Dashboard Items with animation -->
              <div
                class="dropdown-content overflow-hidden transition-all duration-300"
                :style="{ maxHeight: dashboardsOpen ? '200px' : '0px', opacity: dashboardsOpen ? 1 : 0 }"
              >
                <button
                  v-for="item in dashboardItems"
                  :key="item.id"
                  class="submenu-item flex items-center gap-2.5 py-1.5 px-3 pl-10 rounded-md text-gray-600 text-[13px] cursor-pointer hover:bg-white/70 hover:text-gray-900 transition-colors w-full text-left"
                >
                  <span :class="['w-[18px] h-[18px] rounded flex items-center justify-center text-[10px]', item.color]">{{ item.emoji }}</span>
                  {{ item.name }}
                </button>
              </div>
            </div>

            <!-- Reports -->
            <button class="flex items-center gap-2.5 py-2 px-3 rounded-md text-gray-700 text-sm cursor-pointer hover:bg-white/70 transition-colors w-full">
              <span class="w-5 h-5 flex items-center justify-center opacity-70">
                <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </span>
              Reports
            </button>

            <!-- Views -->
            <button class="flex items-center gap-2.5 py-2 px-3 rounded-md text-gray-700 text-sm cursor-pointer hover:bg-white/70 transition-colors w-full">
              <span class="w-5 h-5 flex items-center justify-center opacity-70">
                <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </span>
              Views
            </button>
          </nav>

          <!-- Spaces Section -->
          <div class="flex items-center justify-between px-3 mt-2 pb-0 mb-0">
            <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Spaces</span>
            <button
              @click="openCreateProjectModal"
              class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add project"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <!-- Space Dropdowns -->
          <div v-for="space in spaces" :key="space.id" class="dropdown-section mb-1 relative">
            <button
              @click="toggleSpace(space)"
              class="group flex items-center gap-2.5 py-2 px-3 rounded-md text-gray-700 text-sm cursor-pointer hover:bg-white/70 transition-colors w-full min-w-0"
            >
              <span class="w-5 h-5 relative flex items-center justify-center">
                <span :class="['dropdown-arrow absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-all duration-200 rounded hover:bg-gray-200', space.isOpen ? 'rotate-90' : '']">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
                <span :class="['dropdown-icon w-5 h-5 rounded flex items-center justify-center text-[11px] group-hover:opacity-0 transition-all duration-200', space.color]">{{ space.emoji }}</span>
              </span>
              <span class="flex-1 text-left truncate">{{ space.name }}</span>
            </button>

            <!-- Space Items with animation -->
            <div
              class="dropdown-content overflow-hidden transition-all duration-300"
              :style="{ maxHeight: space.isOpen ? (space.items.length * 40 + 20) + 'px' : '0px', opacity: space.isOpen ? 1 : 0 }"
            >
              <button
                v-for="item in space.items"
                :key="item.id"
                @click="navigateToItem(item)"
                class="submenu-item group flex items-center gap-2.5 py-1.5 px-3 pl-10 rounded-md text-gray-600 text-[13px] cursor-pointer hover:bg-white/70 hover:text-gray-900 transition-colors w-full text-left min-w-0"
              >
                <span :class="['w-[18px] h-[18px] rounded flex items-center justify-center text-[10px]', item.color]">{{ item.emoji }}</span>
                <span class="flex-1 truncate">{{ item.name }}</span>
              </button>
            </div>
          </div>

          <!-- System Options -->
          <div class="px-3 pt-4">
            <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">System options</div>
            <div class="space-y-1">
              <button
                type="button"
                class="w-full flex items-center gap-2.5 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-white/70 transition-colors"
                @click="goToSettings"
              >
                <svg class="w-[18px] h-[18px] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Settings</span>
              </button>
              <button
                type="button"
                class="w-full flex items-center gap-2.5 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-white/70 transition-colors"
                @click="notify('Users')"
              >
                <svg class="w-[18px] h-[18px] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Users</span>
              </button>
              <button
                type="button"
                class="w-full flex items-center gap-2.5 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-white/70 transition-colors"
                @click="notify('Knowledge')"
              >
                <svg class="w-[18px] h-[18px] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>Knowledge</span>
              </button>
              <button
                type="button"
                class="w-full flex items-center gap-2.5 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-white/70 transition-colors"
                @click="notify('Bulletin')"
              >
                <svg class="w-[18px] h-[18px] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16v16H4z"></path>
                  <path d="M8 8h8"></path>
                  <path d="M8 12h8"></path>
                  <path d="M8 16h6"></path>
                </svg>
                <span>Bulletin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Resize Handle (desktop only) -->
    <div
      v-if="!uiStore.isMobile"
      class="resize-handle w-[3px] h-full cursor-col-resize hover:bg-gray-200 active:bg-gray-200 transition-colors"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<style scoped>
.sidebar-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
  scrollbar-gutter: stable both-edges;
  /* padding-right: 0.75rem; */
}

.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.65);
}

.menu-ellipsis,
.child-menu-ellipsis {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group:hover .menu-ellipsis,
.group:hover .child-menu-ellipsis,
.submenu-item.group:hover .child-menu-ellipsis {
  opacity: 0.9;
}

/* Submenu item with vertical line */
.submenu-item {
  position: relative;
}

.submenu-item::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #e5e7eb;
}

.submenu-item:last-child::before {
  height: 50%;
}

/* Dropdown arrow animation */
.dropdown-arrow {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.rotate-90 {
  transform: rotate(90deg);
}

/* Sidebar slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dropdown menu transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
  transform-origin: top left;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
