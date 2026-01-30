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
import { LayoutGrid, Calendar, CheckCircle, ListFilter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from 'lucide-vue-next'
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
  // Only paginate in List view
  if (uiStore.myTasksViewMode === ViewType.LIST) {
     const start = (currentPage.value - 1) * pageSize.value
     const end = start + pageSize.value
     return filteredTasks.value.slice(start, end)
  }
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
const pageSizeOptions = [10, 20, 50, 100]
const pageSize = ref(10)
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(filteredTasks.value.length / pageSize.value))

const visiblePages = computed(() => {
  const maxVisible = 5
  const total = totalPages.value
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  
  if (end > total) {
    end = total
    start = end - maxVisible + 1
  }
  
  return Array.from({ length: maxVisible }, (_, i) => start + i)
})

const isFirstPage = computed(() => currentPage.value <= 1)
const isLastPage = computed(() => currentPage.value >= totalPages.value)

const showPagination = computed(() => {
  return totalPages.value > 1
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
}

function goToFirst() {
  goToPage(1)
}

function goToLast() {
  goToPage(totalPages.value)
}

function goToPrev() {
  goToPage(currentPage.value - 1)
}

function goToNext() {
  goToPage(currentPage.value + 1)
}

function changePageSize(newSize) {
  pageSize.value = newSize
  currentPage.value = 1
}

// Reset pagination when filters change
watch([() => uiStore.searchQuery, statusFilter, priorityFilter], () => {
  currentPage.value = 1
})

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

async function handleCreateSubtask({ parentId }) {
  try {
    await taskStore.createNewTask({
      parentId,
      title: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM
    })
    await taskStore.fetchMyTasks() // Refresh to show new subtask
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
            @task-click="navigateToTask"
            @update-task-title="handleUpdateTaskTitle"
          />
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
    <div class="fixed bottom-0 left-[288px] right-0 h-[52px] bg-white border-t border-gray-200 px-4 flex items-center justify-between z-[101] transition-[left] duration-300" :style="{ left: uiStore.sidebarWidth }">
      <!-- Left: Filters & Actions -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <span class="text-[13px] text-gray-500">Filter by</span>

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
                class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
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
      
      <!-- Right: Pagination -->
      <div v-if="showPagination" class="footer-pagination">
        <div class="flex items-center gap-1">
          <!-- First Page -->
          <button
            @click="goToFirst"
            :disabled="isFirstPage"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': isFirstPage }"
            title="First page"
          >
            <ChevronsLeft class="w-4 h-4" />
          </button>
          
          <!-- Previous Page -->
          <button
            @click="goToPrev"
            :disabled="isFirstPage"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': isFirstPage }"
            title="Previous page"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <!-- Page Numbers -->
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            class="pagination-btn pagination-page"
            :class="{ 'pagination-page-active': page === currentPage }"
          >
            {{ page }}
          </button>
          
          <!-- Next Page -->
          <button
            @click="goToNext"
            :disabled="isLastPage"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': isLastPage }"
            title="Next page"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
          
          <!-- Last Page -->
          <button
            @click="goToLast"
            :disabled="isLastPage"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': isLastPage }"
            title="Last page"
          >
            <ChevronsRight class="w-4 h-4" />
          </button>
          
          <!-- Page Size Selector -->
          <div class="page-size-selector ml-2">
            <select
              :value="pageSize"
              @change="changePageSize(Number($event.target.value))"
              class="page-size-select"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
            <ChevronDown class="w-3 h-3 text-gray-400 pointer-events-none" />
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
