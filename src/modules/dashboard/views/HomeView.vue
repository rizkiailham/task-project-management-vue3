<script setup>
/**
 * HomeView - Dashboard home page
 * 
 * Shows overview of tasks, recent activity, and quick actions
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useTaskStore, useProjectStore, useWorkspaceStore, useUIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Card from 'primevue/card'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'

const router = useRouter()
const authStore = useAuthStore()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()

// State
const isLoading = ref(true)

// Computed
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const todayTasks = computed(() => {
  const today = new Date().toDateString()
  return taskStore.myTasks.filter(task => {
    if (!task.dueDate) return false
    return new Date(task.dueDate).toDateString() === today
  })
})

const overdueTasks = computed(() => taskStore.overdueTasks)

const completedToday = computed(() => {
  const today = new Date().toDateString()
  return taskStore.myTasks.filter(task => {
    if (task.status !== TaskStatus.DONE || !task.completedAt) return false
    return new Date(task.completedAt).toDateString() === today
  }).length
})

const taskStats = computed(() => ({
  total: taskStore.myTasks.length,
  completed: taskStore.myTasks.filter(t => t.status === TaskStatus.DONE).length,
  inProgress: taskStore.myTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
  overdue: overdueTasks.value.length
}))

const completionRate = computed(() => {
  if (taskStats.value.total === 0) return 0
  return Math.round((taskStats.value.completed / taskStats.value.total) * 100)
})

// Methods
onMounted(async () => {
  try {
    await Promise.all([
      taskStore.fetchMyTasks(),
      projectStore.fetchProjects()
    ])
  } catch (error) {
    uiStore.showError('Failed to load dashboard data')
  } finally {
    isLoading.value = false
  }
})

function navigateToTask(task) {
  router.push({ name: 'TaskDetail', params: { taskId: task.id } })
}

function navigateToProject(project) {
  router.push({
    name: 'Project',
    params: {
      workspaceId: workspaceStore.currentWorkspaceId,
      projectId: project.id
    }
  })
}

function openCreateTaskModal() {
  uiStore.openModal('createTask')
}

function getPriorityColor(priority) {
  const colors = {
    [TaskPriority.URGENT]: 'text-red-600',
    [TaskPriority.HIGH]: 'text-orange-500',
    [TaskPriority.MEDIUM]: 'text-yellow-500',
    [TaskPriority.LOW]: 'text-gray-400'
  }
  return colors[priority] || 'text-gray-400'
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark-edit:text-white">
        {{ greeting }}, {{ authStore.userName.split(' ')[0] }}!
      </h1>
      <p class="mt-1 text-gray-600 dark-edit:text-gray-400">
        Here's what's happening with your tasks today.
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total Tasks -->
      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">Total Tasks</p>
              <p v-if="!isLoading" class="text-2xl font-bold text-gray-900 dark-edit:text-white">
                {{ taskStats.total }}
              </p>
              <Skeleton v-else width="60px" height="32px" />
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark-edit:bg-primary-900/20">
              <i class="pi pi-list text-xl text-primary-600 dark-edit:text-primary-400"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- In Progress -->
      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">In Progress</p>
              <p v-if="!isLoading" class="text-2xl font-bold text-gray-900 dark-edit:text-white">
                {{ taskStats.inProgress }}
              </p>
              <Skeleton v-else width="60px" height="32px" />
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark-edit:bg-blue-900/20">
              <i class="pi pi-spin pi-spinner text-xl text-blue-600 dark-edit:text-blue-400"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- Completed -->
      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">Completed</p>
              <p v-if="!isLoading" class="text-2xl font-bold text-gray-900 dark-edit:text-white">
                {{ taskStats.completed }}
              </p>
              <Skeleton v-else width="60px" height="32px" />
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark-edit:bg-green-900/20">
              <i class="pi pi-check text-xl text-green-600 dark-edit:text-green-400"></i>
            </div>
          </div>
        </template>
      </Card>

      <!-- Overdue -->
      <Card class="shadow-sm">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">Overdue</p>
              <p v-if="!isLoading" class="text-2xl font-bold" :class="taskStats.overdue > 0 ? 'text-red-600' : 'text-gray-900 dark-edit:text-white'">
                {{ taskStats.overdue }}
              </p>
              <Skeleton v-else width="60px" height="32px" />
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark-edit:bg-red-900/20">
              <i class="pi pi-exclamation-triangle text-xl text-red-600 dark-edit:text-red-400"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Today's Tasks -->
      <div class="lg:col-span-2">
        <Card class="shadow-sm">
          <template #title>
            <div class="flex items-center justify-between">
              <span>Today's Tasks</span>
              <Button 
                icon="pi pi-plus" 
                label="Add Task" 
                size="small" 
                @click="openCreateTaskModal"
              />
            </div>
          </template>
          <template #content>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" height="60px" />
            </div>
            
            <div v-else-if="todayTasks.length === 0" class="py-8 text-center">
              <i class="pi pi-check-circle text-4xl text-gray-300 dark-edit:text-gray-600"></i>
              <p class="mt-2 text-gray-500 dark-edit:text-gray-400">No tasks due today</p>
              <Button 
                label="Create a task" 
                text 
                size="small" 
                class="mt-2"
                @click="openCreateTaskModal"
              />
            </div>
            
            <div v-else class="space-y-2">
              <div
                v-for="task in todayTasks.slice(0, 5)"
                :key="task.id"
                @click="navigateToTask(task)"
                class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark-edit:border-gray-700 dark-edit:hover:bg-gray-700/50"
              >
                <i :class="['pi pi-flag-fill', getPriorityColor(task.priority)]"></i>
                <div class="flex-1 min-w-0">
                  <p class="truncate font-medium text-gray-900 dark-edit:text-white">{{ task.title }}</p>
                  <p class="text-xs text-gray-500 dark-edit:text-gray-400">{{ task.projectName }}</p>
                </div>
                <span 
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-gray-100 text-gray-700 dark-edit:bg-gray-700 dark-edit:text-gray-300': task.status === TaskStatus.TODO,
                    'bg-blue-100 text-blue-700 dark-edit:bg-blue-900/20 dark-edit:text-blue-400': task.status === TaskStatus.IN_PROGRESS,
                    'bg-green-100 text-green-700 dark-edit:bg-green-900/20 dark-edit:text-green-400': task.status === TaskStatus.DONE
                  }"
                >
                  {{ task.status.replace('_', ' ') }}
                </span>
              </div>
              
              <router-link 
                v-if="todayTasks.length > 5"
                :to="{ name: 'MyTasks' }"
                class="block text-center text-sm text-primary-600 hover:text-primary-500"
              >
                View all {{ todayTasks.length }} tasks →
              </router-link>
            </div>
          </template>
        </Card>
      </div>

      <!-- Progress & Projects -->
      <div class="space-y-6">
        <!-- Progress Card -->
        <Card class="shadow-sm">
          <template #title>Weekly Progress</template>
          <template #content>
            <div class="text-center">
              <div class="text-4xl font-bold text-primary-600">{{ completionRate }}%</div>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">Tasks completed</p>
              <ProgressBar :value="completionRate" class="mt-4" :showValue="false" />
              <p class="mt-2 text-xs text-gray-500 dark-edit:text-gray-400">
                {{ taskStats.completed }} of {{ taskStats.total }} tasks
              </p>
            </div>
          </template>
        </Card>

        <!-- Recent Projects -->
        <Card class="shadow-sm">
          <template #title>Recent Projects</template>
          <template #content>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" height="40px" />
            </div>
            
            <div v-else-if="projectStore.projects.length === 0" class="py-4 text-center">
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">No projects yet</p>
            </div>
            
            <div v-else class="space-y-2">
              <div
                v-for="project in projectStore.projects.slice(0, 4)"
                :key="project.id"
                @click="navigateToProject(project)"
                class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark-edit:hover:bg-gray-700/50"
              >
                <span 
                  class="flex h-8 w-8 items-center justify-center rounded text-sm font-medium text-white"
                  :style="{ backgroundColor: project.color || '#6366f1' }"
                >
                  {{ project.name.charAt(0).toUpperCase() }}
                </span>
                <span class="flex-1 truncate text-sm font-medium text-gray-900 dark-edit:text-white">
                  {{ project.name }}
                </span>
                <i class="pi pi-chevron-right text-xs text-gray-400"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

