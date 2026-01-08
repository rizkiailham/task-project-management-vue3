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

const teamOptions = computed(() => props.options.length ? props.options : [
  { label: 'Erik Olsvik', value: 'Erik Olsvik', avatar: 'E' },
  { label: 'Dart AI', value: 'Dart AI', avatar: 'DA' },
  { label: 'Hari W', value: 'Hari W', avatar: 'HW' },
  { label: 'TestTask', value: 'TestTask', avatar: 'TT' },
  { label: 'studio@lomedia.no', value: 'studio@lomedia.no', avatar: 'SL' }
])

const selectedAssignee = ref(props.params.data.assignee || teamOptions.value[0].value)

const menuItems = computed(() =>
  teamOptions.value.map((option) => ({
    ...option,
    action: () => selectAssignee(option)
  }))
)

function selectAssignee(option) {
  const pathKey = props.params?.data?.pathKey
  selectedAssignee.value = option.value
  props.params.data.assignee = option.value
  props.params.context?.updateField?.(pathKey, 'assignee', option.value)
}

const currentAssignee = computed(() => selectedAssignee.value || teamOptions.value[0].value)

function refresh(nextParams) {
  selectedAssignee.value = nextParams?.data?.assignee || teamOptions.value[0].value
  return true
}

defineExpose({ refresh })
</script>

<template>
  <DropdownMenu :items="menuItems" position="left" width="12rem">
    <template #trigger>
      <button class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-700 shadow-sm">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
          {{ currentAssignee.charAt(0) }}
        </span>
        <span>{{ currentAssignee }}</span>
        <svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </template>
    <template v-for="option in teamOptions" :key="option.value">
      <div
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
        @click="selectAssignee(option)"
      >
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-800">
          {{ option.avatar }}
        </span>
        {{ option.label }}
      </div>
    </template>
  </DropdownMenu>
</template>
