<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: Object
})

const projects = computed(() => props.params.data?.projects || [])

const displayText = computed(() => {
  return projects.value.slice(0, 2).join(', ')
})

const extraCount = computed(() => {
  return Math.max(0, projects.value.length - 2)
})
</script>

<template>
  <div class="flex items-center gap-1 h-full">
    <template v-if="projects.length > 0">
      <span class="text-sm text-gray-700">{{ displayText }}</span>
      <span v-if="extraCount > 0" class="text-sm text-blue-600 font-medium ml-1">
        +{{ extraCount }}
      </span>
    </template>
  </div>
</template>
