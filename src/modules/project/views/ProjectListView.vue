<script setup>
/**
 * ProjectListView - List view for project tasks
 */
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore } from '@/stores'
import ProjectTasksGrid from '@/components/task/ProjectTasksGrid.vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t } = useI18n()

const tasks = computed(() => taskStore.tasks)
const isLoading = computed(() => taskStore.isLoading)

async function loadData() {
  if (projectStore.currentProjectId) {
    // Clear state before fetching to avoid stale data
    taskStore.clearState()
    await taskStore.fetchTasks()
  }
}

// Watch for item changes
watch(
  () => projectStore.activeProjectItemId,
  (newId, oldId) => {
    if (newId && String(newId) !== String(oldId)) {
      loadData()
    }
  },
  { immediate: true }
)

</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Content -->
    <div class="flex-1 overflow-hidden p-6">
      <div v-if="isLoading" class="space-y-2">
        <Skeleton v-for="i in 5" :key="i" height="50px" />
      </div>
      
      <div v-else class="h-full">
        <ProjectTasksGrid 
          :tasks="tasks" 
          @task-click="handleTaskClick"
        />
      </div>
    </div>
  </div>
</template>

