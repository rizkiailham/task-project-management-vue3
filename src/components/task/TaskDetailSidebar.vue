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
import NotionEditor from '@/components/editor/NotionEditor.vue'

const { t } = useI18n()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const aiChatStore = useAIChatStore()

// Topbar height constant
const TOPBAR_HEIGHT = 56

// Refs
const sidebarRef = ref(null)
const startX = ref(0)
const startWidth = ref(0)
const descriptionEditorRef = ref(null)
const isEditingDescription = ref(false)
const localDescription = ref('')

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

// Dummy activity data for production-ready appearance
const activityItems = ref([
  { id: 'a1', type: 'created', user: 'Hari W', date: 'Monday', icon: '+' },
  { id: 'a2', type: 'updated', user: 'Hari W', date: 'just now', icon: '✏️' }
])

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
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Description editing methods
const descriptionWrapperRef = ref(null)
let saveTimeout = null

function startEditingDescription() {
  localDescription.value = task.value?.description || ''
  isEditingDescription.value = true
  // Focus editor after next tick
  setTimeout(() => {
    descriptionEditorRef.value?.focus()
  }, 100)
}

function handleDescriptionUpdate(content) {
  localDescription.value = content
  // Auto-save with debounce
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveDescription()
  }, 1000)
}

function saveDescription() {
  if (task.value && localDescription.value !== task.value.description) {
    taskStore.updateTaskDescription(task.value.id, localDescription.value)
  }
}

function handleClickOutside(event) {
  if (!isEditingDescription.value) return

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
    localDescription.value = task.value?.description || ''
    isEditingDescription.value = false
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
        class="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-400 transition-colors z-10"
        @mousedown="startResize"
      ></div>
      
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <button class="flex items-center gap-1.5 px-2 py-1 text-sm text-violet-600 bg-violet-50 rounded hover:bg-violet-100 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>{{ t('taskDetail.taskAI') }}</span>
          </button>
        </div>
        
        <div class="flex items-center gap-1">
          <button class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <button class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
          <button
            @click="close"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-4 space-y-4">
          <Skeleton height="32px" />
          <Skeleton height="100px" />
          <Skeleton height="40px" />
        </div>
        
        <!-- Task Content -->
        <div v-else-if="task" class="p-4 space-y-6">
          <!-- Title -->
          <h2 class="text-xl font-semibold text-gray-900">
            {{ task.title }}
          </h2>
          
          <!-- Properties Section -->
          <div>
            <button class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              {{ t('taskDetail.properties') }}
            </button>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <!-- Status -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.status') }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-gray-700">{{ getStatusIcon(task.status) }}</span>
                  <span>{{ getStatusLabel(task.status) }}</span>
                  <svg class="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
              
              <!-- Assignee -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.assignee') }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <Avatar 
                    v-if="task.assignee"
                    :label="task.assignee.name?.charAt(0)"
                    shape="circle"
                    size="small"
                    class="bg-orange-100 text-orange-700"
                    style="width: 20px; height: 20px; font-size: 10px;"
                  />
                  <span>{{ task.assignee?.name || t('taskDetail.none') }}</span>
                </div>
              </div>
              
              <!-- Dartboard -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.dartboard') }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <span>🎯</span>
                  <span>{{ task.projectName || 'Tasks' }}</span>
                </div>
              </div>
              
              <!-- Tags -->
              <div>
                <span class="text-gray-500">{{ t('taskDetail.tags') }}</span>
                <div class="mt-1">
                  <span class="text-gray-400">{{ t('taskDetail.none') }}</span>
                </div>
              </div>
              
              <!-- Due Date -->
              <div class="col-span-2">
                <span class="text-gray-500">{{ t('taskDetail.dueDate') }}</span>
                <div class="mt-1">
                  <span>{{ formatDate(task.dueDate) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Description Section -->
          <div>
            <button class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              {{ t('taskDetail.description') }}
            </button>

            <!-- Notion-style Editor for Description -->
            <div
              v-if="isEditingDescription"
              ref="descriptionWrapperRef"
              class="description-editor-wrapper"
            >
              <NotionEditor
                ref="descriptionEditorRef"
                :model-value="localDescription"
                :placeholder="t('taskDetail.addDescription')"
                :editable="true"
                :autofocus="true"
                min-height="120px"
                max-height="300px"
                @update:model-value="handleDescriptionUpdate"
              />
            </div>

            <!-- Display Mode (click to edit) -->
            <div
              v-else
              @click="startEditingDescription"
              class="description-display cursor-pointer rounded-lg border border-transparent hover:border-gray-200 transition-colors"
            >
              <div
                v-if="task.description"
                class="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg p-3"
                v-html="task.description"
              />
              <div v-else class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <p class="text-sm text-gray-400 italic">{{ t('taskDetail.addDescription') }}</p>
              </div>
            </div>
          </div>
          
          <!-- AI Assist Buttons -->
          <div class="flex justify-end gap-2">
            <button class="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white shadow-sm hover:bg-yellow-500 transition-colors">
              💡
            </button>
            <button class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm hover:bg-green-600 transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
              </svg>
            </button>
          </div>

          <!-- Subtasks Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <button class="flex items-center gap-1 text-sm font-medium text-gray-700">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                {{ t('taskDetail.subtasks') }}
              </button>
              <div class="flex items-center gap-2">
                <button class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
              </div>
            </div>

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
            <div class="space-y-2">
              <div
                v-for="subtask in subtasks"
                :key="subtask.id"
                class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-center gap-2 flex-1">
                  <Avatar
                    v-if="subtask.assignee"
                    :label="subtask.assignee?.name?.charAt(0) || '?'"
                    shape="circle"
                    size="small"
                    class="bg-orange-100 text-orange-700"
                    style="width: 24px; height: 24px; font-size: 11px;"
                  />
                  <span
                    class="text-sm"
                    :class="subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'"
                  >
                    {{ subtask.title }}
                  </span>
                </div>
                <input
                  type="checkbox"
                  :checked="subtask.isCompleted"
                  @change="taskStore.toggleSubtaskCompletion(subtask.id)"
                  class="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
              </div>

              <!-- Add Subtask Button -->
              <button class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors p-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {{ t('taskDetail.addSubtask') }}
              </button>
            </div>
          </div>

          <!-- Activity Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <button class="flex items-center gap-1 text-sm font-medium text-gray-700">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
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
            <div class="space-y-3">
              <div
                v-for="activity in activityItems"
                :key="activity.id"
                class="flex items-start gap-3 text-sm"
              >
                <span class="text-gray-400 mt-0.5">{{ activity.icon }}</span>
                <div>
                  <span class="text-gray-600">
                    {{ activity.type === 'created' ? t('taskDetail.createdAt') : t('taskDetail.lastUpdated') }}
                  </span>
                  <span class="text-gray-500"> {{ activity.date }} {{ t('taskDetail.by') }} </span>
                  <span class="text-gray-700 font-medium">{{ activity.user }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comment Input -->
        <div v-if="task" class="p-4 border-t border-gray-200">
          <div class="flex items-center gap-3">
            <Avatar
              label="H"
              shape="circle"
              size="small"
              class="bg-orange-100 text-orange-700"
              style="width: 28px; height: 28px; font-size: 12px;"
            />
            <input
              type="text"
              :placeholder="t('aiChat.addComment')"
              class="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent border-none focus:outline-none"
            />
            <button class="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
            <button class="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              😊
            </button>
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
  background-color: #8b5cf6;
}

.resize-handle:active {
  background-color: #7c3aed;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
</style>

