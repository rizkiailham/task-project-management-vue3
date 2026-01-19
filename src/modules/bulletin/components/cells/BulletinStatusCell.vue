<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: Object
})

const statusLabel = computed(() => (props.params.value ? 'Published' : 'Draft'))
const statusClass = computed(() => (
  props.params.value ? 'text-green-600' : 'text-gray-500'
))
</script>

<template>
  <div class="flex items-center h-full">
    <span class="text-sm" :class="statusClass">{{ statusLabel }}</span>
  </div>
</template>
