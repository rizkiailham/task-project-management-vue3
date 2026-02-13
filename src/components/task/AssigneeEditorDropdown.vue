<script setup>
import { computed, ref } from 'vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { Check } from 'lucide-vue-next'

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
      <button class="assignee-pill flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-1 pr-2 py-0.5 text-xs text-gray-700 hover:border-gray-300 transition-colors">
        <Avatar
          :label="currentAssignee?.avatar?.length <= 2 ? currentAssignee?.avatar : currentAssignee.charAt(0).toUpperCase()"
          :image="currentAssignee?.avatar?.length > 2 ? currentAssignee.avatar : undefined"
          shape="circle"
          class="h-5 w-5 flex-shrink-0 text-[10px] font-semibold text-white"
          :style="currentAssignee?.avatar?.length > 2 ? {} : { backgroundColor: getAvatarColor(currentAssignee) }"
        />
        <span class="max-w-[100px] truncate">{{ currentAssignee }}</span>
        <svg class="h-3 w-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </template>
    <template v-for="option in teamOptions" :key="option.value">
      <button
        type="button"
        class="aed-list-item"
        :class="{ 'is-selected': selectedAssignee === option.value }"
        @click="selectAssignee(option)"
      >
        <Avatar
          :label="option.avatar?.length <= 2 ? option.avatar : option.label?.charAt(0)?.toUpperCase()"
          :image="option.avatar?.length > 2 ? option.avatar : undefined"
          shape="circle"
          class="aed-list-avatar"
          :style="option.avatar?.length > 2 ? { backgroundColor: 'transparent' } : { backgroundColor: getAvatarColor(option.label) }"
        />
        <div class="aed-list-info">
          <span class="aed-list-name">{{ option.label }}</span>
        </div>
        <Check v-if="selectedAssignee === option.value" class="aed-list-check" />
      </button>
    </template>
  </DropdownMenu>
</template>

<style scoped>
.aed-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-gray-700, #374151);
  cursor: pointer;
  transition: background-color 0.12s ease;
  border: none;
  background: transparent;
  text-align: left;
}

.aed-list-item:hover {
  background: #f3f4f6;
}

.aed-list-item.is-selected {
  background: var(--p-primary-50, #eff6ff);
  color: var(--p-primary-700, #1d4ed8);
}

.aed-list-avatar {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px;
  font-size: 11px !important;
  color: #ffffff !important;
  font-weight: 600;
  flex-shrink: 0;
}

.aed-list-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  flex: 1;
  gap: 1px;
}

.aed-list-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  line-height: 1.3;
}

.aed-list-check {
  width: 14px;
  height: 14px;
  color: var(--p-primary-500, #3b82f6);
  flex-shrink: 0;
}
</style>
