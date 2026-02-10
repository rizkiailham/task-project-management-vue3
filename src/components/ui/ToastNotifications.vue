<script setup>
/**
 * ToastNotifications - Custom toast notification container
 * 
 * Uses the UI store's toast system for app-wide notifications
 */
import { computed } from 'vue'
import { useUIStore } from '@/stores'

const uiStore = useUIStore()

const visibleToasts = computed(() => 
  uiStore.toasts.filter(t => !t.dismissed)
)

const colorMap = {
  success: 'bg-[#b9fdad] border-[#22c55e] text-gray-900',
  error: 'bg-[#f8dadb] border-[#ef4444] text-gray-900',
  warning: 'bg-[#fef2cc] border-[#eab308] text-gray-900',
  info: 'bg-[#d7e6fc] border-[#3b82f6] text-gray-900'
}

function getColorClasses(type) {
  return colorMap[type] || colorMap.info
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in visibleToasts"
          :key="toast.id"
          :class="[
            'flex items-center gap-3 rounded-lg border-1 p-4 shadow-lg backdrop-blur-sm',
            'min-w-[300px] max-w-[400px]',
            getColorClasses(toast.type)
          ]"
        >
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm opacity-90">{{ toast.message }}</p>
            
            <!-- Action Button -->
            <button
              v-if="toast.action && toast.actionLabel"
              @click="toast.action(); uiStore.dismissToast(toast.id)"
              class="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {{ toast.actionLabel }}
            </button>
          </div>
          
          <!-- Close Button -->
          <button
            @click="uiStore.dismissToast(toast.id)"
            class="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
          >
            <i class="pi pi-times text-sm"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.2s ease-in;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>

