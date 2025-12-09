<script setup>
/**
 * GlobalLoader - Full-screen loading overlay
 */
import { useUIStore } from '@/stores'
import ProgressSpinner from 'primevue/progressspinner'

const uiStore = useUIStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="uiStore.globalLoading"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
      >
        <ProgressSpinner 
          style="width: 50px; height: 50px" 
          strokeWidth="4"
          animationDuration=".8s"
        />
        <p 
          v-if="uiStore.loadingMessage"
          class="mt-4 text-sm text-gray-600 dark:text-gray-400"
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
</style>

