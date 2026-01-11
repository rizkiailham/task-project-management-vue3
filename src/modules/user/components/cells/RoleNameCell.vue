<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: Object
})

const isAdmin = computed(() => props.params.data?.isAdmin)
</script>

<template>
  <div class="flex items-center gap-2 h-full">
    <span class="font-medium text-gray-900">{{ params.value }}</span>
    <span 
      v-if="isAdmin" 
      class="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded"
    >
      Admin
    </span>
  </div>
</template>
