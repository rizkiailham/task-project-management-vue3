<script setup>
/**
 * PropertyNumberCell - AG Grid cell renderer for number property values.
 * Supports numeric formats and preset option formats (e.g. t-shirt sizing).
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/ui/FormInput.vue'
import { ChevronDown } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import {
  getNumberPropertyFormatOptions,
  getPropertyId,
  getPropertyOptions,
  isPropertyReadonly,
  resolvePropertyValue
} from '@/components/task/cells/propertyCellUtils'

const props = defineProps({
  params: { type: Object, required: true }
})

const { t } = useI18n()
const isFocused = ref(false)
const localValue = ref('')

const propertyId = computed(() => getPropertyId(props.params))
const readonly = computed(() => isPropertyReadonly(props.params))
const isSizeProperty = computed(() => {
  const key = String(
    props.params?.colDef?.propertyKey
      || props.params?.colDef?.sourceKey
      || props.params?.colDef?.field
      || ''
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return key === 'size'
})

const optionChoices = computed(() => {
  if (isSizeProperty.value) return []
  const formatOptions = getNumberPropertyFormatOptions(props.params)
  if (formatOptions.length) return formatOptions
  return getPropertyOptions(props.params)
})

const hasOptionChoices = computed(() => optionChoices.value.length > 0)

const rawValue = computed(() => resolvePropertyValue(props.params))

const menuItems = computed(() =>
  optionChoices.value.map((option) => ({
    ...option,
    key: String(option.id),
    type: 'item',
    active: String(option.value) === String(rawValue.value ?? '')
  }))
)

const displayValue = computed(() => {
  const value = rawValue.value
  if (value === null || value === undefined || value === '') return ''

  if (hasOptionChoices.value) {
    const match = optionChoices.value.find((option) => String(option.value) === String(value))
    return match?.label || String(value)
  }

  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString()
})

const emptyLabel = computed(() => t('taskDetail.properties.enterNumber', 'Enter number'))

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    if (isFocused.value) return
    localValue.value = rawValue.value === null || rawValue.value === undefined ? '' : String(rawValue.value)
  },
  { deep: true }
)

async function commitEdit() {
  if (readonly.value || hasOptionChoices.value) return
  const nextRaw = String(localValue.value ?? '').trim()
  if (nextRaw === '' && (rawValue.value === null || rawValue.value === undefined || rawValue.value === '')) {
    return
  }

  const nextValue = nextRaw === '' ? null : Number(nextRaw)
  if (nextRaw !== '' && Number.isNaN(nextValue)) return

  const currentValue = rawValue.value === null || rawValue.value === undefined || rawValue.value === ''
    ? null
    : Number(rawValue.value)

  if (nextValue === currentValue) return
  await persistValue(nextValue)
}

function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    event.target?.blur?.()
  }
}

async function handleOptionSelect(item) {
  if (readonly.value) return
  if (!item) return
  const nextValue = item.value
  if (String(nextValue) === String(rawValue.value ?? '')) return
  await persistValue(nextValue)
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
  localValue.value = rawValue.value === null || rawValue.value === undefined ? '' : String(rawValue.value)
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="property-number-cell h-full w-full flex items-center px-2"
    :class="{ 'is-readonly': readonly, 'is-focused': isFocused }"
    @mousedown.stop
    @click.stop
  >
    <template v-if="hasOptionChoices">
      <DropdownMenu :items="menuItems" position="right" width="12rem" :closeOnSelect="true" @select="handleOptionSelect">
        <template #trigger>
          <button type="button" class="property-number-trigger" :disabled="readonly" @mousedown.stop>
            <span class="truncate" :class="displayValue ? 'text-gray-700' : 'text-gray-400 italic'">
              {{ displayValue || emptyLabel }}
            </span>
            <ChevronDown class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          </button>
        </template>
        <template #item="{ item }">
          <span class="text-xs text-gray-700 truncate">{{ item.label }}</span>
          <i v-if="item.active" class="pi pi-check text-[10px] text-primary-600"></i>
        </template>
      </DropdownMenu>
    </template>

    <template v-else>
      <FormInput
        v-model="localValue"
        :disabled="readonly"
        as="text"
        type="number"
        inputmode="decimal"
        step="any"
        :placeholder="emptyLabel"
        label="Property number"
        labelClass="sr-only"
        wrapperClass="w-full"
        class="task-grid-inline-input h-7 w-full min-w-0 text-left"
        style="font-variant-numeric: tabular-nums; -moz-appearance: textfield; appearance: textfield;"
        @focus="isFocused = true"
        @blur="isFocused = false; commitEdit()"
        @keydown="onKeydown"
        @mousedown.stop
        @click.stop
      />
    </template>
  </div>
</template>

<style scoped>
.property-number-cell {
  min-height: 100%;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

.property-number-cell:not(.is-readonly):not(.is-focused):hover {
  background: rgba(15, 23, 42, 0.04);
}

.property-number-cell.is-readonly {
  cursor: default;
}

.property-number-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 13px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.1s;
}

.property-number-trigger:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.property-number-trigger:disabled {
  cursor: default;
}

</style>

<style>
.property-number-cell .task-grid-inline-input.p-inputtext,
.property-number-cell .task-grid-inline-input.p-inputtext.p-component {
  border-radius: 6px !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  font-size: 13px !important;
  color: #1f2937 !important;
  font-variant-numeric: tabular-nums;
  background: transparent !important;
  padding: 4px 8px !important;
  height: 28px !important;
  line-height: 20px !important;
}

.property-number-cell .task-grid-inline-input.p-inputtext::placeholder {
  color: #9ca3af !important;
  font-style: italic;
}

.property-number-cell:hover .task-grid-inline-input.p-inputtext {
  border-color: #9ca3af !important;
}

.property-number-cell .task-grid-inline-input.p-inputtext:focus,
.property-number-cell .task-grid-inline-input.p-inputtext:focus-visible {
  border-color: #9ca3af !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>
