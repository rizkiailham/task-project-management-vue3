<script setup>
import { Pencil, Trash } from 'lucide-vue-next'

const props = defineProps({
  params: Object
})

function onEdit() {
  props.params.onEdit?.(props.params.data)
}

function onDelete() {
  props.params.onDelete?.(props.params.data)
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 h-full group w-full">
    <span class="text-sm text-gray-900 truncate">{{ params.data?.name }}</span>
    <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        class="h-7 px-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50"
        @click.stop="onEdit"
        title="Edit"
      >
        <Pencil class="w-3 h-3" />
        Edit
      </button>
      <button
        type="button"
        class="h-7 w-7 inline-flex items-center justify-center rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50"
        @click.stop="onDelete"
        title="Delete"
      >
        <Trash class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

