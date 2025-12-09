<script setup>
/**
 * MyTasksView - Personal task list view
 * 
 * Shows all tasks assigned to the current user across all projects
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore, useUIStore, useWorkspaceStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import Checkbox from 'primevue/checkbox'

const router = useRouter()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()

// State
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref(null)
const priorityFilter = ref(null)
const selectedTasks = ref([])

// Filter options
const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'To Do', value: TaskStatus.TODO },
  { label: 'In Progress', value: TaskStatus.IN_PROGRESS },
  { label: 'In Review', value: TaskStatus.IN_REVIEW },
  { label: 'Done', value: TaskStatus.DONE },
  { label: 'Blocked', value: TaskStatus.BLOCKED }
]

const priorityOptions = [
  { label: 'All Priority', value: null },
  { label: 'Urgent', value: TaskPriority.URGENT },
  { label: 'High', value: TaskPriority.HIGH },
  { label: 'Medium', value: TaskPriority.MEDIUM },
  { label: 'Low', value: TaskPriority.LOW }
]

// Computed
const filteredTasks = computed(() => {
  let tasks = [...taskStore.myTasks]
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value) {
    tasks = tasks.filter(t => t.status === statusFilter.value)
  }
  
  if (priorityFilter.value) {
    tasks = tasks.filter(t => t.priority === priorityFilter.value)
  }
  
  return tasks
})

const groupedTasks = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const groups = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDueDate: []
  }
  
  filteredTasks.value.forEach(task => {
    if (!task.dueDate) {
      groups.noDueDate.push(task)
      return
    }
    
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate < today && task.status !== TaskStatus.DONE) {
      groups.overdue.push(task)
    } else if (dueDate.getTime() === today.getTime()) {
      groups.today.push(task)
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(task)
    } else if (dueDate < nextWeek) {
      groups.thisWeek.push(task)
    } else {
      groups.later.push(task)
    }
  })
  
  return groups
})

// Methods
onMounted(async () => {
  try {
    await taskStore.fetchMyTasks()
  } catch (error) {
    uiStore.showError('Failed to load tasks')
  } finally {
    isLoading.value = false
  }
})

function navigateToTask(task) {
  router.push({ name: 'TaskDetail', params: { taskId: task.id } })
}

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

async function toggleTaskStatus(task) {
  const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE
  try {
    await taskStore.changeTaskStatus(task.id, newStatus)
  } catch (error) {
    uiStore.showError('Failed to update task')
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

function getPriorityIcon(priority) {
  const icons = {
    [TaskPriority.URGENT]: 'pi pi-exclamation-circle text-red-600',
    [TaskPriority.HIGH]: 'pi pi-arrow-up text-orange-500',
    [TaskPriority.MEDIUM]: 'pi pi-minus text-yellow-500',
    [TaskPriority.LOW]: 'pi pi-arrow-down text-gray-400'
  }
  return icons[priority] || 'pi pi-minus text-gray-400'
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark-edit:text-white">My Tasks</h1>
        <p class="mt-1 text-sm text-gray-600 dark-edit:text-gray-400">
          {{ filteredTasks.length }} tasks assigned to you
        </p>
      </div>
      <Button 
        icon="pi pi-plus" 
        label="New Task" 
        @click="openCreateTaskModal"
      />
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 sm:max-w-xs">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        <InputText
          v-model="searchQuery"
          placeholder="Search tasks..."
          class="w-full pl-10"
        />
      </div>
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Status"
        class="w-40"
      />
      <Select
        v-model="priorityFilter"
        :options="priorityOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Priority"
        class="w-40"
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton v-for="i in 5" :key="i" height="60px" />
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="filteredTasks.length === 0" 
      class="flex flex-col items-center justify-center py-16"
    >
      <i class="pi pi-inbox text-6xl text-gray-300 dark-edit:text-gray-600"></i>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark-edit:text-white">No tasks found</h3>
      <p class="mt-1 text-gray-500 dark-edit:text-gray-400">
        {{ searchQuery || statusFilter || priorityFilter ? 'Try adjusting your filters' : 'Create your first task to get started' }}
      </p>
      <Button 
        v-if="!searchQuery && !statusFilter && !priorityFilter"
        label="Create Task" 
        class="mt-4"
        @click="openCreateTaskModal"
      />
    </div>

    <!-- Task Groups -->
    <div v-else class="space-y-6">
      <!-- Overdue -->
      <div v-if="groupedTasks.overdue.length > 0">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
          <i class="pi pi-exclamation-triangle"></i>
          Overdue ({{ groupedTasks.overdue.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="task in groupedTasks.overdue"
            :key="task.id"
            class="task-row flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3 dark-edit:border-red-900/30 dark-edit:bg-red-900/10"
          >
            <Checkbox 
              :modelValue="task.status === TaskStatus.DONE"
              @update:modelValue="toggleTaskStatus(task)"
              :binary="true"
            />
            <i :class="getPriorityIcon(task.priority)"></i>
            <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToTask(task)">
              <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
              <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
            </div>
            <Tag :value="task.status.replace('_', ' ')" :severity="getStatusSeverity(task.status)" />
            <span class="text-sm text-red-600">{{ formatDate(task.dueDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Today -->
      <div v-if="groupedTasks.today.length > 0">
        <h2 class="mb-3 text-sm font-semibold text-gray-700 dark-edit:text-gray-300">
          Today ({{ groupedTasks.today.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="task in groupedTasks.today"
            :key="task.id"
            class="task-row flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark-edit:border-gray-700 dark-edit:bg-gray-800"
          >
            <Checkbox 
              :modelValue="task.status === TaskStatus.DONE"
              @update:modelValue="toggleTaskStatus(task)"
              :binary="true"
            />
            <i :class="getPriorityIcon(task.priority)"></i>
            <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToTask(task)">
              <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
              <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
            </div>
            <Tag :value="task.status.replace('_', ' ')" :severity="getStatusSeverity(task.status)" />
            <span class="text-sm text-gray-500">Today</span>
          </div>
        </div>
      </div>

      <!-- Tomorrow -->
      <div v-if="groupedTasks.tomorrow.length > 0">
        <h2 class="mb-3 text-sm font-semibold text-gray-700 dark-edit:text-gray-300">
          Tomorrow ({{ groupedTasks.tomorrow.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="task in groupedTasks.tomorrow"
            :key="task.id"
            class="task-row flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark-edit:border-gray-700 dark-edit:bg-gray-800"
          >
            <Checkbox 
              :modelValue="task.status === TaskStatus.DONE"
              @update:modelValue="toggleTaskStatus(task)"
              :binary="true"
            />
            <i :class="getPriorityIcon(task.priority)"></i>
            <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToTask(task)">
              <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
              <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
            </div>
            <Tag :value="task.status.replace('_', ' ')" :severity="getStatusSeverity(task.status)" />
            <span class="text-sm text-gray-500">Tomorrow</span>
          </div>
        </div>
      </div>

      <!-- This Week -->
      <div v-if="groupedTasks.thisWeek.length > 0">
        <h2 class="mb-3 text-sm font-semibold text-gray-700 dark-edit:text-gray-300">
          This Week ({{ groupedTasks.thisWeek.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="task in groupedTasks.thisWeek"
            :key="task.id"
            class="task-row flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark-edit:border-gray-700 dark-edit:bg-gray-800"
          >
            <Checkbox 
              :modelValue="task.status === TaskStatus.DONE"
              @update:modelValue="toggleTaskStatus(task)"
              :binary="true"
            />
            <i :class="getPriorityIcon(task.priority)"></i>
            <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToTask(task)">
              <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
              <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
            </div>
            <Tag :value="task.status.replace('_', ' ')" :severity="getStatusSeverity(task.status)" />
            <span class="text-sm text-gray-500">{{ formatDate(task.dueDate) }}</span>
          </div>
        </div>
      </div>

      <!-- No Due Date -->
      <div v-if="groupedTasks.noDueDate.length > 0">
        <h2 class="mb-3 text-sm font-semibold text-gray-700 dark-edit:text-gray-300">
          No Due Date ({{ groupedTasks.noDueDate.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="task in groupedTasks.noDueDate"
            :key="task.id"
            class="task-row flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark-edit:border-gray-700 dark-edit:bg-gray-800"
          >
            <Checkbox 
              :modelValue="task.status === TaskStatus.DONE"
              @update:modelValue="toggleTaskStatus(task)"
              :binary="true"
            />
            <i :class="getPriorityIcon(task.priority)"></i>
            <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToTask(task)">
              <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
              <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
            </div>
            <Tag :value="task.status.replace('_', ' ')" :severity="getStatusSeverity(task.status)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-row {
  transition: all 0.15s ease;
}

.task-row:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style>

