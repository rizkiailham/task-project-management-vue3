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
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import Checkbox from 'primevue/checkbox'
import MyTasksGrid from '@/components/task/MyTasksGrid.vue'

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
const nestedTreeTasks = [
  {
    title: 'A. What is DartAI app uses for frontend?',
    dartboard: 'Product',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'Bridge Team',
    tags: ['Product'],
    dueDate: '2025-12-17',
    children: [
      { title: 'B. Gather current stack', dartboard: 'Product', status: TaskStatus.TODO, assignee: 'Bridge Team', tags: ['Product'], dueDate: '' },
      {
        title: 'C. Draft migration options',
        dartboard: 'Engineering',
        status: TaskStatus.TODO,
        assignee: 'Bridge Team',
        tags: ['Engineering'],
        dueDate: '',
        children: [
          {
            title: 'C1. Compare frameworks',
            dartboard: 'Engineering',
            status: TaskStatus.TODO,
            assignee: 'Bridge Team',
            tags: ['Engineering'],
            dueDate: '',
            children: [
              { title: 'C1.a. Evaluate SSR', dartboard: 'Engineering', status: TaskStatus.BLOCKED, assignee: 'Bridge Team', tags: ['Engineering'], dueDate: '' }
            ]
          }
        ]
      }
    ]
  },
  {
    title: 'D. Create initial Desidia UI library',
    dartboard: 'Design',
    status: TaskStatus.DONE,
    assignee: 'Design Squad',
    tags: ['Design', 'Engineering'],
    dueDate: '2025-12-21',
    children: [
      {
        title: 'E. Buttons',
        dartboard: 'Engineering',
        status: TaskStatus.IN_PROGRESS,
        assignee: 'Design Squad',
        tags: ['Engineering'],
        dueDate: '',
        children: [
          {
            title: 'F. States & interactions',
            dartboard: 'Engineering',
            status: TaskStatus.TODO,
            assignee: 'Design Squad',
            tags: ['Engineering'],
            dueDate: '',
            children: [
              { title: 'G. Accessibility sweep', dartboard: 'Engineering', status: TaskStatus.TODO, assignee: 'Design Squad', tags: ['Engineering'], dueDate: '' }
            ]
          }
        ]
      }
    ]
  }
]

const placeholderTasks = [
  {
    id: 'd1',
    title: 'Audit current Desidia tech stack and hosting setup',
    description: 'Review infra components and dependency licensing.',
    projectName: 'Desidia Platform',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    assignee: 'Demo User',
    tags: ['Engineering'],
    dueDate: '2025-12-21'
  },
  {
    id: 'd2',
    title: 'Define Desidia product vision and target users',
    description: 'Clarify personas and value statements.',
    projectName: 'Product Strategy',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignee: 'Product Team',
    tags: ['Product'],
    dueDate: '2025-12-22'
  },
  {
    id: 'd3',
    title: 'Research DartAI backend architecture and services',
    description: 'Map existing services and performance.',
    projectName: 'Research',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignee: 'Research Crew',
    tags: ['Engineering'],
    dueDate: '2025-12-25'
  },
  {
    id: 'd4',
    title: 'What is DartAI app uses for frontend?',
    description: 'Document front-end stack and choices.',
    projectName: 'Product Strategy',
    status: TaskStatus.TODO,
    priority: TaskPriority.LOW,
    assignee: 'Bridge Team',
    tags: ['Design', 'Product'],
    dueDate: '2025-12-17'
  },
  {
    id: 'd5',
    title: 'Create initial Desidia frontend UI component library',
    description: 'Scaffold shareable component repo.',
    projectName: 'Design System',
    status: TaskStatus.BLOCKED,
    priority: TaskPriority.URGENT,
    assignee: 'Design Squad',
    tags: ['Design', 'Engineering'],
    dueDate: ''
  },
  {
    id: 'd6',
    title: 'Draft Desidia core frontend user journeys',
    description: 'Capture flows on onboarding and inbox.',
    projectName: 'Design System',
    status: TaskStatus.BLOCKED,
    priority: TaskPriority.HIGH,
    assignee: 'Product Team',
    tags: ['Product', 'Design'],
    dueDate: ''
  }
]

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
  const sourceTasks = taskStore.myTasks.length > 0 ? taskStore.myTasks : placeholderTasks
  let tasks = [...sourceTasks]
  
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
    <div v-if="false" class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
    <div v-if="false" class="mb-6 flex flex-wrap items-center gap-3">
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

    <div class="mb-8">
      <MyTasksGrid :tasks="nestedTreeTasks" />
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
