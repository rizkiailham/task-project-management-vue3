<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: Object
})

const isAdmin = computed(() => props.params.data?.isAdmin)
const displayName = computed(() => {
  const name = props.params.value
  if (name === 'super_admin') return 'Super Admin'
  return name
})

function onEdit() {
  props.params.onEdit?.(props.params.data)
}

function onDelete() {
  props.params.onDelete?.(props.params.data)
}
</script>

<template>
  <div class="flex items-center gap-2 h-full w-full group">
    <div class="flex items-center gap-2 min-w-0">
      <span class="font-medium text-gray-900 truncate">{{ displayName }}</span>
      <span
        v-if="isAdmin"
        class="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded"
      >
        Admin
      </span>
    </div>
    <div class="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        @click.stop="onEdit"
        class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200 bg-white"
      >
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
        Edit
      </button>
      <button
        v-if="!isAdmin"
        @click.stop="onDelete"
        class="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200 bg-white"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
