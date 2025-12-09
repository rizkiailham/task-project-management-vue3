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

const iconMap = {
  success: 'pi pi-check-circle',
  error: 'pi pi-times-circle',
  warning: 'pi pi-exclamation-triangle',
  info: 'pi pi-info-circle'
}

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800 dark-edit:bg-green-900/20 dark-edit:border-green-800 dark-edit:text-green-400',
  error: 'bg-red-50 border-red-200 text-red-800 dark-edit:bg-red-900/20 dark-edit:border-red-800 dark-edit:text-red-400',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark-edit:bg-yellow-900/20 dark-edit:border-yellow-800 dark-edit:text-yellow-400',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark-edit:bg-blue-900/20 dark-edit:border-blue-800 dark-edit:text-blue-400'
}

function getIcon(type) {
  return iconMap[type] || iconMap.info
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
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm',
            'min-w-[300px] max-w-[400px]',
            getColorClasses(toast.type)
          ]"
        >
          <!-- Icon -->
          <i :class="[getIcon(toast.type), 'text-lg mt-0.5']"></i>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p v-if="toast.title" class="font-semibold">{{ toast.title }}</p>
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
            class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
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

