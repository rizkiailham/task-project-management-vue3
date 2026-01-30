<template>
  <div class="relative flex items-center justify-center w-6 h-6">
    <!-- Completed Check Icon -->
    <div v-if="isCompleted" class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="white" 
        stroke-width="4" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <!-- Pie Chart Icon with Colored Ring & Gap -->
    <div 
      v-else 
      class="relative w-6 h-6 rounded-full flex items-center justify-center border-2"
      :style="{ borderColor: progressColor }"
    >
       <!-- Inner Pie Cell -->
       <div 
         class="w-3.5 h-3.5 rounded-full"
         :style="pieStyle"
       ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'todo' // todo, in_progress, done, etc.
  },
  progress: {
    type: Number,
    default: 0
  }
})

const isCompleted = computed(() => {
  return props.status === 'done' || props.status === 'completed'
})

const progressColor = computed(() => {
  if (isCompleted.value) return '#22c55e' // Green-500
  
  if (props.progress >= 75) return '#f97316' // Orange-500
  if (props.progress >= 50) return '#a855f7' // Purple-500
  if (props.progress > 0) return '#14b8a6' // Teal-500
  
  return '#d1d5db' // Gray-300 for empty
})

const pieStyle = computed(() => {
  if (props.progress <= 0) return {}
  
  return {
    // transform: 'rotate(-90deg)', // Removed to ensure start is at 12 o'clock (conic-gradient default)
    background: `conic-gradient(${progressColor.value} ${props.progress}%, transparent 0)`
  }
})
</script>

<style scoped>
/* 
  If we want exact pie charts:
  We can use `conic-gradient` css on a border-radius: 50% div.
*/
</style>
