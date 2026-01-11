<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: Object
})

const statusClass = computed(() => {
  const status = props.params.value
  if (status === 'Active') return 'text-green-600'
  if (status === 'Invited') return 'text-blue-600'
  if (status === 'Inactive') return 'text-gray-500'
  return 'text-gray-600'
})
</script>

<template>
  <div class="flex items-center h-full">
    <span class="text-sm" :class="statusClass">
      {{ params.value }}
    </span>
  </div>
</template>
