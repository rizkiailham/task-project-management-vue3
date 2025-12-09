<script setup>
/**
 * TaskPanel - Slide-over panel for task details
 */
import { computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTaskStore, useUIStore, useWorkspaceStore, useAIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Avatar from 'primevue/avatar'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'

const router = useRouter()
const route = useRoute()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const aiStore = useAIStore()

// Computed
const task = computed(() => taskStore.currentTask)
const subtasks = computed(() => taskStore.subtasks)
const comments = computed(() => taskStore.comments)
const isLoading = computed(() => taskStore.isLoadingTask)

const statusOptions = [
  { label: 'To Do', value: TaskStatus.TODO },
  { label: 'In Progress', value: TaskStatus.IN_PROGRESS },
  { label: 'In Review', value: TaskStatus.IN_REVIEW },
  { label: 'Done', value: TaskStatus.DONE },
  { label: 'Blocked', value: TaskStatus.BLOCKED }
]

const priorityOptions = [
  { label: 'Urgent', value: TaskPriority.URGENT },
  { label: 'High', value: TaskPriority.HIGH },
  { label: 'Medium', value: TaskPriority.MEDIUM },
  { label: 'Low', value: TaskPriority.LOW }
]

// Methods
function closePanel() {
  uiStore.closeTaskPanel()
  taskStore.clearCurrentTask()
}

async function updateStatus(status) {
  if (!task.value) return
  try {
    await taskStore.changeTaskStatus(task.value.id, status)
    uiStore.showSuccess('Status updated')
  } catch (error) {
    uiStore.showError('Failed to update status')
  }
}

async function updatePriority(priority) {
  if (!task.value) return
  try {
    await taskStore.updateTask(task.value.id, { priority })
    uiStore.showSuccess('Priority updated')
  } catch (error) {
    uiStore.showError('Failed to update priority')
  }
}

function getStatusSeverity(status) {
  const severities = {
    [TaskStatus.TODO]: 'secondary',
    [TaskStatus.IN_PROGRESS]: 'info',
    [TaskStatus.IN_REVIEW]: 'warn',
    [TaskStatus.DONE]: 'success',
    [TaskStatus.BLOCKED]: 'danger'
  }
  return severities[status] || 'secondary'
}

function formatDate(date) {
  if (!date) return 'No due date'
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="task-panel fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl dark-edit:border-gray-700 dark-edit:bg-gray-800">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark-edit:border-gray-700">
      <div class="flex items-center gap-2">
        <Button 
          icon="pi pi-times" 
          text 
          rounded 
          size="small"
          @click="closePanel"
        />
        <span class="text-sm text-gray-500 dark-edit:text-gray-400">Task Details</span>
      </div>
      <div class="flex items-center gap-1">
        <Button 
          icon="pi pi-external-link" 
          text 
          rounded 
          size="small"
          v-tooltip="'Open full page'"
          @click="router.push({ name: 'TaskDetail', params: { taskId: task?.id } }); closePanel()"
        />
        <Button 
          icon="pi pi-ellipsis-v" 
          text 
          rounded 
          size="small"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <Skeleton height="32px" />
        <Skeleton height="100px" />
        <Skeleton height="40px" />
        <Skeleton height="40px" />
      </div>

      <!-- Task Content -->
      <div v-else-if="task" class="space-y-6">
        <!-- Title -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark-edit:text-white">
            {{ task.title }}
          </h2>
        </div>

        <!-- Status & Priority -->
        <div class="flex flex-wrap gap-3">
          <Select
            :modelValue="task.status"
            @update:modelValue="updateStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-36"
          />
          <Select
            :modelValue="task.priority"
            @update:modelValue="updatePriority"
            :options="priorityOptions"
            optionLabel="label"
            optionValue="value"
            class="w-32"
          />
        </div>

        <!-- Description -->
        <div>
          <h3 class="mb-2 text-sm font-medium text-gray-700 dark-edit:text-gray-300">Description</h3>
          <div 
            v-if="task.description"
            class="prose prose-sm max-w-none text-gray-600 dark-edit:text-gray-400"
            v-html="task.description"
          />
          <p v-else class="text-sm text-gray-400 italic">No description</p>
        </div>

        <!-- Details -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark-edit:text-gray-400">Assignee</span>
            <div class="flex items-center gap-2">
              <Avatar 
                v-if="task.assignee"
                :label="task.assignee.name?.charAt(0)"
                shape="circle"
                size="small"
                class="bg-primary-100 text-primary-700"
              />
              <span class="text-sm text-gray-900 dark-edit:text-white">
                {{ task.assignee?.name || 'Unassigned' }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark-edit:text-gray-400">Due Date</span>
            <span class="text-sm text-gray-900 dark-edit:text-white">
              {{ formatDate(task.dueDate) }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark-edit:text-gray-400">Project</span>
            <span class="text-sm text-gray-900 dark-edit:text-white">
              {{ task.projectName || 'No project' }}
            </span>
          </div>
        </div>

        <!-- Subtasks -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-700 dark-edit:text-gray-300">
              Subtasks ({{ subtasks.filter(s => s.isCompleted).length }}/{{ subtasks.length }})
            </h3>
            <Button 
              icon="pi pi-plus" 
              text 
              size="small"
              @click="uiStore.openModal('addSubtask')"
            />
          </div>
          
          <ProgressBar 
            v-if="subtasks.length > 0"
            :value="taskStore.subtaskProgress" 
            :showValue="false"
            class="mb-3"
            style="height: 6px"
          />
          
          <div class="space-y-2">
            <div
              v-for="subtask in subtasks"
              :key="subtask.id"
              class="flex items-center gap-2 rounded p-2 hover:bg-gray-50 dark-edit:hover:bg-gray-700/50"
            >
              <input
                type="checkbox"
                :checked="subtask.isCompleted"
                @change="taskStore.toggleSubtaskCompletion(subtask.id)"
                class="h-4 w-4 rounded border-gray-300"
              />
              <span 
                :class="[
                  'flex-1 text-sm',
                  subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 dark-edit:text-gray-300'
                ]"
              >
                {{ subtask.title }}
              </span>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div>
          <h3 class="mb-3 text-sm font-medium text-gray-700 dark-edit:text-gray-300">
            Comments ({{ comments.length }})
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="rounded-lg bg-gray-50 p-3 dark-edit:bg-gray-700/50"
            >
              <div class="mb-1 flex items-center gap-2">
                <Avatar 
                  :label="comment.author?.name?.charAt(0) || '?'"
                  shape="circle"
                  size="small"
                  class="bg-primary-100 text-primary-700"
                />
                <span class="text-sm font-medium text-gray-900 dark-edit:text-white">
                  {{ comment.author?.name || 'Unknown' }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ new Date(comment.createdAt).toLocaleDateString() }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark-edit:text-gray-400">{{ comment.content }}</p>
            </div>
          </div>
          
          <!-- Add Comment -->
          <div class="mt-3">
            <Textarea
              placeholder="Add a comment..."
              rows="2"
              class="w-full"
            />
            <div class="mt-2 flex justify-end">
              <Button label="Comment" size="small" />
            </div>
          </div>
        </div>
      </div>

      <!-- No Task Selected -->
      <div v-else class="flex h-full items-center justify-center">
        <p class="text-gray-500 dark-edit:text-gray-400">No task selected</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-panel {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>

