<script setup>
/**
 * MyTasksView - Personal task list view
 * 
 * Shows all tasks assigned to the current user across all projects
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore, useUIStore, useProjectStore } from '@/stores'
import { TaskStatus, TaskPriority, ViewType } from '@/models'

// PrimeVue
import Button from 'primevue/button'
import FormInput from '@/components/ui/FormInput.vue'
import ProjectTasksGrid from '@/components/task/ProjectTasksGrid.vue'

// PrimeVue & Icons
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import KanbanBoard from '@/components/task/KanbanBoard.vue'
import { LayoutGrid, Calendar, CheckCircle, ListFilter, ChevronDown } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import 'v-calendar/dist/style.css'
import { DatePicker } from 'v-calendar'

const router = useRouter()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()

// State
const isLoading = ref(true)
const statusFilter = ref(null)
const priorityFilter = ref(null)
const projectFilter = ref(null)

onMounted(async () => {
  try {
    isLoading.value = true
    await taskStore.fetchMyTasks()
    if (projectStore.projects.length === 0) {
      await projectStore.fetchProjects()
    }
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
})


// Filter options
const statusOptions = [
  { label: 'To Do', value: TaskStatus.TODO, color: 'bg-gray-500' },
  { label: 'In Progress', value: TaskStatus.IN_PROGRESS, color: 'bg-blue-500' },
  { label: 'In Review', value: TaskStatus.IN_REVIEW, color: 'bg-purple-500' },
  { label: 'Done', value: TaskStatus.DONE, color: 'bg-green-500' },
  { label: 'Blocked', value: TaskStatus.BLOCKED, color: 'bg-red-500' }
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
  const sourceTasks = taskStore.myTasks
  let tasks = [...sourceTasks]
  
  if (uiStore.searchQuery) {
    const query = uiStore.searchQuery.toLowerCase()
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  }
  
  // Filter by Status
  if (statusFilter.value) {
    tasks = tasks.filter(t => t.status === statusFilter.value)
  }
  
  // Filter by Priority
  if (priorityFilter.value) {
    tasks = tasks.filter(t => t.priority === priorityFilter.value)
  }
  
  // Filter by Project
  if (projectFilter.value) {
    tasks = tasks.filter(t => t.projectId === projectFilter.value)
  }
  
  // Filter by Due Date
  if (dateRange.value) {
    const filterDate = new Date(dateRange.value)
    filterDate.setHours(0,0,0,0) // Normalize
    
    tasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const taskDate = new Date(t.dueDate)
      taskDate.setHours(0,0,0,0)
      return taskDate.getTime() === filterDate.getTime()
    })
  }
  
  return tasks
})

const treeTasks = computed(() => {
  return filteredTasks.value
})

// Menu Items
const statusMenuItems = computed(() => 
  statusOptions.map(opt => ({
    id: opt.value,
    label: opt.label,
    action: () => {
      statusFilter.value = opt.value
    }
  }))
)

const projectMenuItems = computed(() => {
  if (!projectStore.projects) return []
  return projectStore.projects.map(p => ({
    id: p.id,
    label: p.name,
    action: () => {
      projectFilter.value = p.id
    }
  }))
})

// Pagination State


// Date Filter
const dateRange = ref(null)

// Kanban Data
const kanbanColumns = computed(() => {
  return statusOptions.map(opt => ({
    id: opt.value,
    label: opt.label,
    color: opt.color
  }))
})

const tasksByStatus = computed(() => {
  const grouped = {}
  statusOptions.forEach(opt => {
    grouped[opt.value] = []
  })
  
  // Also handle unassigned or unknown status
  grouped['unassigned'] = []

  filteredTasks.value.forEach(task => {
    const status = task.status || 'unassigned'
    if (grouped[status]) {
      grouped[status].push(task)
    } else {
      // If status matches a kanban column ID directly or mapping needed
      // Assuming task.status matches the value in statusOptions
      grouped[status] = [task]
    }
  })
  
  return grouped
})

// Methods
onMounted(async () => {
  try {
    await taskStore.fetchMyTasks()
  } catch (error) {
    uiStore.showApiError(error, 'Failed to load tasks')
  } finally {
    isLoading.value = false
  }
})

async function navigateToTask(task) {
  try {
    await taskStore.fetchTask(task.id)
    uiStore.openTaskPanel()
  } catch (error) {
    uiStore.showApiError(error, 'Failed to open task details')
  }
}

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

// Grid Event Handlers
async function handleUpdateTaskTitle({ taskId, title }) {
  try {
    await taskStore.updateTask(taskId, { title })
    await taskStore.fetchMyTasks() // Refresh to ensure sync
  } catch (error) {
    uiStore.showApiError(error, 'Failed to update task title')
  }
}

async function handleCreateSubtask({ parentId, projectItemId, kanbanColumnId } = {}) {
  try {
    await taskStore.createNewTask({
      parentId,
      ...(projectItemId ? { projectItemId } : {}),
      ...(kanbanColumnId ? { kanbanColumnId } : {}),
      title: 'New Task'
    })
    await taskStore.fetchMyTasks({ silent: true }) // Refresh without global loader overlay
  } catch (error) {
    uiStore.showApiError(error, 'Failed to create subtask')
  }
}

async function handleUpdateAssignee({ taskId, user }) {
  try {
    const assigneeId = user?.id || null
    await taskStore.changeTaskAssignee(taskId, assigneeId)
    await taskStore.fetchMyTasks()
  } catch (error) {
    uiStore.showApiError(error, 'Failed to update assignee')
  }
}

async function handleUpdateDueDate({ taskId, date }) {
  try {
    await taskStore.updateTask(taskId, { dueDate: date })
    await taskStore.fetchMyTasks()
  } catch (error) {
    uiStore.showApiError(error, 'Failed to update due date')
  }
}

async function handlePageChange(page) {
  try {
    await taskStore.fetchMyTasks({ page })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to change page')
  }
}

async function handlePageSizeChange(limit) {
  try {
    await taskStore.fetchMyTasks({ page: 1, limit })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to change page size')
  }
}
</script>

<template>
  <div class="h-full flex flex-col relative pb-[52px]">
    <!-- Content -->
    <div class="flex-1 overflow-hidden relative">
      <div>
        <!-- List View -->
        <div v-if="uiStore.myTasksViewMode === ViewType.LIST" class="h-full overflow-hidden">
           <ProjectTasksGrid
            :tasks="treeTasks"
           :meta="taskStore.pagination"
            @task-click="navigateToTask"
            @create-subtask="handleCreateSubtask"
            @update-task-title="handleUpdateTaskTitle"
            @change-page="handlePageChange"
            @update:pageSize="handlePageSizeChange"
          >
            <template #footer-filters>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-3">
                  <span class="text-[13px] text-gray-500 text-nowrap">Filter by</span>

                  <!-- Project Filter -->
                  <DropdownMenu :items="projectMenuItems" position="left" width="12rem" :openUp="true">
                     <template #trigger>
                        <button 
                          class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                          :class="{ 'border-blue-300 bg-blue-50 text-blue-700': projectFilter }"
                        >
                          <LayoutGrid class="w-4 h-4" :class="projectFilter ? 'text-blue-600' : 'text-gray-500'" />
                          <span>{{ projectFilter ? (projectStore.projects?.find(p => p.id === projectFilter)?.name || 'Project') : 'Project' }}</span>
                        </button>
                     </template>
                  </DropdownMenu>

                  <!-- Due Date Filter -->
                  <DatePicker v-model="dateRange" mode="date" :popover="{ visibility: 'click' }">
                    <template #default="{ togglePopover }">
                      <button 
                        @click="togglePopover"
                        class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors w-[120px]"
                        :class="{ 'border-blue-300 bg-blue-50 text-blue-700': dateRange }"
                      >
                        <Calendar class="w-4 h-4" :class="dateRange ? 'text-blue-600' : 'text-gray-500'" />
                        <span>{{ dateRange ? new Date(dateRange).toLocaleDateString() : 'Due Date' }}</span>
                      </button>
                    </template>
                  </DatePicker>

                  <!-- Status Filter -->
                   <DropdownMenu :items="statusMenuItems" position="left" width="10rem" :openUp="true">
                     <template #trigger>
                        <button 
                          class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                          :class="{ 'border-blue-300 bg-blue-50 text-blue-700': statusFilter }"
                        >
                          <CheckCircle class="w-4 h-4" :class="statusFilter ? 'text-blue-600' : 'text-gray-500'" />
                          <span>{{ statusFilter ? statusOptions.find(o => o.value === statusFilter)?.label : 'Status' }}</span>
                        </button>
                     </template>
                   </DropdownMenu>

                   <!-- More Filters -->
                   <DropdownMenu :items="[]" position="left" width="10rem" :openUp="true">
                     <template #trigger>
                        <button class="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
                          <ListFilter class="w-4 h-4" />
                        </button>
                     </template>
                   </DropdownMenu>
                </div>
              </div>
            </template>
          </ProjectTasksGrid>
        </div>

        <!-- Board View -->
        <div v-else-if="uiStore.myTasksViewMode === ViewType.KANBAN" class="h-full overflow-hidden px-4 pb-4 pt-2">
           <KanbanBoard
            :columns="kanbanColumns"
            :tasks-by-column="tasksByStatus"
            :is-loading="isLoading"
            :has-loaded-columns="true"
            @open-task="navigateToTask"
          />
        </div>

        <!-- Calendar View -->
        <div v-else-if="uiStore.myTasksViewMode === ViewType.CALENDAR" class="h-full flex items-center justify-center">
             <div class="text-center">
                <i class="pi pi-calendar text-4xl text-gray-300 mb-4 block"></i>
                <h3 class="text-lg font-medium text-gray-900">Calendar View</h3>
                <p class="text-sm text-gray-500">Coming soon</p>
             </div>
        </div>

         <!-- Empty State -->
         <div 
           v-if="filteredTasks.length === 0 && !isLoading" 
           class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
         >
           <div class="pointer-events-auto text-center" v-if="uiStore.searchQuery || statusFilter || priorityFilter">
              <i class="pi pi-search text-4xl text-gray-300 mb-4 block"></i>
              <h3 class="text-lg font-medium text-gray-900">No tasks found</h3>
              <p class="text-sm text-gray-500">Try adjusting your filters</p>
           </div>
           <div class="pointer-events-auto text-center" v-else-if="uiStore.myTasksViewMode === ViewType.LIST">
              <i class="pi pi-inbox text-4xl text-gray-300 mb-4 block"></i>
              <h3 class="text-lg font-medium text-gray-900">No tasks yet</h3>
              <p class="text-sm text-gray-500 mb-4">Create your first task to get started</p>
              <Button 
                 v-if="!uiStore.searchQuery && !statusFilter && !priorityFilter"
                 label="Create Task" 
                 @click="openCreateTaskModal" 
               />
           </div>
         </div>
      </div>
    </div>

    <!-- Fixed Footer Bar -->

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
