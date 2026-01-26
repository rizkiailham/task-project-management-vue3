<script setup>
/**
 * ProjectBoardView - Kanban board view for project tasks
 */
import { computed, ref, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore, useWorkspaceStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Avatar from 'primevue/avatar'
import Skeleton from 'primevue/skeleton'
import { VueDraggableNext as Draggable } from 'vue-draggable-next'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const { t, locale } = useI18n()

// State
const draggedTask = ref(null)
const isDragging = ref(false)
const columnTasks = reactive({})

// Kanban columns configuration
const columns = computed(() => ([
  { status: TaskStatus.TODO, label: t('tasks.statusOptions.todo'), color: 'bg-gray-500' },
  { status: TaskStatus.IN_PROGRESS, label: t('tasks.statusOptions.inProgress'), color: 'bg-blue-500' },
  { status: TaskStatus.IN_REVIEW, label: t('tasks.statusOptions.inReview'), color: 'bg-yellow-500' },
  { status: TaskStatus.DONE, label: t('tasks.statusOptions.done'), color: 'bg-green-500' }
]))

// Computed
const tasksByStatus = computed(() => taskStore.tasksByStatus)
const isLoading = computed(() => taskStore.isLoading)
const hasRealTasks = computed(() => taskStore.taskCount > 0)

const demoTasks = computed(() => ([
  {
    id: 'demo-1',
    title: t('projects.boardDemo.tasks.discovery'),
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    commentCount: 0,
    tags: [],
    isDemo: true
  },
  {
    id: 'demo-2',
    title: t('projects.boardDemo.tasks.prototype'),
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: null,
    subtaskCount: 3,
    completedSubtaskCount: 1,
    commentCount: 2,
    tags: [],
    isDemo: true
  },
  {
    id: 'demo-3',
    title: t('projects.boardDemo.tasks.review'),
    status: TaskStatus.IN_REVIEW,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    subtaskCount: 2,
    completedSubtaskCount: 2,
    commentCount: 1,
    tags: [],
    isDemo: true
  },
  {
    id: 'demo-4',
    title: t('projects.boardDemo.tasks.launch'),
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    dueDate: null,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    commentCount: 0,
    tags: [],
    isDemo: true
  }
]))

const demoTasksByStatus = computed(() => {
  const grouped = {
    [TaskStatus.TODO]: [],
    [TaskStatus.IN_PROGRESS]: [],
    [TaskStatus.IN_REVIEW]: [],
    [TaskStatus.DONE]: []
  }

  demoTasks.value.forEach((task) => {
    if (grouped[task.status]) {
      grouped[task.status].push(task)
    }
  })

  return grouped
})

const boardTasksByStatus = computed(() =>
  hasRealTasks.value ? tasksByStatus.value : demoTasksByStatus.value
)
const boardTaskCount = computed(() =>
  hasRealTasks.value ? taskStore.taskCount : demoTasks.value.length
)
const isDragEnabled = computed(() => !isLoading.value)

// Methods
function getColumnTasks(status) {
  return columnTasks[status] || []
}

function ensureColumnTasks(status) {
  if (!columnTasks[status]) {
    columnTasks[status] = []
  }
  return columnTasks[status]
}

function onDragStart(event, task) {
  if (task?.isDemo) return
  draggedTask.value = task
}

function onDragEnd() {
  draggedTask.value = null
}

function resolveNewOrder(tasks, index) {
  if (tasks.length === 0) return 0
  const prev = tasks[index - 1]
  const next = tasks[index]
  if (!prev && next) return next.order - 1
  if (prev && !next) return prev.order + 1
  if (prev && next) {
    const gap = next.order - prev.order
    if (gap > 1) return prev.order + Math.floor(gap / 2)
  }
  return index
}

function openTaskPanel(task) {
  if (task?.isDemo) return
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

function getPriorityColor(priority) {
  const colors = {
    [TaskPriority.URGENT]: 'border-l-red-500',
    [TaskPriority.HIGH]: 'border-l-orange-500',
    [TaskPriority.MEDIUM]: 'border-l-yellow-500',
    [TaskPriority.LOW]: 'border-l-gray-300'
  }
  return colors[priority] || 'border-l-gray-300'
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return t('calendar.today')
  if (d.toDateString() === tomorrow.toDateString()) return t('calendar.tomorrow')

  return d.toLocaleDateString(locale.value || 'en', { month: 'short', day: 'numeric' })
}

function isOverdue(task) {
  if (!task.dueDate || task.status === TaskStatus.DONE) return false
  return new Date(task.dueDate) < new Date()
}

function syncColumnTasks() {
  columns.value.forEach(({ status }) => {
    ensureColumnTasks(status)
  })
  const next = {}
  columns.value.forEach(({ status }) => {
    next[status] = [...(boardTasksByStatus.value[status] || [])]
  })
  Object.keys(columnTasks).forEach((key) => {
    if (!(key in next)) {
      delete columnTasks[key]
    }
  })
  Object.entries(next).forEach(([key, value]) => {
    columnTasks[key] = value
  })
}

function handleDragStart() {
  isDragging.value = true
}

async function handleDragChange(event, targetStatus) {
  if (!isDragEnabled.value) return

  const moved = event?.moved?.element
  const added = event?.added?.element
  const task = added || moved
  if (!task) return
  if (task?.isDemo) return

  const newIndex = event?.added?.newIndex ?? event?.moved?.newIndex
  if (newIndex === undefined || newIndex === null) return

  const targetList = getColumnTasks(targetStatus)
  const listWithoutTask = targetList.filter((item) => item.id !== task.id)
  const clampedIndex = Math.min(Math.max(newIndex, 0), listWithoutTask.length)
  const newOrder = resolveNewOrder(listWithoutTask, clampedIndex)

  try {
    const response = await taskStore.reorderTask(task.id, targetStatus, newOrder)
    uiStore.showApiSuccess(response, t('tasks.messages.moved'))
  } catch (error) {
    uiStore.showApiError(error, t('tasks.errors.move'))
    syncColumnTasks()
  }
}

function handleDragEnd() {
  isDragging.value = false
  onDragEnd()
  syncColumnTasks()
}

columns.value.forEach(({ status }) => {
  ensureColumnTasks(status)
})
syncColumnTasks()

watch([boardTasksByStatus, hasRealTasks], () => {
  if (isDragging.value) return
  syncColumnTasks()
}, { immediate: true })

watch(columns, (next) => {
  next.forEach(({ status }) => {
    ensureColumnTasks(status)
  })
}, { immediate: true })
</script>

<template>
  <div class="kanban-board h-full overflow-x-auto p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900 dark-edit:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-xs text-gray-500 dark-edit:text-gray-400">
          {{ t('projects.tasksCount', { count: boardTaskCount }) }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex gap-4">
      <div v-for="i in 4" :key="i" class="w-72 flex-shrink-0">
        <Skeleton height="40px" class="mb-3" />
        <Skeleton v-for="j in 3" :key="j" height="100px" class="mb-2" />
      </div>
    </div>

    <!-- Kanban Columns -->
      <div v-else class="flex gap-4">
        <div
        v-for="column in columns"
        :key="column.status"
        class="kanban-column w-72 flex-shrink-0"
      >
        <!-- Column Header -->
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['h-2 w-2 rounded-full', column.color]"></span>
            <h3 class="font-medium text-gray-700 dark-edit:text-gray-300">{{ column.label }}</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark-edit:bg-gray-700 dark-edit:text-gray-400">
              {{ ensureColumnTasks(column.status).length }}
            </span>
          </div>
        </div>

        <!-- Column Content -->
        <Draggable
          :list="ensureColumnTasks(column.status)"
          group="kanban-board"
          :disabled="!isDragEnabled"
          class="kanban-column-content min-h-[200px] space-y-2 rounded-lg bg-gray-100/50 p-2 dark-edit:bg-gray-800/50"
          ghost-class="kanban-card--ghost"
          drag-class="kanban-card--dragging"
          @start="handleDragStart"
          @end="handleDragEnd"
          @change="handleDragChange($event, column.status)"
        >
          <div
            v-for="task in ensureColumnTasks(column.status)"
            :key="task.id"
            data-kanban-card="true"
            @dragstart="onDragStart($event, task)"
            @click="openTaskPanel(task)"
            :class="[
              'kanban-card cursor-pointer rounded-lg border-l-4 bg-white p-3 shadow-sm transition-all hover:shadow-md dark-edit:bg-gray-800',
              getPriorityColor(task.priority),
              { 'kanban-card--dragging': draggedTask?.id === task.id }
            ]"
          >
            <!-- Task Title -->
            <h4 class="font-medium text-gray-900 dark-edit:text-white">
              {{ task.title }}
            </h4>

            <!-- Task Meta -->
            <div class="mt-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <!-- Due Date -->
                <span 
                  v-if="task.dueDate"
                  :class="[
                    'flex items-center gap-1 text-[11px]',
                    isOverdue(task) ? 'text-red-600' : 'text-gray-500 dark-edit:text-gray-400'
                  ]"
                >
                  <i class="pi pi-calendar text-[10px]"></i>
                  {{ formatDate(task.dueDate) }}
                </span>

                <!-- Subtask Count -->
                <span 
                  v-if="task.subtaskCount > 0"
                  class="flex items-center gap-1 text-[11px] text-gray-500 dark-edit:text-gray-400"
                >
                  <i class="pi pi-check-square text-[10px]"></i>
                  {{ task.completedSubtaskCount }}/{{ task.subtaskCount }}
                </span>

                <!-- Comment Count -->
                <span 
                  v-if="task.commentCount > 0"
                  class="flex items-center gap-1 text-[11px] text-gray-500 dark-edit:text-gray-400"
                >
                  <i class="pi pi-comment text-[10px]"></i>
                  {{ task.commentCount }}
                </span>
              </div>

              <!-- Assignee -->
              <Avatar 
                v-if="task.assignee"
                :label="task.assignee.name?.charAt(0)"
                shape="circle"
                size="small"
                class="bg-primary-100 text-primary-700 text-xs"
                v-tooltip="task.assignee.name"
              />
            </div>

            <!-- Tags -->
            <div v-if="task.tags?.length > 0" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tag in task.tags.slice(0, 3)"
                :key="tag.id"
                class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                :style="{ backgroundColor: tag.color + '20', color: tag.color }"
              >
                {{ tag.name }}
              </span>
              <span 
                v-if="task.tags.length > 3"
                class="text-[10px] text-gray-400"
              >
                +{{ task.tags.length - 3 }}
              </span>
            </div>
          </div>
        </Draggable>
        <div 
          v-if="ensureColumnTasks(column.status).length === 0"
          class="flex h-24 items-center justify-center text-xs text-gray-400"
        >
          {{ t('tasks.emptyState.title') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-board {
  min-height: calc(100vh - 120px);
  font-size: 0.8125rem;
}

.kanban-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.kanban-card:hover {
  transform: translateY(-2px);
}

.kanban-card[draggable="true"]:active {
  cursor: grabbing;
  opacity: 0.8;
}

.kanban-card--dragging {
  opacity: 0.6;
  box-shadow: none;
  transform: scale(0.98);
}

.kanban-card--ghost {
  opacity: 0.35;
  background: #e5e7eb;
  border-style: dashed;
}

.kanban-column-content {
  transition: background-color 0.2s ease;
}

.kanban-column-content:has(.kanban-card:hover) {
  background-color: rgba(99, 102, 241, 0.05);
}
</style>
