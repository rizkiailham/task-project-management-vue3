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
import { useContextMenu } from '@/composables/useContextMenu'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  BarChart3,
  Bell,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Home,
  FileChartColumn,
  Grid2X2,
  GripVertical,
  LayoutDashboard,
  ListTodo,
  LogOut,
  NotebookText,
  Newspaper,
  Columns2,
  User,
  Users,
  BotMessageSquare,
  Ellipsis,
  Plus
} from 'lucide-vue-next'
import { VueDraggableNext as Draggable } from 'vue-draggable-next'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const confirm = useConfirm()
const { openContextMenu } = useContextMenu()

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
    badge: notificationStore.unreadCount
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

function toggleProjects() {
  projectsExpanded.value = !projectsExpanded.value
}

function isProjectActive(projectId) {
  if (currentProjectId.value && String(currentProjectId.value) === String(projectId)) {
    return true
  }
  return String(route.name).startsWith('Project') && String(route.params.projectId) === String(projectId)
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

const projectRenameId = ref(null)
const projectRenameValue = ref('')
const childRenameTarget = ref({ projectId: null, key: null })
const childRenameValue = ref('')

// Local project child items logic removed in favor of store items
// watch(projects, (list) => { ... }, { immediate: true })

// Fetch projects on mount
onMounted(async () => {
  try {
    await projectStore.fetchProjects({ limit: 9999 })
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
  const params = {
    projectId: project.id
  }

  router.push({
    name: 'ProjectList',
    params
  })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

function getProjectChildren(projectId) {
  const items = projectStore.getProjectItems(projectId) || []

  const iconMap = {
    task: Columns2,
    report: FileChartColumn,
    note: NotebookText,
    knowledge: BotMessageSquare
  }

  // Filter out 'note' items as they are accessed via the "Notes" list
  const mappedItems = items
    .map(item => ({
      key: item.id,
      id: item.id,
      label: item.name,
      type: item.type,
      icon: iconMap[item.type] || BotMessageSquare,
      routeName: item.type === 'task' ? 'ProjectBoard' : (item.type === 'note' ? 'ProjectNoteList' : (item.type === 'report' ? 'ProjectReport' : undefined))
    }))

  return mappedItems
}

function getChildLabel(item) {
  return item.label || item.name || (item.labelKey ? t(item.labelKey) : '')
}

function hasChildType(projectId, type) {
  const items = projectStore.getProjectItems(projectId)
  return items && items.some(item => item.type === type)
}

function isReportDisabled(projectId) {
  // Report creation is disabled if there is NO task board in the project
  return !hasChildType(projectId, 'task')
}

async function openProjectSettings(project) {
  navigateToProject(project)
  if (String(project.id) !== String(currentProjectId.value)) {
    await selectProject(project.id)
  }
  uiStore.openModal('settings', { section: 'project' })
  if (uiStore.isMobile) {
    uiStore.closeMobileSidebar()
  }
}

async function replicateProject(project) {
  try {
    const response = await projectStore.duplicateProject(project.id)
    uiStore.showApiSuccess(response, t('sidebar.messages.projectReplicated'))
  } catch (error) {
    uiStore.showApiError(error, t('sidebar.messages.projectReplicateFailed'))
  }
}

async function handleProjectClick(project) {
  // Only fetch/update if changing projects
  if (String(project.id) !== String(currentProjectId.value)) {
    // selectProject(project.id) // Let the view/route watcher handle data loading to avoid double fetch
  }

  // Toggle expansion
  if (expandedProjects.value.has(project.id)) {
    expandedProjects.value.delete(project.id)
  } else {
    expandedProjects.value.add(project.id)
    
    // Always fetch (deduped in store) before rendering children
    await projectStore.fetchProjectItems(project.id)
  }
  
  // Don't navigate to project - only expand/collapse
}

function onProjectRowClick(project) {
  if (projectRenameId.value === project.id) return
  handleProjectClick(project)
}

function onProjectRowContextMenu(event, project) {
  if (projectRenameId.value === project.id) return
  openContextMenu(event, {
    items: getProjectMenuItems(project),
    width: '12rem',
    variant: 'sidebar',
    data: { projectId: project.id, project }
  })
}

watch(
  () => [route.params.projectId, route.params.itemId],
  ([nextProjectId, nextItemId], [prevProjectId, prevItemId]) => {
    if (
      String(nextProjectId || '') !== String(prevProjectId || '') ||
      String(nextItemId || '') !== String(prevItemId || '')
    ) {
      cancelProjectRename()
      cancelChildRename()
    }
  }
)

function startProjectRename(project) {
  projectRenameId.value = project.id
  projectRenameValue.value = project.name
  nextTick(() => {
    const input = document.querySelector(`[data-project-rename="${project.id}"] input`)
    if (input) {
      input.focus({ preventScroll: true })
      input.select?.()
    }
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
    if (input) {
      input.focus({ preventScroll: true })
      input.select?.()
    }
  })
}

function cancelChildRename() {
  childRenameTarget.value = { projectId: null, key: null }
  childRenameValue.value = ''
}

async function saveChildRename(projectId, item) {
  const nextName = childRenameValue.value.trim()
  if (!nextName || nextName === getChildLabel(item)) {
    cancelChildRename()
    return
  }

  try {
    const response = await projectStore.updateProjectItem(projectId, item.key, { name: nextName })
    uiStore.showApiSuccess(response, t('sidebar.messages.itemRenamed'))
  } catch (error) {
    uiStore.showApiError(error, t('sidebar.messages.itemRenameFailed'))
  }
  cancelChildRename()
}

async function addChildItem(projectId, type) {
  // Map type to default name
  const defaultNames = {
    'task': 'New Tasks',
    'report': 'New Report',
    'note': 'New Notes',
    'knowledge': 'New Knowledge'
  }
  
  const name = defaultNames[type] || 'New Item'
  
  try {
    const response = await projectStore.createProjectItem(projectId, { name, type })
    uiStore.showApiSuccess(response, t('sidebar.messages.itemCreated'))
    
    // Ensure project is expanded
    if (!expandedProjects.value.has(projectId)) {
      expandedProjects.value.add(projectId)
    }
  } catch (error) {
    uiStore.showApiError(error, t('sidebar.messages.createFailed'))
  }
}

// function removeChildItem(projectId, key) { ... } // Replaced by deleteProjectItem logic

function confirmDeleteProject(project) {
  confirm.require({
    dialogType: 'delete',
    header: project.name ? `${t('common.delete')} ${project.name}` : t('sidebar.delete.projectTitle'),
    message: t('sidebar.delete.projectMessage'),
    accept: async () => {
      try {
        await projectStore.deleteProject(project.id)
        uiStore.showApiSuccess(null, t('sidebar.messages.projectDeleted'))
      } catch (error) {
        uiStore.showApiError(error, t('sidebar.messages.deleteFailed'))
      }
    }
  })
}

function confirmDeleteChild(projectId, item) {
  const childId = item.key || item.id
  confirm.require({
    dialogType: 'delete',
    header: item.name ? `${t('common.delete')} ${item.name}` : t('sidebar.delete.childTitle'),
    message: t('sidebar.delete.childMessage'),
    accept: async () => {
      try {
        await projectStore.deleteProjectItem(projectId, childId)
        uiStore.showApiSuccess(null, t('sidebar.messages.itemDeleted'))
      } catch (error) {
        uiStore.showApiError(error, t('sidebar.messages.deleteFailed'))
      }
    }
  })
}

async function handleItemReorder(event, projectId) {
  // 'event' contains the change details from Draggable
  // But we need the NEW list order to extract IDs.
  // Since 'getProjectChildren' provides a fresh array, we can't trust simple mutation of a prop.
  // HOWEVER, we can use the 'moved' event to simulate the reorder on the current store state
  // OR we can trust the UI state if 'Draggable' exposes the updated list.
  
  // Actually, standard practice with Draggable without v-model is to inspect the event:
  // event = { moved: { element, newIndex, oldIndex } }
  
  if (!event?.moved) return

  const { element, newIndex, oldIndex } = event.moved
  
  // Get current real items from store (these are the ones we can persist)
  const currentItems = [...projectStore.getProjectItems(projectId)]
  
  // We need to account for 'notes-list' which is in the UI list but not in the store list.
  // The 'newIndex' and 'oldIndex' refer to the UI list (which includes 'notes-list').
  
  // Let's reconstruct the UI list first to apply the move.
  // We need 'getProjectChildren' equivalent logic to rebuild the full list.
  
  // 1. Get full list as seen by UI
  // We can't easily call getProjectChildren inside here if it assumes some state, but we can replicate it.
  // Or better, we can accept the *new list* from the template if we change how we call this.
  
  // ALTERNATIVE: Just update the store logic to handle reorder by finding the item and moving it.
  // But 'element' is the UI item wrapper.
  // If element.type === 'note-list', we can't persist its move properly if backend doesn't support it.
  // If we move a task A around 'note-list', we need to know the new order of A relative to B, C.
  
  // Simplest approach: passing the NEW list from the template is best.
  // Change template: @change="handleItemReorder($event, project.id, list)" ? 
  // No, Draggable event is the change delta.
  
  // Let's use the delta.
  // 1. Reconstruct current UI list
  // const uiItems = getProjectChildren(projectId) -> returns [Notes, Task1, Task2...]
  // 2. move item in uiItems
  // 3. Filter out 'notes-list'
  // 4. Extract IDs
  // 5. Save
  
  const uiItems = getProjectChildren(projectId) // This returns current state (before move applied in store)
  // Wait, Draggable mutated the DOM, but data?
  // If Draggable didn't mutate a reactive array we care about, our 'reorder' logic needs to be precise.
  
  // NOTE: getProjectChildren returns a NEW array. Draggable mutating it doesn't affect next render unless we save it.
  // BUT the 'element' in event is the item object.
  
  const movedItem = uiItems[oldIndex]
  // Remove from old index
  uiItems.splice(oldIndex, 1)
  // Insert at new index
  uiItems.splice(newIndex, 0, movedItem)
  
  // Now uiItems matches the user's intent.
  // Filter out non-persistable items (like notes-list if needed, or keep if backend supports generic items?)
  // User said "for each sub item, i think we should add the id..." and "update store after reorder".
  // Assuming 'notes-list' cannot be persisted as 'id' in backend.
  // Current backend reorder likely expects UUIDs of existing items.
  // So we filter 'notes-list' out.
  
  const newOrderIds = uiItems
    .filter(i => i.type !== 'note-list')
    .map(i => i.key || i.id) // Use key or id
    
  // Optimistic update: Update store immediately so UI reflects change
  projectStore.updateLocalItemsOrder(projectId, newOrderIds)
  
  try {
    await projectStore.reorderProjectItems(projectId, newOrderIds)
  } catch (error) {
    uiStore.showApiError(error)
    // On error, refresh items to revert UI
    await projectStore.fetchProjectItems(projectId)
  }
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
  // Determine routeName based on item type
  let routeName
  if (item.type === 'task') routeName = 'ProjectList'
  else if (item.type === 'note') routeName = 'ProjectNoteList'
  else if (item.type === 'note-list') routeName = 'ProjectNoteList'
  else if (item.type === 'report') routeName = 'ProjectReport'
  
  const query = item.type && item.type !== 'note-list' ? { type: item.type } : {}
  
  if (routeName) {
    const routeData = router.resolve({
      name: routeName,
      params: { 
        projectId,
        itemId: item.id || item.key
      },
      query
    })
    return `${window.location.origin}${routeData.fullPath}`
  }
  return ''
}

async function openChildItem(projectId, item) {
  if (item.type === 'report' && isReportDisabled(projectId)) return
  
  // Determine routeName based on item type
  let routeName
  if (item.type === 'task') routeName = 'ProjectList'
  else if (item.type === 'note') routeName = 'ProjectNoteList'
  else if (item.type === 'note-list') routeName = 'ProjectNoteList'
  else if (item.type === 'report') routeName = 'ProjectReport'
  
  // Only navigate if route exists
  if (routeName) {
    const params = { projectId }
    if ((item.key || item.id) && item.key !== 'notes-list') {
      params.itemId = item.id || item.key
    }

    // Navigate - ProjectView's route watcher will handle selectProject
    // and ProjectBoardView's route watcher will handle selectProjectItem
    
    router.push({ 
      name: routeName, 
      params,
      query: item.type && item.type !== 'note-list' ? { type: item.type } : {}
    })
    if (uiStore.isMobile) {
      uiStore.closeMobileSidebar()
    }
  } else {
    // For items without routes, just show toast without activating
    uiStore.showInfo(t('sidebar.messages.comingSoon'))
  }
}

function onChildRowContextMenu(event, projectId, item) {
  if (item.type === 'report' && isReportDisabled(projectId)) return
  openContextMenu(event, {
    items: getChildMenuItems(projectId, { key: item.key, ...item }),
    width: '12rem',
    variant: 'sidebar',
    data: { projectId, item }
  })
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
      action: () => replicateProject(project)
    },
    { type: 'divider' },
    {
      id: 'delete',
      type: 'item',
      label: t('common.delete'),
      action: () => confirmDeleteProject(project)
    }
  ]
}

function getProjectAddItems(projectId) {
  return [
    {
      id: 'new-board',
      type: 'item',
      label: t('sidebar.projectActions.newBoard'),
      action: () => addChildItem(projectId, 'task')
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
      action: () => addChildItem(projectId, 'knowledge')
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
    },
    { type: 'divider' },
    {
      id: 'delete',
      type: 'item',
      label: t('common.delete'),
      action: () => confirmDeleteChild(projectId, item)
    }
  ]
  
  // Board specific items
  if (item.type === 'task') {
      baseItems.push(
      {
        id: 'settings',
        type: 'item',
        label: t('sidebar.context.settings'),
        action: () => openProjectSettings({ id: projectId })
      }
    )
  }

  if (item.key === 'knowledge') {
    baseItems.push({
      id: 'replicate-folder',
      type: 'item',
      label: t('sidebar.context.replicateFolder'),
      action: () => uiStore.showInfo(t('sidebar.messages.replicateFolder'))
    })
  }

  return baseItems
}



function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

function openCreateProjectModal() {
  projectStore.currentProject = null
  uiStore.openModal('settings', { section: 'project', projectTab: 'general' })
}

function goToSettings() {
  if (projectStore.currentProjectId) {
    uiStore.openModal('settings', { section: 'project' })
  } else {
    projectStore.currentProject = null
    uiStore.openModal('settings')
  }
  
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
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-[14px] font-medium cursor-pointer transition-colors w-full min-w-0 group',
                item.active
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              >
                <span class="w-5 h-5 flex items-center justify-center text-gray-900">
                  <component :is="item.icon" class="w-[18px] h-[18px] text-gray-900" />
                </span>
                <span class="flex-1 text-left truncate font-medium">{{ item.label }}</span>
                <span v-if="item.badge" class="bg-primary-500 text-white text-[11px] py-0.5 px-2 rounded-full font-medium ml-1">
                  {{ item.badge }}
                </span>
            </button>
          </nav>

          <!-- Project Section -->
          <div class="sidebar-project-header flex items-center justify-between px-3 mt-10 pb-0 mb-2">
            <Button
              type="button"
              class="flex items-center px-3 gap-1.5 text-[14px] font-medium text-gray-400 uppercase tracking-wide"
              @click="toggleProjects"
              :aria-expanded="projectsExpanded"
              unstyled
            >
              <span class="font-bold">{{ t('sidebar.projectSection.title') }}</span>
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
                    'sidebar-project-row flex items-center gap-2.5 px-3 rounded-md text-[14px] font-medium transition-colors w-full min-w-0 group',
                    { 'is-renaming-project': projectRenameId === project.id },
                    isProjectActive(project.id) && !projectStore.activeProjectItemId
                      ? 'bg-[#e5e6ec] text-gray-900'
                      : 'text-gray-900 hover:bg-[#e5e6ec]'
                  ]"
                  @click="onProjectRowClick(project)"
                  @contextmenu.prevent="onProjectRowContextMenu($event, project)"
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
                        @click.stop
                      >
                        <InputText
                          v-model="projectRenameValue"
                          class="sidebar-rename-input sidebar-rename-input--project w-full text-sm"
                          @click.stop
                          @keydown.enter.prevent="saveProjectRename(project)"
                          @keydown.esc.prevent="cancelProjectRename"
                          @blur="saveProjectRename(project)"
                        />
                      </span>
                      <span
                        v-else
                        class="sidebar-item-label sidebar-item-label--project truncate font-medium"
                        :title="project.name"
                      >
                        {{ project.name }}
                      </span>
                    </span>
                  </button>
                  <div class="sidebar-project-actions flex items-center gap-1">
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
                  <Draggable
                    :list="getProjectChildren(project.id)"
                    class="space-y-1"
                    handle=".drag-handle"
                    :group="`project-${project.id}`"
                    :item-key="'key'"
                    :animation="200"
                    @change="(e) => handleItemReorder(e, project.id)"
                  >
                    <div
                      v-for="item in getProjectChildren(project.id)"
                      :key="item.key"
                      :class="[
                        'sidebar-child-row submenu-item flex items-center gap-2.5 py-1.5 px-3 pl-10 rounded-md text-[14px] font-medium cursor-pointer transition-all group relative',
                        (item.type === 'report' && isReportDisabled(project.id))
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-900 hover:bg-[#e5e6ec] hover:text-gray-900',
                          { 'bg-[#e5e6ec] font-medium': isProjectActive(project.id) && item.key === (projectStore.activeProjectItemId || (route.name === 'ProjectNoteList' ? 'notes-list' : null)) }
                      ]"
                      @click="openChildItem(project.id, item)"
                      @contextmenu.prevent="onChildRowContextMenu($event, project.id, item)"
                    >
                      <!-- Drag Handle (visible on hover) -->
                      <span class="drag-handle absolute left-4 w-4 h-full flex items-center justify-center opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity">
                        <GripVertical class="w-3 h-3" />
                      </span>

                      <span class="w-[18px] h-[18px] flex items-center justify-center text-gray-900">
                         <component :is="item.icon" class="w-[16px] h-[16px]" />
                      </span>
                      <span class="flex-1 min-w-0 text-left truncate">
                        <span
                          v-if="childRenameTarget.projectId === project.id && childRenameTarget.key === item.key"
                          class="sidebar-rename-wrapper sidebar-rename-wrapper--child inline-flex w-full items-center"
                          :data-child-rename="`${project.id}-${item.key}`"
                          @click.stop
                        >
                          <InputText
                            v-model="childRenameValue"
                            class="sidebar-rename-input sidebar-rename-input--child w-full text-[13px]"
                            @keydown.enter.prevent="saveChildRename(project.id, { key: item.key, ...item })"
                            @keydown.esc.prevent="cancelChildRename"
                            @blur="saveChildRename(project.id, { key: item.key, ...item })"
                            autoFocus
                          />
                        </span>
                        <span
                          v-else
                          class="sidebar-item-label sidebar-item-label--child truncate font-medium"
                          :title="item.label || item.name"
                        >
                          {{ item.label || item.name }}
                        </span>
                      </span>
                      <div
                        v-if="!(item.type === 'report' && isReportDisabled(project.id))"
                        class="sidebar-child-actions"
                      >
                        <DropdownMenu
                          :items="getChildMenuItems(project.id, { key: item.key, ...item })"
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
                      </div>
                    </div>
                  </Draggable>
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
          <div class="text-[14px] font-bold text-gray-400 uppercase tracking-wide px-3 mb-2">System options</div>
          <div class="space-y-1">
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-[14px] font-medium cursor-pointer transition-colors w-full min-w-0 group',
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
              <span class="font-medium">Settings</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-[14px] font-medium cursor-pointer transition-colors w-full min-w-0 group',
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
              <span class="font-medium">Users</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-[14px] font-medium cursor-pointer transition-colors w-full min-w-0 group',
                isBulletinActive
                  ? 'bg-[#e5e6ec] text-gray-900'
                  : 'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToBulletin"
            >
              <Newspaper class="w-[18px] h-[18px] text-gray-900" />
              <span class="font-medium">{{ t('sidebar.bulletin') }}</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2.5 py-2 px-3 rounded-md text-[14px] font-medium cursor-pointer transition-colors w-full min-w-0 group',
                'text-gray-900 hover:bg-[#e5e6ec]'
              ]"
              @click="goToHelp"
            >
              <CircleHelp class="w-[18px] h-[18px] text-gray-900" />
              <span class="font-medium">{{ t('sidebar.helpResources') }}</span>
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
  opacity: 0.9;
  transition: opacity 0.15s ease;
}

.project-toggle-arrow.rotate-90 {
  transform: rotate(90deg);
}

.sidebar-rename-input {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
  border-color: #d1d5db;
  box-shadow: none;
  border: 1px solid;
  padding: 0 0.2rem;
  line-height: 1.25;
  box-sizing: border-box;
  height: 100%;
  margin: 0;
}

.sidebar-rename-input:focus {
  border-color: #9ca3af;
  box-shadow: none!important;
}

.sidebar-rename-input--project {
  font-size: 14px;
}

.sidebar-rename-input--child {
  font-size: 14px;
}

.sidebar-rename-wrapper--project {
  height: 1.75rem;
}

.sidebar-rename-wrapper--child {
  height: 1.5rem;
}

.sidebar-item-label {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: inherit;
}

.sidebar-item-label--project {
  height: 1.75rem;
  line-height: 1.75rem;
}

.sidebar-item-label--child {
  height: 1.5rem;
  line-height: 1.5rem;
}

.sidebar-project-row {
  min-height: 1.8rem;
}

.sidebar-child-row {
  min-height: 1.75rem;
}

.sidebar-project-actions {
  flex: 0 0 auto;
  width: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: width 0.15s ease, opacity 0.15s ease, margin-left 0.15s ease;
}

.sidebar-project-row:hover .sidebar-project-actions {
  width: 4.25rem;
  margin-left: 0.25rem;
  opacity: 1;
  pointer-events: auto;
}

.sidebar-project-row.is-renaming-project .sidebar-project-actions {
  width: 4.25rem;
  margin-left: 0.25rem;
  opacity: 0.9;
  pointer-events: auto;
}

.sidebar-project-row.is-renaming-project .sidebar-project-trigger {
  flex: 1 1 calc(100% - 4.25rem);
}

.sidebar-child-actions {
  flex: 0 0 auto;
  width: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: width 0.15s ease, opacity 0.15s ease, margin-left 0.15s ease;
}

.sidebar-child-row:hover .sidebar-child-actions {
  width: 2rem;
  margin-left: 0.25rem;
  opacity: 1;
  pointer-events: auto;
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




