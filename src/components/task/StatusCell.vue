<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})
const { t } = useI18n()

const ICON_OPTIONS = [
  { id: '0', status: 'todo', progress: 0, color: '#9ca3af' },
  { id: '25', status: 'in_progress', progress: 25, color: '#14b8a6' },
  { id: '50', status: 'in_progress', progress: 50, color: '#a855f7' },
  { id: '75', status: 'in_progress', progress: 75, color: '#f97316' },
  { id: '100', status: 'done', progress: 100, color: '#22c55e' }
]

function normalizeIconValue(icon) {
  const raw = String(icon ?? '0')
  const legacyMap = {
    '1': '25',
    '2': '50',
    '3': '75',
    '4': '100',
    '5': '100'
  }
  const mapped = legacyMap[raw] || raw
  return ICON_OPTIONS.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveIconProps(icon, fallbackStatus) {
  const normalized = normalizeIconValue(icon)
  const matched = ICON_OPTIONS.find((item) => item.id === normalized)
  if (matched) return { ...matched, icon: normalized }

  if (fallbackStatus === 'done' || fallbackStatus === 'completed') {
    return { ...ICON_OPTIONS[4], icon: '100' }
  }
  if (fallbackStatus === 'in_progress') {
    return { ...ICON_OPTIONS[2], icon: '50' }
  }
  return { ...ICON_OPTIONS[0], icon: '0' }
}

const rowData = computed(() => props.params?.data || {})
const selectedColumnId = ref('')

const statusOptions = computed(() => {
  const fromContext = props.params?.context?.statusOptions?.value
  if (Array.isArray(fromContext) && fromContext.length) return fromContext

  const fallback = resolveIconProps(null, rowData.value?.status)
  return [
    {
      id: rowData.value?.kanbanColumnId || rowData.value?.status || 'status',
      label: rowData.value?.kanbanColumnName || t('taskDetail.status', 'Status'),
      ...fallback
    }
  ]
})

const currentOption = computed(() => {
  const options = statusOptions.value
  const currentColumnId = selectedColumnId.value || (rowData.value?.kanbanColumnId ? String(rowData.value.kanbanColumnId) : null)
  if (currentColumnId) {
    const byColumnId = options.find((item) => String(item.id) === currentColumnId)
    if (byColumnId) return byColumnId
  }
  const byStatus = options.find((item) => item.status === rowData.value?.status)
  return byStatus || options[0]
})

const menuItems = computed(() =>
  statusOptions.value.map((option) => ({
    ...option,
    action: () => selectStatus(option)
  }))
)

function selectStatus(option) {
  const taskId = rowData.value?.id
  if (!taskId || !option?.id) return

  const selectedId = String(option.id)
  const currentId = rowData.value?.kanbanColumnId ? String(rowData.value.kanbanColumnId) : null
  if (currentId && selectedId === currentId) return

  // Optimistic UI: switch icon/label immediately.
  selectedColumnId.value = selectedId

  // Important FE/BE mapping note:
  // "Status" dropdown in UI represents Kanban Column selection.
  // Persisted API field is `kanbanColumnId` (and related `kanbanColumn` object), not `status`.
  props.params?.context?.updateStatus?.({
    taskId,
    kanbanColumnId: option.id,
    previousKanbanColumnId: currentId,
    projectItemId: rowData.value?.projectItemId || rowData.value?._raw?.projectItemId || rowData.value?._raw?.projectId || null
  })
}

watch(
  () => rowData.value?.kanbanColumnId,
  (nextId) => {
    selectedColumnId.value = nextId ? String(nextId) : ''
  },
  { immediate: true }
)
</script>

<template>
  <div class="status-cell-wrapper h-full w-full flex items-center justify-center">
    <DropdownMenu :items="menuItems" position="right" width="14rem">
      <template #trigger>
        <button type="button" class="status-trigger flex items-center justify-center rounded-md p-1 hover:bg-black/5">
          <TaskProgressIcon
            :status="currentOption?.status || rowData?.status || 'todo'"
            :progress="currentOption?.progress ?? 0"
            :color="currentOption?.color || ''"
            size="sm"
          />
        </button>
      </template>
      <template #item="{ item }">
        <div class="flex items-center gap-2 min-w-0">
          <TaskProgressIcon
            :status="item.status || 'todo'"
            :progress="item.progress ?? 0"
            :color="item.color || ''"
            size="sm"
          />
          <span class="text-xs text-gray-700 truncate">{{ item.label }}</span>
        </div>
        <i
          v-if="String(item.id) === String(currentOption?.id)"
          class="pi pi-check text-[10px] text-primary-600"
        ></i>
      </template>
    </DropdownMenu>
  </div>
</template>
