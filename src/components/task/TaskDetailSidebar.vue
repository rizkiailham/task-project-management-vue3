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
import { useTaskStore, useUIStore, useAIChatStore } from '@/stores'
import { TaskStatus } from '@/models'
import Avatar from 'primevue/avatar'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import NotionEditor from '@/components/editor/NotionEditor.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import TaskDetailProperties from '@/components/task/TaskDetailProperties.vue'
import FilePreviewModal from '@/components/ui/FilePreviewModal.vue'
import FileUploadProgress from '@/components/ui/FileUploadProgress.vue'
import * as taskApi from '@/api/task.api'
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Link2,
  Paperclip,
  MoreHorizontal,
  X,
  Maximize2,
  Pin,
  Copy,
  Pencil,
  Trash,
  CornerUpLeft,
  Eye,
  Download
} from 'lucide-vue-next'

const { t } = useI18n()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const aiChatStore = useAIChatStore()
const confirm = useConfirm()

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
const isDragOver = ref(false)
let dragEnterCount = 0
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

// ================================
// Attachments
// ================================
// TODO: replace dummy data with real task.attachments when backend is ready
const dummyAttachments = [
  { id: '1', name: 'Reference docs draft 20251232.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'application/pdf', size: 245000 },
  { id: '2', name: 'meeting room preview.jpg', url: 'https://picsum.photos/id/237/800/600', type: 'image/jpeg', size: 1200000 },
  { id: '3', name: 'report Call 22-01.docx', url: '#', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 89000 },
  { id: '4', name: 'filename-with-really-long-name-truncated-to-fit-the-sidebar-width.png', url: 'https://picsum.photos/id/1015/1200/800', type: 'image/png', size: 3400000 },
  { id: '5', name: 'discussion-log-22-03-12.txt', url: 'data:text/plain;base64,TG9nIGVudHJ5IDEgLSAyMDI1LTAzLTEyIDA5OjAwCkRpc2N1c3NlZCBwcm9qZWN0IHRpbWVsaW5lIGFuZCBtaWxlc3RvbmVzLgoKTG9nIGVudHJ5IDIgLSAyMDI1LTAzLTEyIDEwOjMwClJldmlld2VkIGRlc2lnbiBtb2NrdXBzIGZvciBkYXNoYm9hcmQgdjIu', type: 'text/plain', size: 12000 }
]
const attachments = computed(() => {
  const real = task.value?.attachments
  return Array.isArray(real) && real.length ? real : dummyAttachments
})
const previewFile = ref(null)
const isPreviewOpen = ref(false)
const uploadingFiles = ref([])
const uploadTimers = new Map()

function getFileIcon(attachment) {
  const name = attachment?.name || attachment?.url || ''
  const match = name.match(/\.(\w+)(?:\?.*)?$/)
  const ext = match ? match[1].toLowerCase() : ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio'
  return 'file'
}

function truncateFilename(name, maxLen = 38) {
  if (!name || name.length <= maxLen) return name || ''
  const dotIdx = name.lastIndexOf('.')
  if (dotIdx <= 0) return name.slice(0, maxLen - 3) + '...'
  const ext = name.slice(dotIdx)
  const base = name.slice(0, dotIdx)
  const available = maxLen - ext.length - 3
  if (available <= 0) return name.slice(0, maxLen - 3) + '...'
  return base.slice(0, available) + '...' + ext
}

function openPreview(attachment) {
  previewFile.value = attachment
  isPreviewOpen.value = true
}

function downloadAttachment(attachment) {
  if (!attachment?.url) return
  const a = document.createElement('a')
  a.href = attachment.url
  a.download = attachment.name || 'download'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function confirmDeleteAttachment(attachment) {
  confirm.require({
    message: t('taskDetail.confirmDeleteAttachment', 'Are you sure you want to delete this attachment?'),
    header: t('common.confirm', 'Confirm'),
    acceptClass: 'p-button-danger',
    accept: () => deleteAttachment(attachment)
  })
}

async function deleteAttachment(attachment) {
  if (!task.value?.id || !attachment?.id) return
  try {
    await taskApi.deleteAttachment(task.value.id, attachment.id)
    // Remove from local task data
    if (task.value.attachments) {
      task.value.attachments = task.value.attachments.filter((a) => a.id !== attachment.id)
    }
  } catch (error) {
    uiStore.showApiError(error)
  }
}

// ================================
// Drag & drop file upload
// ================================
function handleDragEnter(e) {
  e.preventDefault()
  dragEnterCount++
  if (e.dataTransfer?.types?.includes('Files')) {
    isDragOver.value = true
  }
}

function handleDragOver(e) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function handleDragLeave(e) {
  e.preventDefault()
  dragEnterCount--
  if (dragEnterCount <= 0) {
    dragEnterCount = 0
    isDragOver.value = false
  }
}

function handleDrop(e) {
  e.preventDefault()
  dragEnterCount = 0
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (!files.length) return
  handleDroppedFiles(files)
}

function handleDroppedFiles(files) {
  isAttachmentsOpen.value = true

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const id = `upload-${Date.now()}-${i}`
    const entry = { id, name: file.name, size: file.size, progress: 0, status: 'uploading', _file: file }
    uploadingFiles.value.push(entry)
    simulateUpload(entry)
  }
}

// TODO: replace with real upload using httpClient.upload() when backend is ready
function simulateUpload(entry) {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
      uploadTimers.delete(entry.id)
      finishUpload(entry)
    }
    const item = uploadingFiles.value.find((f) => f.id === entry.id)
    if (item) item.progress = Math.min(progress, 100)
  }, 200 + Math.random() * 300)
  uploadTimers.set(entry.id, interval)
}

function finishUpload(entry) {
  const idx = uploadingFiles.value.findIndex((f) => f.id === entry.id)
  if (idx !== -1) {
    uploadingFiles.value[idx].status = 'completed'
    // Move to attachments list after a brief delay
    setTimeout(() => {
      uploadingFiles.value = uploadingFiles.value.filter((f) => f.id !== entry.id)
      const attachment = {
        id: entry.id,
        name: entry.name,
        url: URL.createObjectURL(entry._file),
        type: entry._file.type,
        size: entry._file.size
      }
      if (task.value) {
        task.value.attachments = [...(task.value.attachments || []), attachment]
      }
    }, 600)
  }
}

function cancelUpload(file) {
  const timer = uploadTimers.get(file.id)
  if (timer) {
    clearInterval(timer)
    uploadTimers.delete(file.id)
  }
  uploadingFiles.value = uploadingFiles.value.filter((f) => f.id !== file.id)
}

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

// Status helpers (used by Relationships section for parent task display)
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

function getStatusProgress(status) {
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
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- Resize Handle -->
      <div
        class="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gray-200 transition-colors z-10"
        @mousedown="startResize"
      ></div>

      <!-- Drag & Drop Overlay -->
      <Transition name="fade">
        <div
          v-if="isDragOver"
          class="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 backdrop-blur-sm border-2 border-dashed border-blue-300 rounded-lg m-1 pointer-events-none"
        >
          <div class="flex flex-col items-center gap-3">
            <Paperclip class="w-10 h-10 text-blue-400" />
            <span class="text-sm font-medium text-blue-600">{{ t('taskDetail.dropFilesHere', 'Drop files here to attach.') }}</span>
          </div>
        </div>
      </Transition>

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
            
            <TaskDetailProperties v-show="isPropertiesOpen" :task="task" />
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
            <div class="flex items-center justify-between group/attach">
              <button
                class="flex items-center gap-1 text-xs font-medium text-gray-700"
                type="button"
                @click="toggleSection('attachments')"
              >
                <ChevronRight
                  class="w-3.5 h-3.5 transition-transform"
                  :class="{ 'rotate-90': isAttachmentsOpen }"
                />
                {{ t('taskDetail.attachments', 'Attachments') }}
                <span class="ml-0.5 text-[10px] text-gray-400">({{ attachments.length }})</span>
              </button>

              <DropdownMenu width="12rem" class="opacity-0 group-hover/attach:opacity-100 transition-opacity">
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
                      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                      @click="notify('Add attachment')"
                    >
                      <Paperclip class="w-3.5 h-3.5 text-gray-500" />
                      <span>{{ t('taskDetail.addAttachment', 'Add attachment') }}</span>
                    </button>
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                      @click="notify('Add link as attachment')"
                    >
                      <Link2 class="w-3.5 h-3.5 text-gray-500" />
                      <span>{{ t('taskDetail.addLinkAttachment', 'Add link as attachment') }}</span>
                    </button>
                  </div>
                </template>
              </DropdownMenu>
            </div>

            <div v-show="isAttachmentsOpen" class="mt-2 pl-4">
              <template v-if="attachments.length">
                <div
                  v-for="attachment in attachments"
                  :key="attachment.id"
                  class="group/file flex items-center justify-between gap-2 py-1.5 px-1 -mx-1 min-h-[32px] rounded hover:bg-gray-50 transition-colors"
                >
                  <span class="text-xs text-gray-500 truncate min-w-0" :title="attachment.name">
                    {{ truncateFilename(attachment.name) }}
                  </span>
                  <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity">
                    <button
                      type="button"
                      class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      :title="t('common.preview', 'Preview')"
                      @click="openPreview(attachment)"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      :title="t('common.download', 'Download')"
                      @click="downloadAttachment(attachment)"
                    >
                      <Download class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      class="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      :title="t('common.delete', 'Delete')"
                      @click="confirmDeleteAttachment(attachment)"
                    >
                      <Trash class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </template>
              <div v-else-if="!uploadingFiles.length" class="text-xs text-gray-400 italic">
                {{ t('taskDetail.noAttachments', 'No attachments yet') }}
              </div>

              <!-- Upload progress -->
              <FileUploadProgress
                :files="uploadingFiles"
                @cancel="cancelUpload"
                @retry="simulateUpload"
              />
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

  <!-- File Preview Modal -->
  <FilePreviewModal
    v-model:visible="isPreviewOpen"
    :file="previewFile"
    @download="downloadAttachment"
  />
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

