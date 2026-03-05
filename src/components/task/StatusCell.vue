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

function resolveIconIdFromProgress(progress) {
  const value = Number(progress ?? 0)
  if (value >= 100) return '100'
  if (value >= 75) return '75'
  if (value >= 50) return '50'
  if (value >= 25) return '25'
  return '0'
}

const rowData = computed(() => props.params?.data || {})
const selectedColumnId = ref('')

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function resolveStatusPropertyDefinition() {
  const definitionsSource = props.params?.context?.propertyDefinitions
  const definitions = Array.isArray(definitionsSource?.value)
    ? definitionsSource.value
    : Array.isArray(definitionsSource)
      ? definitionsSource
      : []

  return definitions.find((property) => normalizeLookupKey(property?.key) === 'status') || null
}

function getMapValue(map, candidates = []) {
  if (!map || typeof map !== 'object') return undefined
  for (const candidate of candidates) {
    const rawKey = String(candidate || '').trim()
    if (!rawKey) continue
    if (rawKey in map) return map[rawKey]
    const normalized = normalizeLookupKey(rawKey)
    if (normalized in map) return map[normalized]
  }
  return undefined
}

function normalizeStatusValue(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'object') {
    return String(value.value ?? value.label ?? value.name ?? value.id ?? '').trim()
  }
  return String(value).trim()
}

function resolveCurrentStatusValue() {
  const data = rowData.value || {}
  const statusProperty = resolveStatusPropertyDefinition()
  const candidates = [statusProperty?.id, statusProperty?.key, statusProperty?.settings?.sourceField, 'status'].filter(Boolean)

  const fromPropertyMap = getMapValue(data.propertyValueMap, candidates)
  const normalizedFromPropertyMap = normalizeStatusValue(fromPropertyMap)
  if (normalizedFromPropertyMap) return normalizedFromPropertyMap

  const fromCustomMap = getMapValue(data.customFieldMap, candidates)
  const normalizedFromCustomMap = normalizeStatusValue(fromCustomMap)
  if (normalizedFromCustomMap) return normalizedFromCustomMap

  const entrySources = [data.propertyValues, data.customValues, data?._raw?.propertyValues, data?._raw?.customValues]
  for (const source of entrySources) {
    if (!Array.isArray(source)) continue
    const entry = source.find((item) => {
      const property = item?.property || {}
      const id = String(item?.propertyId || property?.id || '').trim()
      const key = normalizeLookupKey(item?.propertyKey || item?.key || property?.key || '')
      return candidates.some((candidate) => String(candidate) === id || normalizeLookupKey(candidate) === key)
    })
    const normalized = normalizeStatusValue(entry?.value)
    if (normalized) return normalized
  }

  return normalizeStatusValue(data.status || data?._raw?.status || '')
}

const statusOptions = computed(() => {
  const statusProperty = resolveStatusPropertyDefinition()
  const propertyOptions = Array.isArray(statusProperty?.settings?.options) ? statusProperty.settings.options : []
  if (propertyOptions.length) {
    return propertyOptions.map((option, index) => {
      const rawValue = option?.value ?? option?.label ?? option?.name ?? option?.id ?? ''
      const optionValue = String(rawValue || '').trim()
      const iconIdFromProgress = resolveIconIdFromProgress(option?.progress)
      const normalizedIcon = normalizeIconValue(option?.icon ?? iconIdFromProgress)
      const canonical = resolveIconProps(normalizedIcon, optionValue.toLowerCase())
      const progress = Number.isFinite(Number(option?.progress)) ? Number(option.progress) : canonical.progress
      const status = String(option?.status || canonical.status || 'todo')
      return {
        id: String(option?.id ?? (optionValue || `status-${index + 1}`)),
        value: optionValue,
        label: optionValue || t('taskDetail.status', 'Status'),
        icon: normalizedIcon,
        status,
        progress,
        color: option?.color || canonical.color
      }
    })
  }

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
  const currentStatusValue = resolveCurrentStatusValue()
  const byValue = options.find((item) => String(item.value ?? item.label ?? '') === currentStatusValue)
  if (byValue) return byValue
  const byId = options.find((item) => String(item.id ?? '') === currentStatusValue)
  if (byId) return byId
  const byStatus = options.find((item) => item.status === currentStatusValue)
  return byStatus || options[0]
})

function selectStatus(option) {
  const taskId = rowData.value?.id
  if (!taskId) return

  const nextValue = String(option?.value ?? option?.label ?? option?.id ?? '').trim()
  const currentValue = resolveCurrentStatusValue()
  if (!nextValue || nextValue === currentValue) return

  selectedColumnId.value = nextValue

  const updateFn = props.params?.context?.updatePropertyValue
  const statusProperty = resolveStatusPropertyDefinition()
  const propertyId = String(statusProperty?.id || 'status').trim()
  if (!updateFn || !propertyId) return

  Promise.resolve(
    updateFn({
      taskId,
      propertyId,
      value: nextValue
    })
  )
}

watch(
  () => [rowData.value, props.params?.context?.propertyDefinitions?.value],
  () => {
    selectedColumnId.value = resolveCurrentStatusValue()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="status-cell-wrapper h-full w-full flex items-center justify-start">
    <DropdownMenu position="right" width="12rem">
      <template #trigger>
        <button type="button" class="status-trigger flex items-center justify-center rounded-md hover:bg-black/5">
          <TaskProgressIcon
            :status="currentOption?.status || rowData?.status || 'todo'"
            :progress="currentOption?.progress ?? 0"
            :color="currentOption?.color || ''"
            size="md"
          />
        </button>
      </template>
      <template #content>
        <div class="py-1 max-h-60 overflow-y-auto">
          <button
            v-for="opt in statusOptions"
            :key="opt.id"
            type="button"
            class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
            :class="{ 'text-primary-600 bg-primary-50 font-semibold': currentOption?.id === opt.id }"
            @click="selectStatus(opt)"
          >
            <TaskProgressIcon
              :status="opt.status || 'todo'"
              :progress="opt.progress ?? 0"
              :color="opt.color || ''"
              size="sm"
            />
            <span class="flex-1 text-left truncate">{{ opt.label }}</span>
            <i v-if="currentOption?.id === opt.id" class="pi pi-check text-[10px]"></i>
          </button>
        </div>
      </template>
    </DropdownMenu>
  </div>
</template>
