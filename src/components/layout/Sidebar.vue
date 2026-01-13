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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore, useWorkspaceStore, useNotificationStore, useAuthStore, useProjectStore } from '@/stores'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'
import {
  Activity,
  BarChart3,
  Bell,
  Book,
  BookOpen,
  Building2,
  CheckSquare,
  CircleHelp,
  Home,
  Code,
  Crown,
  FilePenLine,
  FileText,
  Flame,
  Folder,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Monitor,
  Newspaper,
  Palette,
  Rocket,
  Star,
  Settings,
  TestTube2,
  Trash2,
  TriangleAlert,
  User,
  UserPlus,
  Users,
  Video,
  Wallet,
  Wrench
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()

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
    icon: Home,
    route: { name: 'Home' },
    active: route.name === 'Home'
  },
  {
    label: 'To Do',
    icon: ListTodo,
    route: { name: 'MyTasks' },
    active: route.name === 'MyTasks'
  },
  {
    label: 'Inbox',
    icon: Bell,
    route: { name: 'Inbox' },
    active: route.name === 'Inbox',
    badge: notificationStore.unreadCount || 57
  },
])

// Dashboard items
const dashboardsOpen = ref(false)
const dashboardItems = ref([
  { id: 'd1', name: 'Overview', icon: LayoutDashboard, color: 'bg-blue-100' },
  { id: 'd2', name: 'Analytics', icon: BarChart3, color: 'bg-green-100' },
  { id: 'd3', name: 'Performance', icon: Activity, color: 'bg-purple-100' }
])

const projectsExpanded = ref(true)

// Projects from backend - computed from store
const projects = computed(() => projectStore.projects)

// Track which projects are expanded
const expandedProjects = ref(new Set())

function isProjectExpanded(projectId) {
  return expandedProjects.value.has(projectId)
}

function toggleProject(projectId) {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId)
  } else {
    expandedProjects.value.add(projectId)
  }
}

function toggleProjects() {
  projectsExpanded.value = !projectsExpanded.value
}

// Fetch projects on mount
onMounted(async () => {
  try {
    await projectStore.fetchProjects()
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }
})

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

function navigateToProject(project) {
  router.push({
    name: 'Project',
    params: {
      projectId: project.id
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
      <div class="relative h-full overflow-hidden">
        <div class="sticky top-0 z-10 bg-[#f4f4f5] pt-4 pb-3 px-3">
          <!-- Header -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2 font-semibold text-sm text-gray-900 min-w-0">
              <div class="w-7 h-7 flex-shrink-0 bg-primary-600 border border-gray-200 rounded-md flex items-center justify-center text-white text-xs font-semibold">
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
                      <User class="w-4 h-4" />
                    </button>
                  </template>

                <!-- Custom icons for menu items -->
                <template #icon-account>
                  <User class="w-4 h-4 text-gray-700" />
                </template>
                <template #icon-invite>
                  <UserPlus class="w-4 h-4 text-gray-700" />
                </template>
                <template #icon-settings>
                  <Settings class="w-4 h-4 text-gray-700" />
                </template>
                <template #icon-trash>
                  <Trash2 class="w-4 h-4 text-gray-700" />
                </template>
                <template #icon-logout>
                  <LogOut class="w-4 h-4 text-gray-700" />
                </template>
            </DropdownMenu>
          </div>

          <!-- New Task Button -->
            <!-- <button
              @click="openCreateTaskModal"
              class="flex items-center gap-2 w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm cursor-pointer mb-2 hover:bg-gray-50 transition-colors"
            >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New task
          </button> -->
        </div>

        <div class="h-full pr-2 pb-4 pt-4 space-y-4">
          <!-- Main Navigation -->
          <nav class="mb-6">
            <button
              v-for="item in mainNavItems"
              :key="item.label"
              @click="navigateTo(item)"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                item.active
                  ? 'bg-gray-300 text-gray-900 shadow-sm'
                  : 'text-gray-900 hover:bg-white/70'
              ]"
              >
                <span class="w-5 h-5 flex items-center justify-center opacity-70">
                  <component :is="item.icon" class="w-[18px] h-[18px]" />
                </span>
                <span class="flex-1 text-left truncate">{{ item.label }}</span>
                <span v-if="item.badge" class="bg-primary-500 text-white text-[11px] py-0.5 px-2 rounded-full font-medium ml-1">
                  {{ item.badge }}
                </span>
            </button>
          </nav>

          <!-- Spaces Section -->
          <div class="flex items-center justify-between px-3 mt-12 pb-0 mb-0">
            <button
              type="button"
              class="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 uppercase tracking-wide"
              @click="toggleProjects"
              :aria-expanded="projectsExpanded"
            >
              <ChevronDown
                class="w-3.5 h-3.5 text-gray-500 transition-transform"
                :class="{ '-rotate-90': !projectsExpanded }"
              />
              Project
            </button>
            <button
              @click="openCreateProjectModal"
              class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
              title="Add project"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <div class="projects-scroll">
            <!-- Projects from Backend -->
            <div v-show="projectsExpanded && projects.length > 0">
              <div v-for="project in projects" :key="project.id" class="dropdown-section mb-1 relative">
                <button
                  @click="navigateToProject(project)"
                  class="group flex items-center gap-2.5 py-2 px-3 rounded-md text-gray-900 text-sm cursor-pointer hover:bg-white/70 transition-colors w-full min-w-0"
                >
                  <span class="w-5 h-5 flex items-center justify-center">
                    <FolderOpen class="w-4 h-4 text-gray-600" />
                  </span>
                  <span class="flex-1 text-left truncate">{{ project.name }}</span>
                </button>
              </div>
            </div>

            <!-- Empty state when no projects -->
            <div v-show="projectsExpanded && projects.length === 0" class="px-3 py-4 text-center">
              <p class="text-xs text-gray-500">No projects yet</p>
              <button
                @click="openCreateProjectModal"
                class="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Create your first project
              </button>
            </div>
          </div>

        <!-- System Options (fixed bottom) -->
        <div class="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-[#f4f4f5] px-3 pt-4 pb-0 system-options pb-8">
          <div class="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">System options</div>
          <div class="space-y-1">
            <button
              type="button"
              class="w-full flex items-center gap-2.5 py-2 rounded-md text-sm text-gray-900 hover:bg-white/70 transition-colors"
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
              class="w-full flex items-center gap-2.5 py-2 rounded-md text-sm text-gray-900 hover:bg-white/70 transition-colors"
              @click="router.push({ name: 'Users' })"
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
              class="w-full flex items-center gap-2.5 py-2 rounded-md text-sm text-gray-900 hover:bg-white/70 transition-colors"
              @click="notify('Bulletin')"
            >
              <Newspaper class="w-[18px] h-[18px] opacity-70" />
              <span>Bulletin</span>
            </button>
            <button
              type="button"
              class="w-full flex items-center gap-2.5 py-2 rounded-md text-sm text-gray-900 hover:bg-white/70 transition-colors"
              @click="notify('Help & Resources')"
            >
              <CircleHelp class="w-[18px] h-[18px] opacity-70" />
              <span>Help & Resources</span>
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
.projects-scroll {
  max-height: calc(100vh - 360px - var(--system-options-height, 172px));
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
  scrollbar-gutter: stable both-edges;
  /* padding-right: 0.75rem; */
}

.system-options {
  --system-options-height: 172px;
}

.projects-scroll::-webkit-scrollbar {
  width: 8px;
}

.projects-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.projects-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.projects-scroll::-webkit-scrollbar-thumb:hover {
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
