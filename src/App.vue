<script setup>
/**
 * Desidia v2 - Root App Component
 */
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore, useAuthStore } from '@/stores'

// PrimeVue components
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

// Layout components
import ToastNotifications from '@/components/ui/ToastNotifications.vue'
import GlobalLoader from '@/components/ui/GlobalLoader.vue'
import CommandPalette from '@/components/ui/CommandPalette.vue'

// Modal components
import CreateTaskModal from '@/components/modals/CreateTaskModal.vue'
import CreateProjectModal from '@/components/modals/CreateProjectModal.vue'

const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()

// Determine layout based on route meta
const isAuthLayout = computed(() => route.meta?.layout === 'auth')

// Initialize app
onMounted(async () => {
  // Initialize auth
  await authStore.initialize()

  // Set up keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

// Global keyboard shortcuts
function handleKeyboardShortcuts(event) {
  // Cmd/Ctrl + K - Open search
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    uiStore.openSearch()
  }

  // Escape - Close modals/panels
  if (event.key === 'Escape') {
    if (uiStore.isSearchOpen) {
      uiStore.closeSearch()
    } else if (uiStore.hasActiveModal) {
      uiStore.closeModal()
    } else if (uiStore.isTaskPanelOpen) {
      uiStore.closeTaskPanel()
    }
  }
}
</script>

<template>
  <div
    id="app-container"
    class="min-h-screen bg-gray-50"
    :class="{ 'dark': uiStore.isDarkMode }"
  >
    <!-- Main Router View -->
    <RouterView />

    <!-- Global Components -->
    <Toast position="top-right" />
    <ConfirmDialog />
    <ToastNotifications />
    <GlobalLoader />
    <CommandPalette />

    <!-- Global Modals -->
    <CreateTaskModal />
    <CreateProjectModal />
  </div>
</template>

<style scoped>
#app-container {
  font-family: var(--font-sans);
}
</style>
