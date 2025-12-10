<script setup>
import { computed } from 'vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  },
  options: {
    type: Array,
    default: () => []
  }
})

const statusOptions = computed(() => props.options.length ? props.options : [
  { label: 'To-do', value: 'To-do', color: '#9CA3AF' },
  { label: 'Doing', value: 'Doing', color: '#0EA5E9' },
  { label: 'Bug', value: 'Bug', color: '#EC4899' },
  { label: 'Archive', value: 'Archive', color: '#1D6B3C' },
  { label: 'Done', value: 'Done', color: '#059669' }
])

function selectStatus(option) {
  props.params.data.status = option.value
  props.params.api.refreshCells({
    rowNodes: [props.params.node],
    columns: ['status']
  })
}

const currentStatus = computed(() => props.params.data.status || statusOptions.value[0].value)

const currentColor = computed(() => {
  const found = statusOptions.value.find(o => o.value === currentStatus.value)
  return found?.color || '#9CA3AF'
})
</script>

<template>
  <DropdownMenu :items="statusOptions" position="left" width="10rem">
    <template #trigger>
      <button class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: currentColor }"></span>
        <span>{{ currentStatus }}</span>
        <svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </template>
    <template v-for="option in statusOptions" :key="option.value">
      <div
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
        @click="selectStatus(option)"
      >
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: option.color }"></span>
        {{ option.label }}
      </div>
    </template>
  </DropdownMenu>
</template>
