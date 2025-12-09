<script setup>
/**
 * AppLayout - Main application layout with sidebar and content area
 * 
 * Based on DartAI sidebar design reference
 */
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore, useWorkspaceStore, useProjectStore, useNotificationStore } from '@/stores'

import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import TaskPanel from '@/modules/task/components/TaskPanel.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()

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
  <div class="app-layout flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <Sidebar />
    
    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="uiStore.isSidebarMobileOpen && uiStore.isMobile"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="uiStore.closeMobileSidebar"
    />
    
    <!-- Main Content Area -->
    <div 
      class="flex flex-1 flex-col overflow-hidden transition-all duration-300"
      :style="{ marginLeft: uiStore.isMobile ? '0' : uiStore.sidebarWidth }"
    >
      <!-- Top Bar -->
      <Topbar />
      
      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
    
    <!-- Task Detail Panel (Slide-over) -->
    <Transition name="slide-right">
      <TaskPanel v-if="uiStore.isTaskPanelOpen" />
    </Transition>
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

/* Slide right transition for task panel */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

