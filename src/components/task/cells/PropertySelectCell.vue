<script setup>
/**
 * PropertySelectCell - AG Grid cell renderer for single-select property values.
 * Uses MultiSelectPopper to stay visually consistent with TagEditorDropdown.
 */
import { computed, ref, watch } from 'vue'
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
const propertyOptions = computed(() => getPropertyOptions(props.params))
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

function normalizeValueToken(value) {
  if (Array.isArray(value)) {
    const first = value.find((entry) => entry !== null && entry !== undefined && entry !== '')
    return normalizeValueToken(first)
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    return String(value.value ?? value.label ?? value.name ?? value.id ?? '')
  }
  const text = String(value)
  if (!text.includes(',')) return text
  return text
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) || ''
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

function resolveSelectedTag() {
  const value = normalizeValueToken(resolvePropertyValue(props.params))
  if (!value) return []
  const option = localOptions.value.find((item) =>
    String(item.name) === value || String(item.id) === value
  )
  return [{
    id: String(option?.id ?? value),
    name: String(option?.name ?? value),
    color: option?.color || ''
  }]
}

const selectedTag = ref(resolveSelectedTag())

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    selectedTag.value = resolveSelectedTag()
  },
  { deep: true }
)

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
  const firstTag = Array.isArray(nextTags) && nextTags.length ? nextTags[0] : null
  const nextValue = firstTag ? mapTagToValue(firstTag) : ''
  const currentValue = normalizeValueToken(resolvePropertyValue(props.params))

  if (nextValue === currentValue) return

  selectedTag.value = firstTag ? [firstTag] : []
  await persistValue(nextValue || null)
}

async function persistValue(value) {
  const taskId = props.params?.data?.id
  if (!taskId || !propertyId.value) return

  const row = props.params?.data
  const colDef = props.params?.colDef || {}
  const colId = String(colDef.colId || colDef.field || '').trim()
  const sourceKey = String(colDef.sourceKey || '').trim()
  const directField = String(colDef.field || '').trim()

  if (row && typeof row === 'object') {
    if (directField) row[directField] = value
    if (colId) row[colId] = value
    if (!row.propertyValueMap || typeof row.propertyValueMap !== 'object') row.propertyValueMap = {}
    if (!row.customFieldMap || typeof row.customFieldMap !== 'object') row.customFieldMap = {}
    row.propertyValueMap[propertyId.value] = value
    if (sourceKey) row.propertyValueMap[sourceKey] = value
    if (sourceKey) row.customFieldMap[sourceKey] = value
  }

  const updateFn = props.params?.context?.updatePropertyValue
  if (updateFn) {
    await Promise.resolve(updateFn({ taskId, propertyId: propertyId.value, value }))
  }

  if (props.params?.api && props.params?.node && colId) {
    props.params.api.refreshCells({
      rowNodes: [props.params.node],
      columns: [colId],
      force: true
    })
  }
}

function refresh() {
  selectedTag.value = resolveSelectedTag()
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="property-select-cell h-full w-full flex items-center justify-start"
    :class="{ 'is-readonly': readonly }"
    @mousedown.stop
    @click.stop
  >
    <MultiSelectPopper
      :model-value="selectedTag"
      v-model:options="localOptions"
      :placeholder="t('common.select', 'Select')"
      :allow-create="allowCreate"
      :use-fallback-when-empty="false"
      :max-selection="1"
      :close-on-select="true"
      :panel-width="270"
      :panel-max-width="270"
      :wrap-chips="true"
      :selected-label="selectedLabel"
      :disabled="readonly"
      placement="bottom-start"
      class="property-multiselect-popper"
      :max-visible-tags="1"
      @update:options="updateOptionSources"
      @update:model-value="handleSelectionChange"
    />
  </div>
</template>

<style scoped>
.property-select-cell {
  cursor: pointer;
}

.property-select-cell.is-readonly {
  cursor: default;
}

.property-select-cell :deep(.tag-trigger) {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  background: transparent;
  border: none;
  min-height: unset;
  border-radius: 0;
}

.property-select-cell :deep(.tag-placeholder) {
  font-size: 13px;
  color: var(--color-gray-400, #9ca3af);
}
</style>
