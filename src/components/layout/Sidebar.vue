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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore, useNotificationStore, useAuthStore, useProjectStore } from '@/stores'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  BarChart3,
  Bell,
  Book,
  BookOpen,
  Building2,
  CheckSquare,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Home,
  Code,
  Crown,
  FilePenLine,
  FileChartColumn,
  Flame,
  Grid2X2,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Monitor,
  NotebookText,
  Newspaper,
  Palette,
  Rocket,
  Star,
  TestTube2,
  Columns2,
  TriangleAlert,
  User,
  Users,
  Video,
  Wallet,
  BotMessageSquare,
  Ellipsis,
  Plus,
  Wrench
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()

// User menu items for DropdownMenu component
const userMenuItems = computed(() => [
  {
    id: 'logout',
    type: 'item',
    label: 'Log out',
    shortcut: 'Alt+Q',
    action: handleLogout
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
const currentProjectId = computed(() => projectStore.currentProjectId)

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

function isProjectActive(projectId) {
  if (currentProjectId.value && String(currentProjectId.value) === String(projectId)) {
    return true
  }
  return route.name === 'Project' && String(route.params.projectId) === String(projectId)
}

async function selectProject(projectId) {
  try {
    await projectStore.selectProject(projectId)
  } catch (error) {
    uiStore.showApiError(error, t('projects.errors.loadFailed'))
  }
}

const isSettingsActive = computed(() => {
  const name = route.name ? String(route.name) : ''
  return uiStore.activeModal === 'settings' || name === 'Settings' || name.startsWith('Settings')
})

const isUsersActive = computed(() => route.name === 'Users')
const isBulletinActive = computed(() => route.name === 'Bulletin')

const projectChildItems = ref({})
const projectRenameId = ref(null)
const projectRenameValue = ref('')
const childRenameTarget = ref({ projectId: null, key: null })
const childRenameValue = ref('')
const deleteConfirmVisible = ref(false)
const deleteConfirmLoading = ref(false)
const deleteTarget = ref({ type: '', projectId: null, childKey: null, label: '' })

const defaultProjectChildren = computed(() => ([
  {
    key: 'board',
    labelKey: 'sidebar.projectItems.board',
    icon: Columns2,
    routeName: 'ProjectBoard'
  },
  {
    key: 'report',
    labelKey: 'sidebar.projectItems.report',
    icon: FileChartColumn
  },
  {
    key: 'note',
    labelKey: 'sidebar.projectItems.note',
    icon: NotebookText
  },
  {
    key: 'folder',
    labelKey: 'sidebar.projectItems.folder',
    icon: BotMessageSquare
  }
]))

watch(projects, (list) => {
  list.forEach((project) => {
    if (!projectChildItems.value[project.id]) {
      projectChildItems.value[project.id] = defaultProjectChildren.value.map(item => ({
        ...item,
        label: ''
      }))
    }
  })
}, { immediate: true })

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
    projectStore.currentProject = null
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

function getProjectChildren(projectId) {
  return projectChildItems.value[projectId] || []
}

function getChildLabel(item) {
  return item.label || t(item.labelKey)
}

function hasChildItem(projectId, key) {
  return getProjectChildren(projectId).some(item => item.key === key)
}

function isReportDisabled(projectId) {
  return !hasChildItem(projectId, 'board')
}

async function openProjectSettings(project) {
  navigateToProject(project)
  await selectProject(project.id)
  uiStore.openModal('settings', { section: 'project' })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function handleProjectClick(project) {
  selectProject(project.id)
  toggleProject(project.id)
  navigateToProject(project)
}

function startProjectRename(project) {
  navigateToProject(project)
  projectRenameId.value = project.id
  projectRenameValue.value = project.name
  nextTick(() => {
    const input = document.querySelector(`[data-project-rename="${project.id}"] input`)
    if (input) input.focus()
  })
}

function cancelProjectRename() {
  projectRenameId.value = null
  projectRenameValue.value = ''
}

async function saveProjectRename(project) {
  const nextName = projectRenameValue.value.trim()
  if (!nextName || nextName === project.name) {
    cancelProjectRename()
    return
  }

  try {
    const response = await projectStore.updateProject(project.id, { name: nextName })
    uiStore.showApiSuccess(response, t('sidebar.messages.projectRenamed'))
    cancelProjectRename()
  } catch (error) {
    uiStore.showApiError(error, t('sidebar.messages.projectRenameFailed'))
  }
}

function startChildRename(projectId, item) {
  childRenameTarget.value = { projectId, key: item.key }
  childRenameValue.value = getChildLabel(item)
  nextTick(() => {
    const input = document.querySelector(`[data-child-rename="${projectId}-${item.key}"] input`)
    if (input) input.focus()
  })
}

function cancelChildRename() {
  childRenameTarget.value = { projectId: null, key: null }
  childRenameValue.value = ''
}

function saveChildRename(projectId, item) {
  const nextName = childRenameValue.value.trim()
  if (!nextName || nextName === getChildLabel(item)) {
    cancelChildRename()
    return
  }

  const items = getProjectChildren(projectId)
  projectChildItems.value[projectId] = items.map((child) => {
    if (child.key !== item.key) return child
    return { ...child, label: nextName }
  })
  cancelChildRename()
}

function addChildItem(projectId, key) {
  if (hasChildItem(projectId, key)) {
    uiStore.showInfo(t('sidebar.messages.itemAlreadyExists'))
    return
  }
  const defaults = defaultProjectChildren.value.find(item => item.key === key)
  if (!defaults) return
  projectChildItems.value[projectId] = [
    ...getProjectChildren(projectId),
    { ...defaults, label: '' }
  ]
  expandedProjects.value.add(projectId)
}

function removeChildItem(projectId, key) {
  projectChildItems.value[projectId] = getProjectChildren(projectId).filter(item => item.key !== key)
}

function openDeleteConfirm(target) {
  deleteTarget.value = target
  deleteConfirmVisible.value = true
}

async function confirmDelete() {
  if (deleteConfirmLoading.value) return
  deleteConfirmLoading.value = true

  try {
    if (deleteTarget.value.type === 'project') {
      const response = await projectStore.deleteProject(deleteTarget.value.projectId)
      uiStore.showApiSuccess(response, t('sidebar.messages.projectDeleted'))
      delete projectChildItems.value[deleteTarget.value.projectId]
    } else if (deleteTarget.value.type === 'child') {
      removeChildItem(deleteTarget.value.projectId, deleteTarget.value.childKey)
    }
    deleteConfirmVisible.value = false
  } catch (error) {
    uiStore.showApiError(error, t('sidebar.messages.projectDeleteFailed'))
  } finally {
    deleteConfirmLoading.value = false
  }
}

function cancelDelete() {
  deleteConfirmVisible.value = false
}

function copyLink(link) {
  if (!link) {
    uiStore.showInfo(t('sidebar.messages.comingSoon'))
    return
  }
  navigator.clipboard.writeText(link)
    .then(() => uiStore.showSuccess(t('sidebar.messages.linkCopied')))
    .catch(() => uiStore.showError(t('sidebar.messages.linkCopyFailed')))
}

function resolveChildLink(projectId, item) {
  if (item.routeName) {
    const routeData = router.resolve({
      name: item.routeName,
      params: { projectId }
    })
    return `${window.location.origin}${routeData.fullPath}`
  }
  return ''
}

async function openChildItem(projectId, item) {
  if (item.key === 'report' && isReportDisabled(projectId)) return
  try {
    await selectProject(projectId)
  } catch (error) {
    uiStore.showApiError(error, t('projects.errors.loadFailed'))
  }
  if (item.routeName) {
    router.push({ name: item.routeName, params: { projectId } })
    if (uiStore.isMobile) {
      uiStore.closeMobileSidebar()
    }
    return
  }
  uiStore.showInfo(t('sidebar.messages.comingSoon'))
}

function getProjectMenuItems(project) {
  return [
    {
      id: 'rename',
      type: 'item',
      label: t('sidebar.context.rename'),
      action: () => startProjectRename(project)
    },
    {
      id: 'settings',
      type: 'item',
      label: t('sidebar.context.projectSettings'),
      action: () => openProjectSettings(project)
    },
    {
      id: 'replicate',
      type: 'item',
      label: t('sidebar.context.replicateProject'),
      action: () => uiStore.showInfo(t('sidebar.messages.replicateProject'))
    },
    { type: 'divider' },
    {
      id: 'delete',
      type: 'item',
      label: t('common.delete'),
      action: () => openDeleteConfirm({
        type: 'project',
        projectId: project.id,
        label: project.name
      })
    }
  ]
}

function getProjectAddItems(projectId) {
  return [
    {
      id: 'new-board',
      type: 'item',
      label: t('sidebar.projectActions.newBoard'),
      action: () => addChildItem(projectId, 'board')
    },
    {
      id: 'new-report',
      type: 'item',
      label: t('sidebar.projectActions.newReport'),
      disabled: isReportDisabled(projectId),
      action: () => addChildItem(projectId, 'report')
    },
    {
      id: 'new-note',
      type: 'item',
      label: t('sidebar.projectActions.newNote'),
      action: () => addChildItem(projectId, 'note')
    },
    {
      id: 'new-folder',
      type: 'item',
      label: t('sidebar.projectActions.newFolder'),
      action: () => addChildItem(projectId, 'folder')
    }
  ]
}

function getChildMenuItems(projectId, item) {
  const baseItems = [
    {
      id: 'rename',
      type: 'item',
      label: t('sidebar.context.rename'),
      action: () => startChildRename(projectId, item)
    },
    {
      id: 'copy-link',
      type: 'item',
      label: t('sidebar.context.copyLink'),
      action: () => copyLink(resolveChildLink(projectId, item))
    }
  ]

  if (item.key === 'board') {
    baseItems.push(
      {
        id: 'settings',
        type: 'item',
        label: t('sidebar.context.settings'),
        action: () => openProjectSettings({ id: projectId })
      },
      {
        id: 'replicate',
        type: 'item',
        label: t('sidebar.context.replicateBoard'),
        action: () => uiStore.showInfo(t('sidebar.messages.replicateBoard'))
      },
      {
        id: 'template',
        type: 'item',
        label: t('sidebar.context.saveAsTemplate'),
        action: () => uiStore.showInfo(t('sidebar.messages.saveAsTemplate'))
      }
    )
  }

  if (item.key === 'note') {
    baseItems.push({
      id: 'replicate-note',
      type: 'item',
      label: t('sidebar.context.replicateNote'),
      action: () => uiStore.showInfo(t('sidebar.messages.replicateNote'))
    })
  }

  if (item.key === 'folder') {
    baseItems.push({
      id: 'replicate-folder',
      type: 'item',
      label: t('sidebar.context.replicateFolder'),
      action: () => uiStore.showInfo(t('sidebar.messages.replicateFolder'))
    })
  }

  return [
    ...baseItems,
    { type: 'divider' },
    {
      id: 'delete',
      type: 'item',
      label: t('common.delete'),
      action: () => openDeleteConfirm({
        type: 'child',
        projectId,
        childKey: item.key,
        label: getChildLabel(item)
      })
    }
  ]
}

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

function openCreateProjectModal() {
  projectStore.currentProject = null
  uiStore.openModal('settings', { section: 'project', projectTab: 'general' })
}

function goToSettings() {
  projectStore.currentProject = null
  uiStore.openModal('settings')
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function goToUsers() {
  projectStore.currentProject = null
  router.push({ name: 'Users' })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function goToBulletin() {
  projectStore.currentProject = null
  router.push({ name: 'Bulletin' })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function goToHelp() {
  projectStore.currentProject = null
  notify(t('sidebar.helpResources'))
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
                      class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                      title="Account"
                    >
                      <User class="w-4 h-4" />
                    </button>
                  </template>

                <!-- Custom icons for menu items -->
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

        <div class="h-full pb-4 pt-4 space-y-4">
          <!-- Main Navigation -->
          <nav class="mb-6 px-3">
            <button
              v-for="item in mainNavItems"
              :key="item.label"
              @click="navigateTo(item)"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                item.active
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              >
                <span class="w-5 h-5 flex items-center justify-center text-gray-900">
                  <component :is="item.icon" class="w-[18px] h-[18px] text-gray-900" />
                </span>
                <span class="flex-1 text-left truncate">{{ item.label }}</span>
                <span v-if="item.badge" class="bg-primary-500 text-white text-[11px] py-0.5 px-2 rounded-full font-medium ml-1">
                  {{ item.badge }}
                </span>
            </button>
          </nav>

          <!-- Project Section -->
          <div class="sidebar-project-header flex items-center justify-between px-3 mt-10 pb-0 mb-2">
            <Button
              type="button"
              class="flex items-center px-3 gap-1.5 text-[14px] font-semibold text-gray-600 uppercase tracking-wide"
              @click="toggleProjects"
              :aria-expanded="projectsExpanded"
              unstyled
            >
              {{ t('sidebar.projectSection.title') }}
              <ChevronDown
                class="sidebar-project-chevron w-3.5 h-3.5 text-gray-500 transition-transform"
                :class="{ '-rotate-90': !projectsExpanded }"
              />
            </Button>
            <Button
              @click.stop="openCreateProjectModal"
              class="sidebar-project-add w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              :title="t('sidebar.projectSection.addProject')"
              unstyled
            >
              <Plus class="w-4 h-4" />
            </Button>
          </div>

          <div class="projects-scroll">
            <div v-show="projectsExpanded && projects.length > 0" class="space-y-1">
              <div v-for="project in projects" :key="project.id" class="dropdown-section relative">
                <div
                  :class="[
                    'sidebar-project-row flex items-center gap-2.5 px-3 rounded-md text-sm transition-colors w-full min-w-0 group',
                    isProjectActive(project.id)
                      ? 'bg-[#e5e6ec] text-gray-900'
                      : 'text-gray-900 hover:bg-[#e5e6ec]'
                  ]"
                  @click="handleProjectClick(project)"
                >
                  <button
                    class="sidebar-project-trigger flex items-center gap-2.5 min-w-0 flex-1 w-full cursor-pointer"
                  >
                    <span
                      class="project-toggle w-5 h-5 relative flex items-center justify-center text-gray-900"
                    >
                      <span
                        class="project-toggle-arrow absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-70 transition-all duration-200 rounded hover:bg-gray-200"
                        :class="{ 'rotate-90': isProjectExpanded(project.id) }"
                      >
                        <ChevronRight class="w-4 h-4" />
                      </span>
                      <span class="project-icon group-hover:opacity-0 transition-all duration-200">
                        <Grid2X2 class="w-[18px] h-[18px] text-gray-900" />
                      </span>
                    </span>
                    <span class="flex-1 min-w-0 text-left truncate">
                      <span
                        v-if="projectRenameId === project.id"
                        class="sidebar-rename-wrapper sidebar-rename-wrapper--project inline-flex w-full items-center"
                        :data-project-rename="project.id"
                      >
                        <InputText
                          v-model="projectRenameValue"
                          class="sidebar-rename-input sidebar-rename-input--project w-full text-sm"
                          @keydown.enter.prevent="saveProjectRename(project)"
                          @keydown.esc.prevent="cancelProjectRename"
                          @blur="saveProjectRename(project)"
                        />
                      </span>
                      <span v-else class="truncate">{{ project.name }}</span>
                    </span>
                  </button>
                  <div class="sidebar-project-actions flex items-center gap-1 ml-auto">
                    <DropdownMenu
                      :items="getProjectMenuItems(project)"
                      position="left"
                      width="12rem"
                      variant="sidebar"
                    >
                      <template #trigger>
                        <button
                          type="button"
                          class="menu-ellipsis w-6 h-6 flex items-center justify-center rounded text-gray-900 hover:text-gray-900 transition-colors cursor-pointer"
                          :aria-label="t('sidebar.context.openMenu')"
                        >
                          <Ellipsis class="w-4 h-4" />
                        </button>
                      </template>
                    </DropdownMenu>
                    <DropdownMenu
                      :items="getProjectAddItems(project.id)"
                      position="left"
                      width="12rem"
                      variant="sidebar"
                    >
                      <template #trigger>
                        <button
                          type="button"
                          class="menu-ellipsis w-6 h-6 flex items-center justify-center rounded text-gray-900 hover:text-gray-900 transition-colors cursor-pointer"
                          :aria-label="t('sidebar.projectActions.addItem')"
                        >
                          <Plus class="w-4 h-4" />
                        </button>
                      </template>
                    </DropdownMenu>
                  </div>
                </div>

                <div v-show="isProjectExpanded(project.id)" class="mt-1 space-y-1">
                  <div
                    v-for="item in getProjectChildren(project.id)"
                    :key="`${project.id}-${item.key}`"
                    :class="[
                      'sidebar-child-row submenu-item flex items-center gap-2.5 py-1.5 px-3 pl-10 rounded-md text-[13px] cursor-pointer transition-all group',
                      (item.key === 'report' && isReportDisabled(project.id))
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-900 hover:bg-[#e5e6ec] hover:text-gray-900'
                    ]"
                    @click="openChildItem(project.id, item)"
                  >
                    <span class="w-[18px] h-[18px] flex items-center justify-center text-gray-900">
                      <component :is="item.icon" class="w-[16px] h-[16px] text-gray-900" />
                    </span>
                    <span class="flex-1 min-w-0 text-left truncate">
                      <span
                        v-if="childRenameTarget.projectId === project.id && childRenameTarget.key === item.key"
                        class="sidebar-rename-wrapper sidebar-rename-wrapper--child inline-flex w-full items-center"
                        :data-child-rename="`${project.id}-${item.key}`"
                      >
                        <InputText
                          v-model="childRenameValue"
                          class="sidebar-rename-input sidebar-rename-input--child w-full text-[13px]"
                          @keydown.enter.prevent="saveChildRename(project.id, item)"
                          @keydown.esc.prevent="cancelChildRename"
                          @blur="saveChildRename(project.id, item)"
                        />
                      </span>
                      <span v-else class="truncate">{{ getChildLabel(item) }}</span>
                    </span>
                    <DropdownMenu
                      v-if="!(item.key === 'report' && isReportDisabled(project.id))"
                      :items="getChildMenuItems(project.id, item)"
                      position="left"
                      width="12rem"
                      variant="sidebar"
                    >
                      <template #trigger>
                        <button
                          type="button"
                          class="child-menu-ellipsis w-6 h-6 flex items-center justify-center rounded text-gray-900 hover:text-gray-900 transition-colors cursor-pointer"
                          :aria-label="t('sidebar.context.openMenu')"
                        >
                          <Ellipsis class="w-4 h-4" />
                        </button>
                      </template>
                    </DropdownMenu>
                    <button
                      v-else
                      type="button"
                      class="child-menu-ellipsis w-6 h-6 flex items-center justify-center rounded text-gray-400 cursor-not-allowed"
                      :aria-label="t('sidebar.context.openMenu')"
                      disabled
                    >
                      <Ellipsis class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="projectsExpanded && projects.length === 0" class="px-3 py-4 text-center">
              <p class="text-xs text-gray-500">{{ t('sidebar.projectSection.emptyTitle') }}</p>
              <button
                @click="openCreateProjectModal"
                class="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                {{ t('sidebar.projectSection.emptyAction') }}
              </button>
            </div>
          </div>

        <!-- System Options (fixed bottom) -->
        <div class="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-[#f4f4f5] px-3 pt-4 pb-0 system-options pb-8">
          <div class="text-[11px] font-semibold text-[14px] font-semibold text-gray-600 uppercase tracking-wide px-3 mb-2">System options</div>
          <div class="space-y-1">
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                isSettingsActive
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToSettings"
            >
              <svg class="w-[18px] h-[18px] text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                isUsersActive
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToUsers"
            >
              <svg class="w-[18px] h-[18px] text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Users</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                isBulletinActive
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToBulletin"
            >
              <Newspaper class="w-[18px] h-[18px] text-gray-900" />
              <span>{{ t('sidebar.bulletin') }}</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-sm cursor-pointer transition-colors w-full min-w-0 group',
                'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToHelp"
            >
              <CircleHelp class="w-[18px] h-[18px] text-gray-900" />
              <span>{{ t('sidebar.helpResources') }}</span>
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

  <DeleteConfirmModal
    v-model:visible="deleteConfirmVisible"
    :title="deleteTarget.type === 'project'
      ? t('sidebar.delete.projectTitle', { name: deleteTarget.label })
      : t('sidebar.delete.childTitle', { name: deleteTarget.label })"
    :message="deleteTarget.type === 'project'
      ? t('sidebar.delete.projectMessage')
      : t('sidebar.delete.childMessage')"
    :loading="deleteConfirmLoading"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />
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

.project-toggle-arrow.rotate-90 {
  transform: rotate(90deg);
}

.sidebar-rename-input {
  font-weight: 400;
  color: #111827;
  border-color: #d1d5db;
  box-shadow: none;
  border: 1px solid;
  padding: 0 0.5rem;
  line-height: 1;
  box-sizing: border-box;
  height: 100%;
  margin: 0;
}

.sidebar-rename-input:focus {
  border-color: #9ca3af;
  box-shadow: none!important;
}

.sidebar-rename-input--project {
  font-size: 0.875rem;
}

.sidebar-rename-input--child {
  font-size: 13px;
}

.sidebar-rename-wrapper--project {
  height: 1.75rem;
}

.sidebar-rename-wrapper--child {
  height: 1.5rem;
}

.sidebar-project-row {
  min-height: 1.8rem;
}

.sidebar-child-row {
  min-height: 1.75rem;
}

.sidebar-project-actions {
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.15s ease, width 0.15s ease;
}

.sidebar-project-row:hover .sidebar-project-actions {
  width: 3rem;
  opacity: 1;
}

.sidebar-project-chevron,
.sidebar-project-add {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sidebar-project-header:hover .sidebar-project-chevron,
.sidebar-project-header:hover .sidebar-project-add {
  opacity: 1;
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
