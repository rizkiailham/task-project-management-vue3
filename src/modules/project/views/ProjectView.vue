<script setup>
/**
 * ProjectView - Project container view with nested routes
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useTaskStore, useKanbanColumnStore, useUIStore } from '@/stores'

const route = useRoute()
const { t } = useI18n()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const kanbanColumnStore = useKanbanColumnStore()
const uiStore = useUIStore()

// Load project data when route changes
watch(
  () => route.params.projectId,
  async (projectId) => {
    if (projectId) {
      try {
        taskStore.clearState()
        kanbanColumnStore.clearState()
        await projectStore.selectProject(projectId)
        const results = await Promise.allSettled([
          kanbanColumnStore.fetchColumns(),
          taskStore.fetchTasks()
        ])
        results.forEach((result) => {
          if (result.status === 'rejected') {
            uiStore.showApiError(result.reason)
          }
        })
      } catch (error) {
        console.error(t('projects.errors.loadFailed'), error)
        uiStore.showApiError(error)
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="project-view h-full">
    <RouterView />
  </div>
</template>

