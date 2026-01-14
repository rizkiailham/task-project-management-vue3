<script setup>
/**
 * ProjectView - Project container view with nested routes
 */
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'

const route = useRoute()
const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

// Load project data when route changes
watch(
  () => route.params.projectId,
  async (projectId) => {
    if (projectId) {
      try {
        await projectStore.selectProject(projectId)
      } catch (error) {
        console.error(t('projects.errors.loadFailed'), error)
        uiStore.showApiError(error, t('projects.errors.loadFailed'))
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

