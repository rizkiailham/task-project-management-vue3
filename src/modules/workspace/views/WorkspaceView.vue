<script setup>
/**
 * WorkspaceView - Workspace container with nested routes
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'

const route = useRoute()
const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

// Load workspace data when route changes
watch(
  () => route.params.workspaceId,
  async () => {
    try {
      await projectStore.fetchProjects()
    } catch (error) {
      uiStore.showApiError(error, t('workspace.errors.loadFailed'))
    }
  },
  { immediate: true }
)
watch(
  () => route.params.projectId,
  async (projectId) => {
    if (projectId) {
      try {
        await projectStore.selectProject(projectId)
      } catch (error) {
        uiStore.showApiError(error, t('projects.errors.loadFailed'))
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
