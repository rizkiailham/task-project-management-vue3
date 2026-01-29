<script setup>
/**
 * DragHandleCell - AG Grid cell renderer for drag handle
 * Shows a grip icon for row reordering
 */
import { GripVertical } from 'lucide-vue-next'

defineProps({
  params: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="drag-handle-cell h-full flex items-center justify-center cursor-grab active:cursor-grabbing">
    <GripVertical class="w-4 h-4 text-gray-400 hover:text-gray-600" />
  </div>
</template>

<style scoped>
.drag-handle-cell {
  width: 100%;
}
</style>
