<script setup>
/**
 * TaskDetailView - Full page task detail view
 */
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore, useUIStore } from '@/stores'

// PrimeVue
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const uiStore = useUIStore()

const taskId = computed(() => route.params.taskId)
const task = computed(() => taskStore.currentTask)
const isLoading = computed(() => taskStore.isLoadingTask)

onMounted(async () => {
  if (taskId.value) {
    try {
      await taskStore.fetchTask(taskId.value)
    } catch (error) {
      uiStore.showError('Failed to load task')
      router.back()
    }
  }
})

function goBack() {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-center gap-4">
        <Button 
          icon="pi pi-arrow-left" 
          text 
          rounded
          @click="goBack"
        />
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
          Task Details
        </h1>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-4xl p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <Skeleton height="40px" width="60%" />
        <Skeleton height="200px" />
        <Skeleton height="100px" />
      </div>

      <!-- Task Content -->
      <div v-else-if="task" class="space-y-6">
        <div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ task.title }}
          </h1>
          
          <div 
            v-if="task.description"
            class="mt-4 prose prose-sm max-w-none text-gray-600 dark:text-gray-400"
            v-html="task.description"
          />
          <p v-else class="mt-4 text-gray-400 italic">No description provided</p>
        </div>

        <!-- Additional sections would go here -->
        <div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
          <p class="mt-2 text-sm text-gray-500">Activity log coming soon...</p>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="text-center py-12">
        <i class="pi pi-exclamation-circle text-4xl text-gray-400"></i>
        <p class="mt-2 text-gray-500">Task not found</p>
        <Button label="Go Back" text class="mt-4" @click="goBack" />
      </div>
    </div>
  </div>
</template>

