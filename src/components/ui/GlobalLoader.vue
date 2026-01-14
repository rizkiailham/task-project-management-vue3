<script setup>
/**
 * GlobalLoader - Full-screen loading overlay
 */
import { useUIStore } from '@/stores'

const uiStore = useUIStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="uiStore.globalLoading"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/30 dark-edit:bg-gray-900/80"
      >
        <div class="loader-spinner" aria-label="Loading" role="status"></div>
        <p 
          v-if="uiStore.loadingMessage"
          class="mt-4 text-sm text-gray-600 dark-edit:text-gray-400"
        >
          {{ uiStore.loadingMessage }}
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loader-spinner {
  width: 50px;
  height: 50px;
  border-radius: 9999px;
  border: 4px solid rgba(37, 99, 235, 0.15);
  border-top-color: var(--color-primary-600);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
