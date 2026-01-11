<script setup>
/**
 * ProjectView - Project container view with nested routes
 */
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore, useUIStore } from '@/stores'

const route = useRoute()
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
        console.error('Failed to load project:', error)
        uiStore.showError('Failed to load project')
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

