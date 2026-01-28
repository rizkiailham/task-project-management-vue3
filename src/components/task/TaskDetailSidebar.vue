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
import { useTaskStore, useUIStore, useAIChatStore, useProjectStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import Avatar from 'primevue/avatar'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'
import NotionEditor from '@/components/editor/NotionEditor.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import { Sparkles, ChevronRight, User as UserIcon } from 'lucide-vue-next'

const { t } = useI18n()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const aiChatStore = useAIChatStore()
const projectStore = useProjectStore()

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
const isSubtasksOpen = ref(true)
const isActivityOpen = ref(true)
const isAiDescriptionPending = ref(false)
const pendingAiDescription = ref('')
const descriptionBeforeAi = ref('')
const aiInjectedIntoEditor = ref(false)
const aiReplaceMode = computed(() => !isRichTextEmpty(descriptionBeforeAi.value))

// Computed
const isOpen = computed(() => uiStore.isTaskPanelOpen)
const task = computed(() => taskStore.currentTask)
const subtasks = computed(() => taskStore.subtasks)
const isLoading = computed(() => taskStore.isLoadingTask)
const subtaskProgress = computed(() => taskStore.subtaskProgress)
const sidebarWidth = computed(() => uiStore.taskDetailSidebarWidth)
const isResizing = computed(() => uiStore.isResizingTaskDetailSidebar)

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
  if (section === 'subtasks') isSubtasksOpen.value = !isSubtasksOpen.value
  if (section === 'activity') isActivityOpen.value = !isActivityOpen.value
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
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
            type="button"
            @click="notify(t('taskDetail.taskAI'))"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>{{ t('taskDetail.taskAI') }}</span>
          </button>
        </div>
        
        <div class="flex items-center gap-1">
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            @click="notify('Link action')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            @click="notify('Attachment action')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
            @click="notify('More actions')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
          <button
            @click="close"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            type="button"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Title (Fixed) -->
      <div class="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <Skeleton v-if="isLoading" height="28px" />
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
        <div v-if="isLoading" class="p-4 space-y-4">
          <Skeleton height="100px" />
          <Skeleton height="40px" />
        </div>
        
        <!-- Task Content -->
        <div v-else-if="task" class="p-4 space-y-6">
          <!-- Properties Section -->
          <div>
            <button
              class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3"
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
            
            <div v-show="isPropertiesOpen" class="grid grid-cols-2 gap-4 text-sm">
              <!-- Status -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.status') }}</span>
                <div class="mt-1">
                  <DropdownMenu width="12rem">
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 dark-edit:hover:bg-gray-800 cursor-pointer transition-colors group">
                        <span class="text-gray-700">{{ getStatusIcon(task.status) }}</span>
                        <span class="font-medium">{{ getStatusLabel(task.status) }}</span>
                        <ChevronRight class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                    <template #content>
                      <div class="py-1">
                        <button
                          v-for="(label, key) in TaskStatus"
                          :key="key"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 transition-colors"
                          :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.status === label }"
                          @click="handleUpdateStatus(label)"
                        >
                          <span>{{ getStatusIcon(label) }}</span>
                          <span class="flex-1 text-left">{{ getStatusLabel(label) }}</span>
                          <i v-if="task.status === label" class="pi pi-check text-[10px]"></i>
                        </button>
                      </div>
                    </template>
                  </DropdownMenu>
                </div>
              </div>
              
              <!-- Assignee -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.assignee') }}</span>
                <div class="mt-1">
                  <UserSearchDropdown
                    :model-value="task.assignee"
                    @select="handleUpdateAssignee"
                  >
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 dark-edit:hover:bg-gray-800 cursor-pointer transition-colors transition-all group">
                        <Avatar 
                          v-if="task.assignee"
                          :label="task.assignee.name?.charAt(0)"
                          shape="circle"
                          size="small"
                          class="bg-blue-100 text-blue-700 font-semibold"
                          style="width: 20px; height: 20px; font-size: 10px;"
                        />
                        <div 
                          v-else 
                          class="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-500 group-hover:text-gray-600 transition-colors"
                        >
                          <UserIcon class="w-2.5 h-2.5" />
                        </div>
                        <span :class="task.assignee ? 'text-gray-700' : 'text-gray-400'">
                          {{ task.assignee?.name || t('taskDetail.unassigned') || 'Unassigned' }}
                        </span>
                        <ChevronRight class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                  </UserSearchDropdown>
                </div>
              </div>
              
              <!-- Priority -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.priority') }}</span>
                <div class="mt-1">
                  <DropdownMenu width="10rem">
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 dark-edit:hover:bg-gray-800 cursor-pointer transition-colors group">
                        <span
                          class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          :class="getPriorityColor(task.priority)"
                        >
                          {{ getPriorityLabel(task.priority) }}
                        </span>
                        <ChevronRight class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                    <template #content>
                      <div class="py-1">
                        <button
                          v-for="(label, key) in TaskPriority"
                          :key="key"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 transition-colors"
                          :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.priority === label }"
                          @click="handleUpdatePriority(label)"
                        >
                          <span
                            class="w-2 h-2 rounded-full"
                            :class="getPriorityColor(label).split(' ')[0].replace('text-', 'bg-')"
                          ></span>
                          <span class="flex-1 text-left">{{ getPriorityLabel(label) }}</span>
                          <i v-if="task.priority === label" class="pi pi-check text-[10px]"></i>
                        </button>
                      </div>
                    </template>
                  </DropdownMenu>
                </div>
              </div>

              <!-- Dartboard -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.dartboard') }}</span>
                <div class="mt-1">
                  <DropdownMenu width="14rem">
                    <template #trigger>
                      <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 dark-edit:hover:bg-gray-800 cursor-pointer transition-colors group">
                        <span>🎯</span>
                        <span class="font-medium text-gray-700">{{ task.projectName || 'Tasks' }}</span>
                        <ChevronRight class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                    <template #content>
                      <div class="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          v-for="project in projectStore.projects"
                          :key="project.id"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 transition-colors"
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
                <span class="text-gray-500">{{ t('taskDetail.tags') }}</span>
                <div class="mt-1 flex flex-wrap gap-1">
                  <template v-if="task.tags?.length > 0">
                    <span
                      v-for="tag in task.tags"
                      :key="tag.id"
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                    >
                      {{ tag.name }}
                    </span>
                  </template>
                  <span v-else class="text-gray-400 italic px-1.5 py-1 -ml-1.5">{{ t('taskDetail.none') }}</span>
                </div>
              </div>

              <!-- Due Date -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.dueDate') }}</span>
                <div class="mt-1">
                  <VDatePicker
                    :model-value="task.dueDate"
                    :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
                    @update:model-value="handleUpdateDueDate"
                  >
                    <template #default="{ togglePopover }">
                      <div
                        @click="togglePopover"
                        class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 dark-edit:hover:bg-gray-800 cursor-pointer transition-colors group"
                      >
                        <i class="pi pi-calendar text-gray-400"></i>
                        <span :class="task.dueDate ? 'text-gray-700 font-medium' : 'text-gray-400'">
                          {{ formatDate(task.dueDate) }}
                        </span>
                        <ChevronRight class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </template>
                  </VDatePicker>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Description Section -->
          <div>
            <button
              class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3"
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
          
          <!-- Subtasks Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <button
                class="flex items-center gap-1 text-sm font-medium text-gray-700"
                type="button"
                @click="toggleSection('subtasks')"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                  <span
                    class="text-sm flex-1"
                    :class="subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'"
                  >
                    {{ subtask.title }}
                  </span>
                  <button
                    type="button"
                    class="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    @click="handleDeleteSubtask(subtask.id)"
                  >
                    <i class="pi pi-trash text-[10px]"></i>
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
            <div class="flex items-center justify-between mb-3">
              <button
                class="flex items-center gap-1 text-sm font-medium text-gray-700"
                type="button"
                @click="toggleSection('activity')"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline
                    points="6 9 12 15 18 9"
                    :class="isActivityOpen ? '' : '-rotate-90'"
                    class="origin-center transition-transform"
                  ></polyline>
                </svg>
                {{ t('taskDetail.activity') }}
              </button>
              <div class="flex items-center gap-1 text-xs text-gray-500">
                {{ t('aiChat.subscribers') }}
                <Avatar
                  label="H"
                  shape="circle"
                  size="small"
                  class="bg-orange-100 text-orange-700"
                  style="width: 20px; height: 20px; font-size: 10px;"
                />
              </div>
            </div>

            <!-- Activity Items -->
            <div v-show="isActivityOpen" class="space-y-3 pb-4">
              <div
                v-for="activity in activityLog"
                :key="activity.id"
                class="flex items-start gap-3 text-sm"
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
              <div v-if="activityLog.length === 0" class="text-center py-4 text-xs text-gray-400 italic">
                No activity yet
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Comment Input (Fixed Bottom) -->
      <div v-if="task" class="shrink-0 p-4 border-t border-gray-200 bg-white">
        <div class="flex items-center gap-3">
          <Avatar
            label="H"
            shape="circle"
            size="small"
            class="bg-orange-100 text-orange-700 min-w-[28px] min-h-[28px]"
            style="width: 28px; height: 28px; font-size: 12px;"
          />
          <input
            v-model="newComment"
            type="text"
            :placeholder="t('aiChat.addComment')"
            class="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent border-none focus:outline-none"
            @keyup.enter="handleAddComment"
          />
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            :disabled="!newComment.trim()"
            @click="handleAddComment"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
          </button>
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
