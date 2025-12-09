<script setup>
/**
 * ProjectCalendarView - Calendar view for project tasks
 */
import { ref, computed, onMounted } from 'vue'
import { useTaskStore, useProjectStore, useUIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Button from 'primevue/button'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

// State
const currentDate = ref(new Date())
const viewMode = ref('month') // 'month' | 'week'

// Computed
const currentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  
  // Add days from previous month
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({ date, isCurrentMonth: false })
  }
  
  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    days.push({ date, isCurrentMonth: true })
  }
  
  // Add days from next month
  const endPadding = 42 - days.length // 6 rows * 7 days
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i)
    days.push({ date, isCurrentMonth: false })
  }
  
  return days
})

const tasksByDate = computed(() => {
  const map = {}
  taskStore.tasks.forEach(task => {
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toDateString()
      if (!map[dateKey]) {
        map[dateKey] = []
      }
      map[dateKey].push(task)
    }
  })
  return map
})

// Methods
function previousMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

function nextMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

function goToToday() {
  currentDate.value = new Date()
}

function getTasksForDate(date) {
  return tasksByDate.value[date.toDateString()] || []
}

function isToday(date) {
  return date.toDateString() === new Date().toDateString()
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

function getPriorityColor(priority) {
  const colors = {
    [TaskPriority.URGENT]: 'bg-red-500',
    [TaskPriority.HIGH]: 'bg-orange-500',
    [TaskPriority.MEDIUM]: 'bg-yellow-500',
    [TaskPriority.LOW]: 'bg-gray-400'
  }
  return colors[priority] || 'bg-gray-400'
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Calendar View</p>
      </div>
      <Button 
        icon="pi pi-plus" 
        label="Add Task" 
        @click="uiStore.openModal('createTask')"
      />
    </div>

    <!-- Calendar Navigation -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-chevron-left" text rounded @click="previousMonth" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
          {{ currentMonth }}
        </h2>
        <Button icon="pi pi-chevron-right" text rounded @click="nextMonth" />
      </div>
      <Button label="Today" text @click="goToToday" />
    </div>

    <!-- Calendar Grid -->
    <div class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <!-- Day Headers -->
      <div class="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        <div 
          v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="day"
          class="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Days -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="[
            'min-h-[100px] border-b border-r border-gray-100 p-1 dark:border-gray-700',
            !day.isCurrentMonth && 'bg-gray-50 dark:bg-gray-800/50',
            isToday(day.date) && 'bg-primary-50 dark:bg-primary-900/10'
          ]"
        >
          <!-- Date Number -->
          <div 
            :class="[
              'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm',
              isToday(day.date) 
                ? 'bg-primary-600 text-white' 
                : day.isCurrentMonth 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-400'
            ]"
          >
            {{ day.date.getDate() }}
          </div>

          <!-- Tasks -->
          <div class="space-y-1">
            <div
              v-for="task in getTasksForDate(day.date).slice(0, 3)"
              :key="task.id"
              @click="openTaskPanel(task)"
              :class="[
                'cursor-pointer truncate rounded px-1 py-0.5 text-xs text-white',
                getPriorityColor(task.priority),
                task.status === TaskStatus.DONE && 'opacity-50 line-through'
              ]"
            >
              {{ task.title }}
            </div>
            <div 
              v-if="getTasksForDate(day.date).length > 3"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              +{{ getTasksForDate(day.date).length - 3 }} more
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

