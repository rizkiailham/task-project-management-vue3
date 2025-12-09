<script setup>
/**
 * WorkspaceView - Workspace container with nested routes
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore, useProjectStore, useUIStore } from '@/stores'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

// Load workspace data when route changes
watch(
  () => route.params.workspaceId,
  async (workspaceId) => {
    if (workspaceId) {
      try {
        await workspaceStore.selectWorkspace(workspaceId)
        await projectStore.fetchProjects()
      } catch (error) {
        uiStore.showError('Failed to load workspace')
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="workspace-view h-full">
    <RouterView />
  </div>
</template>

