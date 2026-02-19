<script setup>
/**
 * AppLayout - Main application layout with sidebar and content area
 *
 * Based on DartAI sidebar design reference
 */
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUIStore, useProjectStore, useNotificationStore, useAIChatStore } from '@/stores'

import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import TaskDetailSidebar from '@/components/task/TaskDetailSidebar.vue'
import AIChatSidebar from '@/components/ai/AIChatSidebar.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()
const aiChatStore = useAIChatStore()

// Extract reactive refs from aiChatStore for proper reactivity in computed
const { isChatSidebarOpen, chatSidebarWidth, isResizingChatSidebar } = storeToRefs(aiChatStore)

const isFullPage = computed(() => route.meta?.layout === 'fullpage')

// Pages that have their own custom header (no global topbar)
const pagesWithCustomHeader = ['Users', 'Bulletin']

const showGlobalTopbar = computed(() => {
  return !pagesWithCustomHeader.includes(route.name) && !isFullPage.value
})

const showSidebars = computed(() => !isFullPage.value)

// Computed values for responsive sidebar widths
const taskDetailWidth = computed(() => {
  if (!uiStore.isTaskPanelOpen || !showSidebars.value) return 0
  return uiStore.taskDetailSidebarWidth
})

const aiChatWidth = computed(() => {
  if (!isChatSidebarOpen.value || !showSidebars.value) return 0
  return chatSidebarWidth.value
})

// Total right sidebars width for main content adjustment
const totalRightSidebarsWidth = computed(() => {
  return taskDetailWidth.value + aiChatWidth.value
})

const leftOffset = computed(() => {
  if (uiStore.isMobile) return '0'
  return showSidebars.value ? uiStore.sidebarWidth : '0'
})

// Initialize data on mount
onMounted(async () => {
  try {
    // Fetch notification count
    await notificationStore.fetchUnreadCount()
  } catch (error) {
    // Handle initialization error
    if (error.status === 401) {
      router.push({ name: 'Login' })
    }
  }
})

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
    <Sidebar v-if="showSidebars" />

    <!-- Topbar - Fixed at top, full width (AI Chat overlays on top) -->
    <Topbar
      v-if="showGlobalTopbar"
      class="fixed top-0 z-50"
      :class="uiStore.isResizingSidebar ? 'transition-none' : 'transition-all duration-300'"
      :style="{
        left: leftOffset,
        right: '0'
      }"
    />

    <!-- Main Content Area - Below topbar, between sidebars -->
    <main
      class="fixed overflow-hidden bg-white"
      :class="[
        uiStore.isResizingSidebar ? 'transition-none' : 'transition-all duration-300',
        { 'select-none': uiStore.isResizingSidebar || isResizingChatSidebar || uiStore.isResizingTaskDetailSidebar }
      ]"
      :style="{
        top: showGlobalTopbar ? '56px' : '0',
        left: leftOffset,
        right: `${totalRightSidebarsWidth}px`,
        bottom: '0'
      }"
    >
      <div class="h-full w-full overflow-auto">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <!-- Task Detail Sidebar (positioned to the left of AI Chat) -->
    <TaskDetailSidebar v-if="showSidebars" />

    <!-- AI Chat Sidebar (always on far right) -->
    <AIChatSidebar v-if="showSidebars" :top-offset="showGlobalTopbar ? 56 : 0" />
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
