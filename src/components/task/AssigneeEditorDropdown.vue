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

// Color palette for assignee avatars
const avatarColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

function getAvatarColor(name) {
  if (!name || name === 'Unassigned') return '#9CA3AF' // gray for unassigned
  // Generate consistent color based on name hash
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
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
      <button class="assignee-pill flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-1 pr-2 py-0.5 text-xs text-gray-700 hover:border-gray-300 transition-colors">
        <span 
          class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          :style="{ backgroundColor: getAvatarColor(currentAssignee) }"
        >
          {{ currentAssignee.charAt(0).toUpperCase() }}
        </span>
        <span class="max-w-[100px] truncate">{{ currentAssignee }}</span>
        <svg class="h-3 w-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
