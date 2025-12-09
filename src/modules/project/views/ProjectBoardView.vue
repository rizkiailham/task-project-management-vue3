<script setup>
/**
 * ProjectBoardView - Kanban board view for project tasks
 */
import { computed, ref } from 'vue'
import { useTaskStore, useProjectStore, useUIStore, useWorkspaceStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Skeleton from 'primevue/skeleton'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()

// State
const draggedTask = ref(null)

// Kanban columns configuration
const columns = [
  { status: TaskStatus.TODO, label: 'To Do', color: 'bg-gray-500' },
  { status: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-500' },
  { status: TaskStatus.IN_REVIEW, label: 'In Review', color: 'bg-yellow-500' },
  { status: TaskStatus.DONE, label: 'Done', color: 'bg-green-500' }
]

// Computed
const tasksByStatus = computed(() => taskStore.tasksByStatus)
const isLoading = computed(() => taskStore.isLoading)

// Methods
function getColumnTasks(status) {
  return tasksByStatus.value[status] || []
}

function onDragStart(event, task) {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

async function onDrop(event, targetStatus) {
  event.preventDefault()
  
  if (!draggedTask.value || draggedTask.value.status === targetStatus) {
    draggedTask.value = null
    return
  }
  
  try {
    await taskStore.changeTaskStatus(draggedTask.value.id, targetStatus)
    uiStore.showSuccess('Task moved')
  } catch (error) {
    uiStore.showError('Failed to move task')
  }
  
  draggedTask.value = null
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

function openCreateTaskModal(status = TaskStatus.TODO) {
  uiStore.openModal('createTask', { defaultStatus: status })
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
  
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task) {
  if (!task.dueDate || task.status === TaskStatus.DONE) return false
  return new Date(task.dueDate) < new Date()
}
</script>

<template>
  <div class="kanban-board h-full overflow-x-auto p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark-edit:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-sm text-gray-500 dark-edit:text-gray-400">
          {{ taskStore.taskCount }} tasks
        </p>
      </div>
      <Button 
        icon="pi pi-plus" 
        label="Add Task" 
        @click="openCreateTaskModal()"
      />
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
        @dragover="onDragOver"
        @drop="onDrop($event, column.status)"
      >
        <!-- Column Header -->
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['h-2 w-2 rounded-full', column.color]"></span>
            <h3 class="font-medium text-gray-700 dark-edit:text-gray-300">{{ column.label }}</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark-edit:bg-gray-700 dark-edit:text-gray-400">
              {{ getColumnTasks(column.status).length }}
            </span>
          </div>
          <Button 
            icon="pi pi-plus" 
            text 
            rounded 
            size="small"
            @click="openCreateTaskModal(column.status)"
          />
        </div>

        <!-- Column Content -->
        <div class="kanban-column-content min-h-[200px] space-y-2 rounded-lg bg-gray-100/50 p-2 dark-edit:bg-gray-800/50">
          <!-- Task Cards -->
          <div
            v-for="task in getColumnTasks(column.status)"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @click="openTaskPanel(task)"
            :class="[
              'kanban-card cursor-pointer rounded-lg border-l-4 bg-white p-3 shadow-sm transition-all hover:shadow-md dark-edit:bg-gray-800',
              getPriorityColor(task.priority)
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
                    'flex items-center gap-1 text-xs',
                    isOverdue(task) ? 'text-red-600' : 'text-gray-500 dark-edit:text-gray-400'
                  ]"
                >
                  <i class="pi pi-calendar text-[10px]"></i>
                  {{ formatDate(task.dueDate) }}
                </span>

                <!-- Subtask Count -->
                <span 
                  v-if="task.subtaskCount > 0"
                  class="flex items-center gap-1 text-xs text-gray-500 dark-edit:text-gray-400"
                >
                  <i class="pi pi-check-square text-[10px]"></i>
                  {{ task.completedSubtaskCount }}/{{ task.subtaskCount }}
                </span>

                <!-- Comment Count -->
                <span 
                  v-if="task.commentCount > 0"
                  class="flex items-center gap-1 text-xs text-gray-500 dark-edit:text-gray-400"
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

          <!-- Empty State -->
          <div 
            v-if="getColumnTasks(column.status).length === 0"
            class="flex h-24 items-center justify-center text-sm text-gray-400"
          >
            No tasks
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-board {
  min-height: calc(100vh - 120px);
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

.kanban-column-content {
  transition: background-color 0.2s ease;
}

.kanban-column-content:has(.kanban-card:hover) {
  background-color: rgba(99, 102, 241, 0.05);
}
</style>

