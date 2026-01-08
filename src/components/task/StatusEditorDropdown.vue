<script setup>
import { computed, ref } from 'vue'
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
  { label: 'Undone', value: 'Undone', color: '#d1d5db', shortcut: '1', dotColor: '#ffffff', dotBorder: '#d1d5db' },
  { label: 'Started', value: 'Started', color: '#3b82f6', shortcut: '2', dotColor: '#ffffff', dotBorder: '#3b82f6' },
  { label: 'Ongoing', value: 'Ongoing', color: '#ec4899', shortcut: '2', dotColor: '#ec4899' },
  { label: 'Bug', value: 'Bug', color: '#0284c7', shortcut: '2', dotColor: '#0284c7' },
  { label: 'Done', value: 'Done', color: '#10b981', shortcut: 'F', dotColor: '#10b981' },
  { label: 'Archive', value: 'Archive', color: '#6b8e23', shortcut: '4', dotColor: '#6b8e23' }
])

const selectedStatus = ref(props.params.data.status || statusOptions.value[0].value)

const menuItems = computed(() =>
  statusOptions.value.map((option) => ({
    ...option,
    action: () => selectStatus(option)
  }))
)

function selectStatus(option) {
  const pathKey = props.params?.data?.pathKey
  selectedStatus.value = option.value
  props.params.data.status = option.value
  props.params.context?.updateField?.(pathKey, 'status', option.value)
}

const currentStatus = computed(() => selectedStatus.value || statusOptions.value[0].value)

const currentColor = computed(() => {
  const found = statusOptions.value.find(o => o.value === currentStatus.value)
  return found?.color || '#9CA3AF'
})

function refresh(nextParams) {
  selectedStatus.value = nextParams?.data?.status || statusOptions.value[0].value
  return true
}

defineExpose({ refresh })
</script>

<template>
  <DropdownMenu :items="menuItems" position="left" width="10rem">
    <template #trigger>
      <button class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: currentColor }"></span>
        <span>{{ currentStatus }}</span>
        <svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </template>
    <template #item="{ item }">
      <div class="flex items-center gap-3">
        <div
          class="status-dot"
          :style="{
            backgroundColor: item.dotColor || item.color,
          }"
        />
        <span class="text-sm text-gray-700">{{ item.label }}</span>
      </div>
      <span v-if="item.shortcut" class="text-xs text-gray-400">{{ item.shortcut }}</span>
    </template>
  </DropdownMenu>
</template>

<style>
.status-dot {
  display: inline-flex;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  align-items: center;
  justify-content: center;
}
</style>
