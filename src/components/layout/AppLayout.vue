<script setup>
/**
 * AppLayout - Main application layout with sidebar and content area
 *
 * Based on DartAI sidebar design reference
 */
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useWorkspaceStore, useProjectStore, useNotificationStore, useAIChatStore } from '@/stores'

import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import TaskDetailSidebar from '@/components/task/TaskDetailSidebar.vue'
import AIChatSidebar from '@/components/ai/AIChatSidebar.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()
const aiChatStore = useAIChatStore()

// Computed values for responsive sidebar widths
const taskDetailWidth = computed(() => {
  if (!uiStore.isTaskPanelOpen) return 0
  return uiStore.taskDetailSidebarWidth
})

const aiChatWidth = computed(() => {
  if (!aiChatStore.isChatSidebarOpen) return 0
  return aiChatStore.chatSidebarWidth
})

// Total right sidebars width for main content adjustment
const totalRightSidebarsWidth = computed(() => {
  return taskDetailWidth.value + aiChatWidth.value
})

// Initialize data on mount
onMounted(async () => {
  try {
    // Fetch workspaces
    await workspaceStore.fetchWorkspaces()
    
    // If workspace ID in route, select it
    if (route.params.workspaceId) {
      await workspaceStore.selectWorkspace(route.params.workspaceId)
    }
    
    // Fetch notification count
    await notificationStore.fetchUnreadCount()
  } catch (error) {
    // Handle initialization error
    if (error.status === 401) {
      router.push({ name: 'Login' })
    }
  }
})

// Watch for workspace changes in route
watch(
  () => route.params.workspaceId,
  async (newWorkspaceId) => {
    if (newWorkspaceId && newWorkspaceId !== workspaceStore.currentWorkspaceId) {
      await workspaceStore.selectWorkspace(newWorkspaceId)
    }
  }
)

// Watch for project changes in route
watch(
  () => route.params.projectId,
  async (newProjectId) => {
    if (newProjectId && newProjectId !== projectStore.currentProjectId) {
      await projectStore.selectProject(newProjectId)
    }
  }
)
</script>

<template>
  <div class="app-layout h-screen overflow-hidden bg-white">
    <!-- Left Sidebar -->
    <Sidebar />

    <!-- Topbar - Fixed at top, spans from left sidebar to right edge -->
    <Topbar
      class="fixed top-0 z-50 transition-all duration-300"
      :style="{
        left: uiStore.isMobile ? '0' : uiStore.sidebarWidth,
        right: '0'
      }"
    />

    <!-- Main Content Area - Below topbar, between sidebars -->
    <main
      class="fixed overflow-auto bg-white transition-all duration-300"
      :style="{
        top: '56px',
        left: uiStore.isMobile ? '0' : uiStore.sidebarWidth,
        right: `${totalRightSidebarsWidth}px`,
        bottom: '0'
      }"
      :class="{ 'select-none': uiStore.isResizingSidebar || aiChatStore.isResizingChatSidebar || uiStore.isResizingTaskDetailSidebar }"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- Task Detail Sidebar (positioned to the left of AI Chat) -->
    <TaskDetailSidebar />

    <!-- AI Chat Sidebar (always on far right) -->
    <AIChatSidebar />
  </div>
</template>

<style scoped>
.app-layout {
  --sidebar-width: v-bind('uiStore.sidebarWidth');
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

