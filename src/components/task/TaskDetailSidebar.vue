<script setup>
/**
 * TaskDetailSidebar - Resizable task detail panel
 *
 * Features:
 * - Adjustable width with drag handle
 * - Task properties section
 * - Notion-style description editor with slash commands and mentions
 * - Subtasks with progress
 * - Activity timeline
 */
import { ref, computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useUIStore, useAIChatStore, useProjectStore, useProjectPropertyStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import Avatar from 'primevue/avatar'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'
import NotionEditor from '@/components/editor/NotionEditor.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  User as UserIcon, 
  Link2, 
  Paperclip, 
  MoreHorizontal,
  X,
  Maximize2,
  Clock,
  Pin,
  Copy,
  Pencil,
  Trash,
  Calendar,
  CornerUpLeft
} from 'lucide-vue-next'

const { t } = useI18n()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const aiChatStore = useAIChatStore()
const projectStore = useProjectStore()
const propertyStore = useProjectPropertyStore()


// Topbar height constant
const TOPBAR_HEIGHT = 56

// Refs
const sidebarRef = ref(null)
const startX = ref(0)
const startWidth = ref(0)
const descriptionEditorRef = ref(null)
const isEditingDescription = ref(false)
const localDescription = ref('')
const isPropertiesOpen = ref(true)
const isDescriptionOpen = ref(true)
const isAttachmentsOpen = ref(false)
const isRelationshipsOpen = ref(false)
const isSubscribersOpen = ref(false)
const isSubtasksOpen = ref(true)
const isActivityOpen = ref(false)
const isCommentsOpen = ref(true)
const isAiDescriptionPending = ref(false)
const pendingAiDescription = ref('')
const descriptionBeforeAi = ref('')
const aiInjectedIntoEditor = ref(false)
const aiReplaceMode = computed(() => !isRichTextEmpty(descriptionBeforeAi.value))

// Computed
const isOpen = computed(() => uiStore.isTaskPanelOpen)
const task = computed(() => taskStore.currentTask)

// Dynamic property options (must be after task declaration)
const currentProjectId = computed(() => task.value?.projectId || projectStore.currentProjectId)
const dynamicStatusOptions = computed(() => {
  if (!currentProjectId.value) return []
  return propertyStore.statusOptions(currentProjectId.value)
})
const dynamicPriorityOptions = computed(() => {
  if (!currentProjectId.value) return []
  return propertyStore.priorityOptions(currentProjectId.value)
})

// Ensure properties are loaded when task changes
watch(currentProjectId, (pid) => {
  if (pid) propertyStore.fetchProperties(pid)
}, { immediate: true })

const subtasks = computed(() => taskStore.subtasks)
const isLoading = computed(() => taskStore.isLoadingTask)
const subtaskProgress = computed(() => taskStore.subtaskProgress)
const sidebarWidth = computed(() => uiStore.taskDetailSidebarWidth)
const isResizing = computed(() => uiStore.isResizingTaskDetailSidebar)
const relatedTaskCache = ref(new Map())

const parentTaskId = computed(() => task.value?.parentTaskId || null)
const relationshipCount = computed(() => (parentTaskId.value ? 1 : 0))

function cacheRelatedTask(taskData) {
  if (!taskData?.id) return
  const next = new Map(relatedTaskCache.value)
  next.set(String(taskData.id), taskData)
  relatedTaskCache.value = next
}

function findTaskById(taskId) {
  if (!taskId) return null
  const lookupId = String(taskId)
  const fromCurrent =
    task.value?.id && String(task.value.id) === lookupId
      ? task.value
      : null
  if (fromCurrent) return fromCurrent

  const fromSubtasks = subtasks.value.find((item) => String(item.id) === lookupId)
  if (fromSubtasks) return fromSubtasks

  const fromTasks = taskStore.tasks.find((item) => String(item.id) === lookupId)
  if (fromTasks) return fromTasks

  const fromMyTasks = taskStore.myTasks.find((item) => String(item.id) === lookupId)
  if (fromMyTasks) return fromMyTasks

  return relatedTaskCache.value.get(lookupId) || null
}

const parentTask = computed(() => findTaskById(parentTaskId.value))
const parentTaskLabel = computed(() => {
  if (parentTask.value?.title) return parentTask.value.title
  if (!parentTaskId.value) return t('taskDetail.none')
  return `#${parentTaskId.value}`
})

// Calculate right offset based on AI Chat sidebar visibility
const rightOffset = computed(() => {
  if (aiChatStore.isChatSidebarOpen) {
    return aiChatStore.chatSidebarWidth
  }
  return 0
})

// Calculate sidebar style with proper positioning
const sidebarStyle = computed(() => ({
  width: `${sidebarWidth.value}px`,
  right: `${rightOffset.value}px`,
  top: `${TOPBAR_HEIGHT}px`,
  height: `calc(100vh - ${TOPBAR_HEIGHT}px)`
}))

// Activity data from store
const activityLog = computed(() => taskStore.activityLog)

function getActivityIcon(action) {
  if (action?.includes('created')) return '+'
  if (action?.includes('updated')) return '✏️'
  if (action?.includes('status')) return '📊'
  if (action?.includes('priority')) return '⚡'
  if (action?.includes('assignee')) return '👤'
  return '•'
}

// Resize handlers
function startResize(e) {
  e.preventDefault()
  uiStore.startResizingTaskDetailSidebar()
  startX.value = e.clientX
  startWidth.value = sidebarWidth.value

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e) {
  if (!isResizing.value) return

  const diff = startX.value - e.clientX
  const newWidth = startWidth.value + diff
  uiStore.setTaskDetailSidebarWidth(newWidth)
}

function stopResize() {
  uiStore.stopResizingTaskDetailSidebar()
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Methods
function close() {
  uiStore.closeTaskPanel()
  taskStore.clearCurrentTask()
}

const newSubtaskTitle = ref('')
const isAddingSubtask = ref(false)

async function handleAddSubtask() {
  if (!newSubtaskTitle.value.trim() || !task.value) return
  try {
    await taskStore.addSubtask({
      title: newSubtaskTitle.value.trim()
    })
    newSubtaskTitle.value = ''
    isAddingSubtask.value = false
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleDeleteSubtask(subtaskId) {
  if (!task.value) return
  try {
    await taskStore.deleteSubtaskItem(subtaskId)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function getStatusLabel(status) {
  // Try dynamic options first
  const dynOpt = dynamicStatusOptions.value.find(o => o.value === status)
  if (dynOpt) return dynOpt.value
  // Fallback to hardcoded
  const labels = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.IN_REVIEW]: 'In Review',
    [TaskStatus.DONE]: 'Done',
    [TaskStatus.BLOCKED]: 'Blocked'
  }
  return labels[status] || status
}

function getStatusIcon(status) {
  const icons = {
    [TaskStatus.TODO]: '○',
    [TaskStatus.IN_PROGRESS]: '◐',
    [TaskStatus.IN_REVIEW]: '◑',
    [TaskStatus.DONE]: '✓',
    [TaskStatus.BLOCKED]: '⊘'
  }
  return icons[status] || '○'
}

function getStatusProgress(status) {
  // Try dynamic options first
  const dynOpt = dynamicStatusOptions.value.find(o => o.value === status)
  if (dynOpt) return dynOpt.progress ?? 0
  // Fallback
  const progress = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 50,
    [TaskStatus.IN_REVIEW]: 75,
    [TaskStatus.DONE]: 100,
    [TaskStatus.BLOCKED]: 25
  }
  return progress[status] ?? 0
}

function formatDate(date) {
  if (!date) return t('taskDetail.none')
  try {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  } catch (e) {
    return date
  }
}

function getPriorityLabel(priority) {
  // Try dynamic options first
  const dynOpt = dynamicPriorityOptions.value.find(o => o.value === priority)
  if (dynOpt) return dynOpt.value
  // Fallback
  const labels = {
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High',
    [TaskPriority.URGENT]: 'Urgent'
  }
  return labels[priority] || priority
}

function getPriorityColor(priority) {
  const colors = {
    [TaskPriority.LOW]: 'text-blue-500 bg-blue-50',
    [TaskPriority.MEDIUM]: 'text-gray-500 bg-gray-50',
    [TaskPriority.HIGH]: 'text-orange-500 bg-orange-50',
    [TaskPriority.URGENT]: 'text-red-500 bg-red-50'
  }
  return colors[priority] || 'text-gray-500 bg-gray-50'
}

// Description editing methods
const descriptionWrapperRef = ref(null)
let saveTimeout = null

function isRichTextEmpty(html) {
  const raw = (html ?? '').trim()
  if (!raw) return true

  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    // Consider embedded content as non-empty even if text is empty
    if (doc.querySelector('img, video, iframe, table, hr')) return false
    const text = (doc.body?.textContent || '').replace(/\u00A0/g, ' ').trim()
    return text.length === 0
  } catch {
    // Fallback heuristic if DOMParser isn't available
    const text = raw
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    return text.length === 0
  }
}

function normalizeProseMirrorHtml(html) {
  const raw = String(html || '')
  if (!raw) return ''
  // ProseMirror/Tiptap sometimes stores a trailing break paragraph for cursor behavior.
  // Strip it so pending/view/edit all render consistently.
  return raw
    .replace(/<p><br class="ProseMirror-trailingBreak"\s*\/?><\/p>\s*$/i, '')
    .replace(/<br class="ProseMirror-trailingBreak"\s*\/?>/gi, '')
    .trim()
}

function startEditingDescription() {
  isEditingDescription.value = true
  if (!localDescription.value) {
    localDescription.value = task.value?.description || ''
  }
  // Focus editor after next tick
  setTimeout(() => {
    descriptionEditorRef.value?.focus()
  }, 100)
}

function handleDescriptionUpdate(content) {
  localDescription.value = content
  if (!isEditingDescription.value) return
  if (isAiDescriptionPending.value) return
  // Auto-save with debounce
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveDescription()
  }, 1000)
}

function saveDescription() {
  if (!task.value) return
  const normalized = normalizeProseMirrorHtml(localDescription.value)
  if (normalized !== (task.value.description || '')) {
    localDescription.value = normalized
    taskStore.updateTaskDescription(task.value.id, normalized)
  }
}

function extractAiDraftFromHtml(html) {
  const raw = String(html || '')
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    const block = doc.querySelector('[data-ai-suggestion="true"]')
    return (block?.innerHTML || '').trim()
  } catch {
    return ''
  }
}

function stripAiMarkerFromHtml(html) {
  const raw = String(html || '')
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    for (const el of doc.querySelectorAll('[data-ai-suggestion]')) {
      el.removeAttribute('data-ai-suggestion')
    }
    return (doc.body?.innerHTML || '').trim()
  } catch {
    return raw.trim()
  }
}

function handleAiSuggestion(payload) {
  if (!payload?.html) return
  // Stage suggestion inside the editor (preview), but don't save until accepted.
  const current = (localDescription.value || task.value?.description || '').trim()
  descriptionBeforeAi.value = isRichTextEmpty(current) ? '' : current
  pendingAiDescription.value = String(payload.html).trim()
  aiInjectedIntoEditor.value = true

  const aiBlock = `<div data-ai-suggestion="true">${pendingAiDescription.value}</div>`
  localDescription.value = current ? `${current}${aiBlock}` : aiBlock
  isAiDescriptionPending.value = true
  isDescriptionOpen.value = true
  isEditingDescription.value = true
}

function acceptAiDescription() {
  if (!isAiDescriptionPending.value) return
  // If there was existing content, "Replace" means keep only the AI draft (including any edits inside it).
  if (aiReplaceMode.value) {
    const aiOnly = extractAiDraftFromHtml(localDescription.value) || pendingAiDescription.value
    localDescription.value = normalizeProseMirrorHtml(String(aiOnly || ''))
  } else {
    // Otherwise, accept the draft in-place and keep everything the user edited.
    localDescription.value = normalizeProseMirrorHtml(stripAiMarkerFromHtml(localDescription.value))
  }
  pendingAiDescription.value = ''
  descriptionBeforeAi.value = ''
  aiInjectedIntoEditor.value = false
  isAiDescriptionPending.value = false
  isEditingDescription.value = true
  saveDescription()
}

function declineAiDescription() {
  if (!isAiDescriptionPending.value) return
  if (aiInjectedIntoEditor.value) localDescription.value = descriptionBeforeAi.value
  pendingAiDescription.value = ''
  descriptionBeforeAi.value = ''
  aiInjectedIntoEditor.value = false
  isAiDescriptionPending.value = false
}

function handleClickOutside(event) {
  if (!isEditingDescription.value) return
  if (isAiDescriptionPending.value) return

  const wrapper = descriptionWrapperRef.value
  if (!wrapper) return

  // Check if click is outside the wrapper
  if (!wrapper.contains(event.target)) {
    // Also check for tippy popups (bubble menu dropdowns)
    const tippyPopups = document.querySelectorAll('[data-tippy-root]')
    for (const popup of tippyPopups) {
      if (popup.contains(event.target)) {
        return
      }
    }

    saveDescription()
    isEditingDescription.value = false
  }
}

// Watch for task changes to sync local description
watch(() => task.value?.id, (newId) => {
  if (newId) {
    cacheRelatedTask(task.value)
    localDescription.value = normalizeProseMirrorHtml(task.value?.description || '')
    isEditingDescription.value = false
  }
})

// Keep localDescription in sync with store when not actively editing
watch(() => task.value?.description, (newDescription) => {
  if (!isEditingDescription.value) {
    localDescription.value = normalizeProseMirrorHtml(newDescription || '')
  }
})

// Setup click outside listener
watch(isEditingDescription, (editing) => {
  if (editing) {
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousedown', handleClickOutside)
  if (saveTimeout) clearTimeout(saveTimeout)
})

function notify(message, title = '') {
  uiStore.showInfo(message, title)
}

function toggleSection(section) {
  if (section === 'properties') isPropertiesOpen.value = !isPropertiesOpen.value
  if (section === 'description') isDescriptionOpen.value = !isDescriptionOpen.value
  if (section === 'attachments') isAttachmentsOpen.value = !isAttachmentsOpen.value
  if (section === 'relationships') isRelationshipsOpen.value = !isRelationshipsOpen.value
  if (section === 'subscribers') isSubscribersOpen.value = !isSubscribersOpen.value
  if (section === 'subtasks') isSubtasksOpen.value = !isSubtasksOpen.value
  if (section === 'activity') isActivityOpen.value = !isActivityOpen.value
  if (section === 'comments') isCommentsOpen.value = !isCommentsOpen.value
}

async function handleUpdateAssignee(user) {
  if (!task.value) return
  try {
    const userId = user ? user.id : null
    await taskStore.changeTaskAssignee(task.value.id, userId)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleUpdateStatus(status) {
  if (!task.value) return
  try {
    await taskStore.changeTaskStatus(task.value.id, status)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleUpdatePriority(priority) {
  if (!task.value) return
  try {
    await taskStore.updateTask(task.value.id, { priority })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleUpdateDueDate(val) {
  if (!task.value) return
  try {
    await taskStore.updateTask(task.value.id, { dueDate: val })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleUpdateProject(projectId) {
  if (!task.value) return
  try {
    await taskStore.updateTask(task.value.id, { projectId })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function openRelatedTask(taskId) {
  if (!taskId) return
  try {
    if (task.value?.id) {
      cacheRelatedTask(task.value)
    }
    await taskStore.fetchTask(taskId)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

const newComment = ref('')

async function handleAddComment() {
  if (!newComment.value.trim() || !task.value) return
  try {
    await taskStore.addCommentToTask(newComment.value.trim())
    newComment.value = ''
  } catch (error) {
    uiStore.showApiError(error)
  }
}
</script>

<template>
  <Transition name="slide-left">
    <div
      v-if="isOpen"
      ref="sidebarRef"
      class="task-detail-sidebar fixed bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col"
      :style="sidebarStyle"
      :class="{ 'select-none': isResizing }"
    >
      <!-- Resize Handle -->
      <div
        class="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gray-200 transition-colors z-10"
        @mousedown="startResize"
      ></div>
      
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <DropdownMenu width="10rem">
            <template #trigger>
              <button
                class="flex items-center gap-1 px-1.5 py-0.5 text-xs text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
                type="button"
              >
                <Sparkles class="w-4 h-4" />
                <span>{{ t('taskDetail.taskAI') }}</span>
                <ChevronDown class="w-3 h-3" />
              </button>
            </template>
            <template #content>
              <div class="py-1">
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                  @click="notify('Generate description')"
                >
                  <Sparkles class="w-3.5 h-3.5 text-primary-500" />
                  <span>Generate description</span>
                </button>
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                  @click="notify('Summarize task')"
                >
                  <Sparkles class="w-3.5 h-3.5 text-primary-500" />
                  <span>Summarize task</span>
                </button>
              </div>
            </template>
          </DropdownMenu>
        </div>
        
        <div class="flex items-center gap-1">
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            title="Copy link"
            @click="notify('Link copied')"
          >
            <Link2 class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            title="Attachments"
            @click="notify('Attachment action')"
          >
            <Paperclip class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            title="Expand"
            @click="notify('Expand view')"
          >
            <Maximize2 class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            title="More options"
            @click="notify('More actions')"
          >
            <MoreHorizontal class="w-3.5 h-3.5" />
          </button>
          <button
            @click="close"
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            title="Close"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <!-- Title (Fixed) -->
      <div class="shrink-0 px-6 py-2 bg-white">
        <Skeleton v-if="isLoading" height="24px" />
        <h2
          v-else-if="task"
          class="text-xl font-semibold text-gray-900 truncate"
          :title="task.title"
        >
          {{ task.title }}
        </h2>
      </div>

	      <!-- Content (Scrollable Middle) -->
	      <div class="flex-1 overflow-y-auto task-detail-scroll">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-3 space-y-3">
          <Skeleton height="80px" />
          <Skeleton height="32px" />
        </div>
        
        <!-- Task Content -->
        <div v-else-if="task" class="p-3 space-y-4">
          <!-- Properties Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-2"
              type="button"
              @click="toggleSection('properties')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline
                  points="6 9 12 15 18 9"
                  :class="isPropertiesOpen ? '' : '-rotate-90'"
                  class="origin-center transition-transform"
                ></polyline>
              </svg>
              {{ t('taskDetail.properties') }}
            </button>
            
            <div v-show="isPropertiesOpen" class="grid grid-cols-2 gap-2 text-xs">
              <!-- Status -->
              <div>
                <span class="text-gray-500 text-[11px]">{{ t('taskDetail.status') }}</span>
                <div class="mt-0.5">
                  <DropdownMenu width="12rem">
                    <template #trigger>
                      <div class="flex items-center gap-1.5 px-1 py-0.5 -ml-1 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
                        <TaskProgressIcon 
                          :status="task.status" 
                          :progress="getStatusProgress(task.status)" 
                          size="sm"
                        />
                        <span class="font-medium text-gray-700">{{ getStatusLabel(task.status) }}</span>
                      </div>
                    </template>
                    <template #content>
                      <div class="py-1">
                        <!-- Dynamic status options from project properties -->
                        <template v-if="dynamicStatusOptions.length > 0">
                          <button
                            v-for="opt in dynamicStatusOptions"
                            :key="opt.value"
                            type="button"
                            class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                            :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.status === opt.value }"
                            @click="handleUpdateStatus(opt.value)"
                          >
                            <TaskProgressIcon 
                              :status="opt.value" 
                              :progress="opt.progress ?? 0" 
                              size="sm"
                            />
                            <span class="flex-1 text-left">{{ opt.value }}</span>
                            <i v-if="task.status === opt.value" class="pi pi-check text-[10px]"></i>
                          </button>
                        </template>
                        <!-- Fallback: hardcoded status options -->
                        <template v-else>
                          <button
                            v-for="(label, key) in TaskStatus"
                            :key="key"
                            type="button"
                            class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                            :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.status === label }"
                            @click="handleUpdateStatus(label)"
                          >
                            <TaskProgressIcon 
                              :status="label" 
                              :progress="getStatusProgress(label)" 
                              size="sm"
                            />
                            <span class="flex-1 text-left">{{ getStatusLabel(label) }}</span>
                            <i v-if="task.status === label" class="pi pi-check text-[10px]"></i>
                          </button>
                        </template>
                      </div>
                    </template>
                  </DropdownMenu>
                </div>
              </div>
              
              <!-- Assignees -->
              <div>
                <span class="text-gray-500 text-[11px]">Assignees</span>
                <div class="mt-0.5">
                  <UserSearchDropdown
                    :model-value="task.assignee"
                    @select="handleUpdateAssignee"
                  >
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
                        <div class="flex -space-x-1">
                          <Avatar 
                            v-if="task.assignee"
                            :label="task.assignee.name?.charAt(0)"
                            shape="circle"
                            size="small"
                            class="bg-blue-100 text-blue-700 font-semibold ring-2 ring-white"
                            style="width: 20px; height: 20px; font-size: 10px;"
                          />
                          <div 
                            v-else 
                            class="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-500 group-hover:text-gray-600 transition-colors"
                          >
                            <UserIcon class="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    </template>
                  </UserSearchDropdown>
                </div>
              </div>
              
              <!-- Board -->
              <div>
                <span class="text-gray-500 text-[11px]">Board</span>
                <div class="mt-0.5">
                  <DropdownMenu width="14rem">
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
                        <span class="font-medium text-gray-700">Project / {{ task.projectName || 'Tasks' }}</span>
                        <ChevronDown class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                    <template #content>
                      <div class="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          v-for="project in projectStore.projects"
                          :key="project.id"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                          :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.projectId === project.id }"
                          @click="handleUpdateProject(project.id)"
                        >
                          <span>📁</span>
                          <span class="flex-1 text-left">{{ project.name }}</span>
                          <i v-if="task.projectId === project.id" class="pi pi-check text-[10px]"></i>
                        </button>
                      </div>
                    </template>
                  </DropdownMenu>
                </div>
              </div>

              <!-- Tags -->
              <div>
                <span class="text-gray-500 text-[11px]">{{ t('taskDetail.tags') }}</span>
                <div class="mt-0.5 flex flex-wrap items-center gap-1">
                  <template v-if="task.tags?.length > 0">
                    <span
                      v-for="(tag, index) in task.tags.slice(0, 2)"
                      :key="tag.id"
                      class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                    >
                      {{ tag.name }}
                    </span>
                    <span 
                      v-if="task.tags.length > 2" 
                      class="text-xs text-gray-500"
                    >
                      +{{ task.tags.length - 2 }}
                    </span>
                  </template>
                  <span v-else class="text-gray-400 italic">{{ t('taskDetail.none') }}</span>
                </div>
              </div>

              <!-- Due Date -->
              <div>
                <span class="text-gray-500 text-[11px]">{{ t('taskDetail.dueDate') }}</span>
                <div class="mt-0.5">
                  <VDatePicker
                    :model-value="task.dueDate"
                    :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
                    @update:model-value="handleUpdateDueDate"
                  >
                    <template #default="{ togglePopover }">
                      <div
                        @click="togglePopover"
                        class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group"
                      >
                        <Calendar class="w-3.5 h-3.5 text-gray-400" />
                        <span :class="task.dueDate ? 'text-gray-700 font-medium' : 'text-gray-400'">
                          {{ task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : t('taskDetail.none') }}
                        </span>
                      </div>
                    </template>
                  </VDatePicker>
                </div>
              </div>

              <!-- Time Tracking -->
              <div>
                <span class="text-gray-500 text-[11px]">Time Tracking</span>
                <div class="mt-0.5">
                  <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 text-gray-700">
                    <Clock class="w-3.5 h-3.5 text-gray-400" />
                    <span>0 hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Description Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-2"
              type="button"
              @click="toggleSection('description')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline
                  points="6 9 12 15 18 9"
                  :class="isDescriptionOpen ? '' : '-rotate-90'"
                  class="origin-center transition-transform"
                ></polyline>
              </svg>
              {{ t('taskDetail.description') }}
            </button>

            <div
              v-show="isDescriptionOpen"
              class="description-body"
              :class="{ 'ai-attached': isAiDescriptionPending }"
            >
              <!-- Notion-style Editor for Description -->
              <div
                ref="descriptionWrapperRef"
                class="description-editor-wrapper"
                :class="{ 'cursor-text': !isEditingDescription }"
                @click="!isEditingDescription && startEditingDescription()"
              >
                <NotionEditor
                  ref="descriptionEditorRef"
                  :model-value="localDescription"
                  :placeholder="t('taskDetail.addDescription')"
                  :editable="isEditingDescription"
                  :autofocus="isEditingDescription"
                  min-height="120px"
                  @update:model-value="handleDescriptionUpdate"
                  @ai-suggestion="handleAiSuggestion"
                />
              </div>

              <div
                v-if="isAiDescriptionPending"
                class="mt-0 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 ai-pending-border ai-pending-cta"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <Sparkles class="w-4 h-4 text-primary-600" />
                    <span class="text-xs font-semibold text-primary-800 truncate">AI suggestion ready</span>
                    <span v-if="aiReplaceMode" class="text-xs text-primary-800/70 truncate">Edit the draft in-place, then replace or decline.</span>
                    <span v-else class="text-xs text-primary-800/70 truncate">Edit if needed, then accept or decline.</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      class="h-8 px-2.5 rounded-md border border-primary-200 bg-white text-xs font-semibold text-primary-700 hover:bg-primary-50"
                      @click.stop="declineAiDescription"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      class="h-8 px-2.5 rounded-md bg-primary-600 text-xs font-semibold text-white hover:bg-primary-700"
                      @click.stop="acceptAiDescription"
                    >
                      {{ aiReplaceMode ? 'Replace' : 'Accept' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Attachments Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700"
              type="button"
              @click="toggleSection('attachments')"
            >
              <ChevronRight 
                class="w-3.5 h-3.5 transition-transform" 
                :class="{ 'rotate-90': isAttachmentsOpen }" 
              />
              Attachments
              <span class="ml-0.5 text-[10px] text-gray-400">(0)</span>
            </button>
            
            <div v-show="isAttachmentsOpen" class="mt-2 pl-4">
              <div class="text-xs text-gray-400 italic">
                No attachments yet
              </div>
            </div>
          </div>

          <!-- Relationships Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700"
              type="button"
              @click="toggleSection('relationships')"
            >
              <ChevronRight 
                class="w-3.5 h-3.5 transition-transform" 
                :class="{ 'rotate-90': isRelationshipsOpen }" 
              />
              Relationships
              <span class="ml-0.5 text-[10px] text-gray-400">({{ relationshipCount }})</span>
            </button>
            
            <div v-show="isRelationshipsOpen" class="mt-2 pl-4">
              <div v-if="parentTaskId" class="flex items-center gap-2">
                <div class="flex items-center gap-1.5 text-gray-500 shrink-0 w-[5rem]">
                  <CornerUpLeft class="w-3.5 h-3.5" />
                  <span class="text-xs font-medium">{{ t('taskDetail.parent') }}</span>
                </div>
                
                <button
                  type="button"
                  class="flex-1 min-w-0 flex items-center justify-between gap-3 p-1.5 rounded-md border border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm hover:bg-gray-50 transition-all text-left group"
                  @click="openRelatedTask(parentTaskId)"
                >
                  <span class="text-xs font-medium text-gray-700 truncate min-w-0 flex-1" :title="parentTaskLabel">
                    {{ parentTaskLabel }}
                  </span>
                  
                  <div class="flex items-center gap-2 shrink-0">
                    <!-- Parent Assignee -->
                    <div v-if="parentTask?.assignee" class="flex -space-x-1" :title="parentTask.assignee.name">
                      <Avatar 
                        :label="parentTask.assignee.name?.charAt(0)"
                        shape="circle"
                        size="small"
                        class="bg-blue-100 text-blue-700 font-semibold ring-2 ring-white"
                        style="width: 20px; height: 20px; font-size: 10px;"
                      />
                    </div>
                    
                    <!-- Parent Status -->
                    <TaskProgressIcon 
                      v-if="parentTask?.status"
                      :status="parentTask.status" 
                      :progress="getStatusProgress(parentTask.status)" 
                      size="sm"
                      :title="getStatusLabel(parentTask.status)"
                    />
                  </div>
                </button>
              </div>
              <div v-else class="text-xs text-gray-400 italic">
                No relationships yet
              </div>
            </div>
          </div>

          <!-- Subscribers Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700"
              type="button"
              @click="toggleSection('subscribers')"
            >
              <ChevronRight 
                class="w-3.5 h-3.5 transition-transform" 
                :class="{ 'rotate-90': isSubscribersOpen }" 
              />
              Subscribers
            </button>
            
            <div v-show="isSubscribersOpen" class="mt-2 pl-4">
              <div class="flex items-center gap-2">
                <div class="flex -space-x-1">
                  <Avatar
                    label="H"
                    shape="circle"
                    size="small"
                    class="bg-orange-100 text-orange-700 ring-2 ring-white"
                    style="width: 20px; height: 20px; font-size: 10px;"
                  />
                </div>
                <button 
                  type="button"
                  class="text-[10px] text-gray-500 hover:text-gray-700"
                  @click="notify('Add subscriber')"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
          
          <!-- Subtasks Section -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <button
                class="flex items-center gap-1 text-xs font-medium text-gray-700"
                type="button"
                @click="toggleSection('subtasks')"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline
                    points="6 9 12 15 18 9"
                    :class="isSubtasksOpen ? '' : '-rotate-90'"
                    class="origin-center transition-transform"
                  ></polyline>
                </svg>
                {{ t('taskDetail.subtasks') }}
              </button>
              <div class="flex items-center gap-2">
                <button
                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                  @click="isAddingSubtask = true"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button
                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                  @click="notify('Subtask options')"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div v-show="isSubtasksOpen">
              <!-- Progress Bar -->
              <div class="flex items-center gap-3 mb-3">
                <ProgressBar
                  :value="subtaskProgress"
                  :showValue="false"
                  class="flex-1"
                  style="height: 6px"
                />
                <span class="text-xs text-gray-500">{{ subtaskProgress }}% {{ t('taskDetail.completed') }}</span>
              </div>

              <!-- Subtask Items -->
              <div class="space-y-1">
                <div
                  v-for="subtask in subtasks"
                  :key="subtask.id"
                  class="group flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="subtask.isCompleted"
                    class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    @change="taskStore.toggleSubtaskCompletion(subtask.id)"
                  />
                  <button
                    type="button"
                    class="text-sm flex-1 text-left"
                    :class="subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'"
                    :title="subtask.title"
                    @click="openRelatedTask(subtask.id)"
                  >
                    {{ subtask.title }}
                  </button>
                  <button
                    type="button"
                    class="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    @click.stop="handleDeleteSubtask(subtask.id)"
                  >
                    <Trash class="w-3 h-3" />
                  </button>
                </div>

                <!-- Inline Add Subtask -->
                <div v-if="isAddingSubtask" class="flex items-center gap-3 p-2 border-t border-gray-100">
                  <div class="w-4 h-4 rounded border border-gray-300"></div>
                  <input
                    v-model="newSubtaskTitle"
                    type="text"
                    class="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400"
                    placeholder="Subtask title..."
                    @keyup.enter="handleAddSubtask"
                    @blur="!newSubtaskTitle && (isAddingSubtask = false)"
                    ref="newSubtaskInput"
                    v-focus
                  />
                </div>

                <!-- Add Subtask Button -->
                <button
                  v-else
                  class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors p-2"
                  type="button"
                  @click="isAddingSubtask = true"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {{ t('taskDetail.addSubtask') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Activity Section -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <button
                class="flex items-center gap-1 text-xs font-medium text-gray-700"
                type="button"
                @click="toggleSection('activity')"
              >
                <ChevronRight 
                  class="w-3.5 h-3.5 transition-transform" 
                  :class="{ 'rotate-90': isActivityOpen }" 
                />
                {{ t('taskDetail.activity') }}
              </button>
            </div>

            <!-- Activity Items -->
            <div v-show="isActivityOpen" class="space-y-2 pb-3 pl-4">
              <div
                v-for="activity in activityLog"
                :key="activity.id"
                class="flex items-start gap-2 text-xs"
              >
                <span class="text-gray-400 mt-0.5">{{ getActivityIcon(activity.action) }}</span>
                <div>
                  <span class="text-gray-600 font-medium">{{ activity.user?.name || 'User' }}</span>
                  <span class="text-gray-500"> {{ activity.action }} </span>
                  <div class="text-[10px] text-gray-400 mt-0.5">
                    {{ formatDate(activity.createdAt) }}
                  </div>
                </div>
              </div>
              <div v-if="activityLog.length === 0" class="text-center py-2 text-[10px] text-gray-400 italic">
                No activity yet
              </div>
            </div>
          </div>

          <!-- Comments Section -->
          <div>
            <button
              class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-2"
              type="button"
              @click="toggleSection('comments')"
            >
              <ChevronRight 
                class="w-3.5 h-3.5 transition-transform" 
                :class="{ 'rotate-90': isCommentsOpen }" 
              />
              Comments
              <span class="ml-0.5 text-[10px] text-gray-400">({{ taskStore.comments?.length || 0 }})</span>
            </button>

            <div v-show="isCommentsOpen" class="space-y-3 pl-4">
              <!-- Comment Items -->
              <div
                v-for="comment in taskStore.comments"
                :key="comment.id"
                class="group"
              >
                <div class="flex items-start gap-2">
                  <Avatar
                    :label="comment.user?.name?.charAt(0) || 'U'"
                    shape="circle"
                    size="small"
                    class="bg-blue-100 text-blue-700 font-semibold shrink-0"
                    style="width: 22px; height: 22px; font-size: 10px;"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-medium text-gray-700">{{ comment.user?.name || 'User' }}</span>
                      <span class="text-[10px] text-gray-400">{{ formatDate(comment.createdAt) }}</span>
                      
                      <!-- Comment Actions -->
                      <DropdownMenu width="10rem" class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <template #trigger>
                          <button
                            type="button"
                            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal class="w-3.5 h-3.5" />
                          </button>
                        </template>
                        <template #content>
                          <div class="py-1">
                            <button
                              type="button"
                              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                              @click="notify('Pin to top')"
                            >
                              <Pin class="w-3.5 h-3.5 text-gray-500" />
                              <span>Pin to top</span>
                            </button>
                            <button
                              type="button"
                              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                              @click="notify('Copy link')"
                            >
                              <Copy class="w-3.5 h-3.5 text-gray-500" />
                              <span>Copy comment link</span>
                            </button>
                            <button
                              type="button"
                              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                              @click="notify('Edit comment')"
                            >
                              <Pencil class="w-3.5 h-3.5 text-gray-500" />
                              <span>Edit comment</span>
                            </button>
                            <button
                              type="button"
                              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              @click="notify('Delete comment')"
                            >
                              <Trash class="w-3.5 h-3.5" />
                              <span>Delete comment</span>
                            </button>
                          </div>
                        </template>
                      </DropdownMenu>
                    </div>
                    <p class="text-xs text-gray-600 mt-0.5">{{ comment.content }}</p>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="!taskStore.comments?.length" class="text-center py-2 text-[10px] text-gray-400 italic">
                No comments yet
              </div>

              <!-- Add Comment Input -->
              <div class="flex items-center gap-2 pt-2">
                <Avatar
                  label="H"
                  shape="circle"
                  size="small"
                  class="bg-orange-100 text-orange-700 shrink-0"
                  style="width: 22px; height: 22px; font-size: 10px;"
                />
                <input
                  v-model="newComment"
                  type="text"
                  :placeholder="t('aiChat.addComment')"
                  class="flex-1 text-xs text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  @keyup.enter="handleAddComment"
                />
                <button
                  class="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                  type="button"
                  :disabled="!newComment.trim()"
                  @click="handleAddComment"
                >
                  <Paperclip class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(100%);
}

.resize-handle:hover {
  background-color: #e5e7eb;
}

.resize-handle:active {
  background-color: #e5e7eb;
}

.task-detail-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
  scrollbar-gutter: stable both-edges;
}

.task-detail-scroll::-webkit-scrollbar {
  width: 8px;
}

.task-detail-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.task-detail-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.task-detail-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.65);
}

/* Description editor should look clean (no outer border). */
.description-editor-wrapper :deep(.notion-editor-wrapper) {
  border: 0;
  box-shadow: none;
}

.description-editor-wrapper :deep(.notion-editor-wrapper:hover),
.description-editor-wrapper :deep(.notion-editor-wrapper:focus-within) {
  border: 0;
  box-shadow: none;
}

@keyframes aiBorderPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.18);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
}

.ai-pending-border {
  animation: aiBorderPulse 1.4s ease-in-out infinite;
}

.ai-attached :deep(.notion-editor div[data-ai-suggestion="true"]) {
  margin-bottom: 0;
}

.ai-pending-cta {
  margin-top: 0;
}

.description-editor-wrapper :deep(.notion-editor p:last-child) {
  margin-bottom: 0;
}

.description-editor-wrapper :deep(.notion-editor ul:last-child),
.description-editor-wrapper :deep(.notion-editor ol:last-child) {
  margin-bottom: 0;
}

</style>

