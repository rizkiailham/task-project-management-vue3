<script setup>
/**
 * HomeView - Dashboard home page
 * 
 * Shows Priority Tasks and My Tasks with Mock Data
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n' // Keeping for consistency if used elsewhere, else can remove
import { useAuthStore, useTaskStore, useProjectStore, useUIStore } from '@/stores'
import { TaskStatus } from '@/models'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import Skeleton from 'primevue/skeleton'

const router = useRouter()
// const { t } = useI18n() 
const authStore = useAuthStore()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

// State
const isLoading = ref(true)

// Computed
const currentDate = computed(() => {
  // Hardcoded to match image for demo, or keep dynamic? 
  // User said "create dummy data like on image". 
  // Let's keep date dynamic but formatted as requested: "Thursday, January 1st"
  const date = new Date()
  
  // Helper for English ordinal
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }
  const day = getOrdinal(date.getDate())
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  return `${weekday}, ${month} ${day}`
})

// Mock User Name for demo matching image "Jack"
const userName = computed(() => 'Jack') 

// Dummy Data matching the image
const priorityTasks = ref([
  { id: 'p1', title: 'Review and validate tenant', projectName: 'Project Name', status: 'todo', progress: 0 },
  { id: 'p2', title: 'Prepare monthly building report', projectName: 'Ad Astra', status: 'done', progress: 100 },
  { id: 'p3', title: 'Coordinate for unit repair', projectName: 'Not Like Us', status: 'in_progress', progress: 75 },
  { id: 'p4', title: 'Verify service request', projectName: 'Skylar', status: 'in_progress', progress: 25 },
  { id: 'p5', title: 'Follow up previous meeting', projectName: 'Escapism', status: 'in_progress', progress: 50 },
])

const myTasksList = ref([
  { id: 'm1', title: 'Link Related Issues', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm2', title: 'Approve Service Completion', projectName: 'TwinPeaks', status: 'todo', progress: 0 },
  { id: 'm3', title: 'Inspect Repair Work', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm4', title: 'Generate Monthly Report', projectName: 'TwinPeaks', status: 'todo', progress: 0 },
  { id: 'm5', title: 'Follow Up Tenant', projectName: 'TwinPeaks', status: 'todo', progress: 0 },
  { id: 'm6', title: 'Escalate Priority Issue', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm7', title: 'Archive Completed Tasks', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm8', title: 'Validate Safety Compliance', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm9', title: 'Prepare Meeting Agenda', projectName: 'Ad Astra', status: 'todo', progress: 0 },
  { id: 'm10', title: 'Analyze Complaint Trends', projectName: 'Ad Astra', status: 'todo', progress: 0 },
])


// Methods
onMounted(async () => {
  // Simulate loading
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})

function navigateToTask(task) {
  // For dummy data, just log or simple push
  console.log('Navigate to', task)
}

function getTaskProgress(task) {
  return task.progress
}
</script>

<template>
  <div class="min-h-full bg-white p-8">
    <!-- Header -->
    <div class="mb-12 text-center">
      <p class="text-sm font-medium text-gray-500 mb-2">{{ currentDate }}</p>
      <h1 class="text-4xl font-semibold text-gray-800 tracking-tight">
        Good Morning, {{ userName }}
      </h1>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 max-w-7xl mx-auto h-[600px]">
      
      <!-- Left Column: Priority Task -->
      <div class="flex flex-col h-full">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Priority Task</h2>
        
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div v-if="isLoading" class="p-4 space-y-4">
            <Skeleton v-for="i in 5" :key="i" height="50px" class="rounded-none" />
          </div>
          <div v-else class="overflow-y-auto custom-scrollbar flex-1">
             <!-- Using divide-y for separation lines as seen in image -->
            <div class="divide-y divide-gray-100">
              <div 
                v-for="task in priorityTasks" 
                :key="task.id"
                @click="navigateToTask(task)"
                class="group flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                :class="{ 'bg-blue-50/50': task.id === 'p2' }" 
              >
                <!-- Added blue bg for the active/selected looking item in example 'Prepare monthly...' -->
                
                <span class="text-sm font-medium text-gray-700 truncate mr-4 flex-1">
                  {{ task.title }}
                </span>
                <div class="flex items-center gap-6 flex-shrink-0">
                  <span class="text-xs text-gray-500 font-medium text-right truncate w-24">
                    {{ task.projectName }}
                  </span>
                  <TaskProgressIcon 
                    :status="task.status" 
                    :progress="task.progress" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: My Task -->
      <div class="flex flex-col h-full">
        <h2 class="text-lg font-bold text-gray-800 mb-4">My Task</h2>

        <div class="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div v-if="isLoading" class="p-4 space-y-4">
            <Skeleton v-for="i in 5" :key="i" height="50px" class="rounded-none" />
          </div>
           <!-- Added custom-scrollbar class for styling if needed, or rely on browser default -->
          <div v-else class="overflow-y-auto custom-scrollbar flex-1">
            <div class="divide-y divide-gray-100">
              <div 
                v-for="task in myTasksList" 
                :key="task.id"
                @click="navigateToTask(task)"
                class="group flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span class="text-sm font-medium text-gray-700 truncate mr-4 flex-1">
                  {{ task.title }}
                </span>
                <div class="flex items-center gap-6 flex-shrink-0">
                   <span class="text-xs text-gray-500 font-medium text-right truncate w-24">
                    {{ task.projectName }}
                  </span>
                  <TaskProgressIcon 
                    :status="task.status" 
                    :progress="task.progress" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Optional: Custom scrollbar styling to match clean UI */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
