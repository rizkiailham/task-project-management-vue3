<script setup>
/**
 * PropertyMultiselectCell - AG Grid cell renderer for multiselect property values.
 * Uses MultiSelectPopper to stay visually consistent with TagEditorDropdown.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MultiSelectPopper from '@/components/ui/MultiSelectPopper.vue'
import {
  getPropertyDefinition,
  getPropertyId,
  getPropertyOptions,
  isPropertyReadonly,
  resolvePropertyValue
} from '@/components/task/cells/propertyCellUtils'

const props = defineProps({
  params: { type: Object, required: true }
})

const { t } = useI18n()
const propertyId = computed(() => getPropertyId(props.params))
const readonly = computed(() => isPropertyReadonly(props.params))
const selectedLabel = computed(() => {
  const propDef = getPropertyDefinition(props.params)
  return String(propDef?.label || propDef?.name || props.params?.colDef?.headerName || t('common.options', 'options'))
    .trim()
    .toLowerCase()
})
const allowCreate = computed(() => {
  const propDef = getPropertyDefinition(props.params)
  return propDef?.settings?.isAllowCustom !== false
})

const propertyOptions = computed(() => getPropertyOptions(props.params))

function normalizeOption(option, index = 0) {
  if (!option || typeof option !== 'object') return null
  const id = String(option.id ?? option.value ?? option.name ?? `opt-${index}`)
  const name = String(option.name ?? option.label ?? option.value ?? option.id ?? '').trim() || id
  return {
    id,
    name,
    color: option.color || ''
  }
}

function optionsToPropertySettings(options = []) {
  return options
    .map((option, index) => normalizeOption(option, index))
    .filter(Boolean)
    .map((option, index) => ({
      id: option.id,
      value: option.name,
      color: option.color || '',
      index: index + 1
    }))
}

function updateOptionSources(options = []) {
  const normalized = options
    .map((option, index) => normalizeOption(option, index))
    .filter(Boolean)
  const propertySettingsOptions = optionsToPropertySettings(normalized)

  const colDef = props.params?.colDef
  if (colDef) {
    colDef.propertyOptions = propertySettingsOptions
  }

  const definitionsSource = props.params?.context?.propertyDefinitions
  const definitions = Array.isArray(definitionsSource?.value)
    ? definitionsSource.value
    : Array.isArray(definitionsSource)
      ? definitionsSource
      : []
  const currentPropertyId = String(propertyId.value || '')

  const matched = definitions.find((item) => {
    if (!item) return false
    const id = String(item.id || '')
    const key = String(item.key || '')
    return id === currentPropertyId || key === currentPropertyId
  })

  if (matched) {
    if (!matched.settings || typeof matched.settings !== 'object') {
      matched.settings = {}
    }
    matched.settings.options = propertySettingsOptions
  }
}

const localOptions = ref([])

watch(
  propertyOptions,
  (nextOptions) => {
    localOptions.value = nextOptions
      .map((option) => normalizeOption({
        id: option.id,
        name: option.label ?? option.value ?? option.id,
        color: option.color || ''
      }))
      .filter(Boolean)
  },
  { immediate: true, deep: true }
)

function normalizeValueToken(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    return String(value.value ?? value.label ?? value.name ?? value.id ?? '')
  }
  return String(value)
}

function resolveSelectedValues() {
  const value = resolvePropertyValue(props.params)
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValueToken(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const selectedValues = ref(resolveSelectedValues())
const pendingPersistValue = ref(null)
let persistTimer = null
const isMenuOpen = ref(false)

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    selectedValues.value = resolveSelectedValues()
  },
  { deep: true }
)

const selectedTags = computed(() =>
  selectedValues.value.map((value) => {
    const option = localOptions.value.find((item) =>
      String(item.name) === String(value) || String(item.id) === String(value)
    )
    return {
      id: String(option?.id ?? value),
      name: String(option?.name ?? value),
      color: option?.color || ''
    }
  })
)

function getIndicatorColor(hex) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return '#6b7280'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 170 ? '#6b7280' : '#ffffff'
}

function mapTagToValue(tag) {
  if (!tag) return ''
  const byId = localOptions.value.find((option) => String(option.id) === String(tag.id))
  if (byId) return normalizeValueToken(byId.name)

  const byName = localOptions.value.find((option) => String(option.name) === String(tag.name))
  if (byName) return normalizeValueToken(byName.name)

  return normalizeValueToken(tag.name || tag.id)
}

async function handleSelectionChange(nextTags) {
  if (readonly.value) return
  const nextValues = [...new Set((Array.isArray(nextTags) ? nextTags : []).map((tag) => mapTagToValue(tag)).filter(Boolean))]

  if (JSON.stringify(nextValues) === JSON.stringify(selectedValues.value)) return
  selectedValues.value = nextValues
  if (isMenuOpen.value) {
    pendingPersistValue.value = nextValues
    return
  }
  applyOptimisticValue(nextValues)
  schedulePersist(nextValues)
}

function applyOptimisticValue(value) {
  const row = props.params?.data
  const colDef = props.params?.colDef || {}
  const colId = String(colDef.colId || colDef.field || '').trim()
  const sourceKey = String(colDef.sourceKey || '').trim()
  const directField = String(colDef.field || '').trim()

  if (!row || typeof row !== 'object') return

  if (directField) row[directField] = value
  if (colId) row[colId] = value
  if (!row.propertyValueMap || typeof row.propertyValueMap !== 'object') row.propertyValueMap = {}
  if (!row.customFieldMap || typeof row.customFieldMap !== 'object') row.customFieldMap = {}
  if (propertyId.value) row.propertyValueMap[propertyId.value] = value
  if (sourceKey) row.propertyValueMap[sourceKey] = value
  if (sourceKey) row.customFieldMap[sourceKey] = value
}

function schedulePersist(value) {
  pendingPersistValue.value = value
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    const next = pendingPersistValue.value
    pendingPersistValue.value = null
    if (next !== null) {
      persistValue(next)
    }
  }, 350)
}

async function persistValue(value) {
  const taskId = props.params?.data?.id
  if (!taskId) return

  const updateFn = props.params?.context?.updatePropertyValue
  if (updateFn) {
    const nextPropertyId = propertyId.value || props.params?.colDef?.sourceKey || props.params?.colDef?.field
    if (nextPropertyId) {
      await Promise.resolve(updateFn({ taskId, propertyId: nextPropertyId, value }))
      return
    }
  }

  const pathKey = props.params?.data?.pathKey
  const field = String(props.params?.colDef?.field || props.params?.colDef?.sourceKey || '').trim()
  props.params?.context?.updateField?.(pathKey, field, value)
}

onBeforeUnmount(() => {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  const next = pendingPersistValue.value
  pendingPersistValue.value = null
  if (next !== null) {
    persistValue(next)
  }
})

function handleMenuOpen() {
  isMenuOpen.value = true
}

function handleMenuClose() {
  isMenuOpen.value = false
  const next = pendingPersistValue.value
  pendingPersistValue.value = null
  if (next !== null) {
    applyOptimisticValue(next)
    schedulePersist(next)
  }
}

function refresh() {
  selectedValues.value = resolveSelectedValues()
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="property-multiselect-cell h-full w-full flex items-center justify-start"
    :class="{ 'is-readonly': readonly }"
    @mousedown.stop
    @click.stop
  >
    <MultiSelectPopper
      :model-value="selectedTags"
      v-model:options="localOptions"
      :placeholder="t('common.select', 'Select')"
      :allow-create="allowCreate"
      :use-fallback-when-empty="false"
      :close-on-select="false"
      :panel-width="270"
      :panel-max-width="270"
      :wrap-chips="true"
      :selected-label="selectedLabel"
      :disabled="readonly"
      placement="bottom-start"
      class="property-multiselect-popper"
      @open="handleMenuOpen"
      @close="handleMenuClose"
      @update:options="updateOptionSources"
      @update:model-value="handleSelectionChange"
    >
      <template #head="{ selected, remove }">
        <div class="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-500">
          {{ t('tasks.selectedTags', 'Selected tags') }}
        </div>
        <div v-if="selected.length" class="flex flex-wrap gap-1 px-3 pb-2">
          <button
            v-for="tag in selected"
            :key="tag.id"
            type="button"
            class="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-semibold"
            :style="{ backgroundColor: tag.color || '#e5e7eb', color: getIndicatorColor(tag.color) }"
            @click.stop="remove(tag)"
          >
            <span class="max-w-[120px] truncate" :title="tag.name">{{ tag.name }}</span>
            <span class="opacity-80">x</span>
          </button>
        </div>
        <div v-else class="px-3 pb-2 text-[11px] text-gray-400">
          {{ t('tasks.noTagsSelected', 'No tags selected.') }}
        </div>
      </template>
      <template #color-picker-selected-item="{ color }">
        <span
          class="absolute inset-0 flex items-center justify-center text-[10px] font-semibold drop-shadow"
          :style="{ color: getIndicatorColor(color) }"
        >
          &#10003;
        </span>
      </template>
    </MultiSelectPopper>
  </div>
</template>

<style scoped>
.property-multiselect-cell {
  cursor: pointer;
}

.property-multiselect-cell.is-readonly {
  cursor: default;
}

.property-multiselect-cell :deep(.tag-trigger) {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  background: transparent;
  border: none;
  min-height: unset;
  border-radius: 0;
}

.property-multiselect-cell :deep(.tag-placeholder) {
  font-size: 13px;
  color: var(--color-gray-400, #9ca3af);
}
</style>
