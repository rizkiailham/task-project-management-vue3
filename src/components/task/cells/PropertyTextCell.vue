<script setup>
/**
 * PropertyTextCell - AG Grid cell renderer for text property values.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/ui/FormInput.vue'
import {
  getPropertyId,
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

const displayValue = computed(() => {
  const value = resolvePropertyValue(props.params)
  if (value === null || value === undefined) return ''
  return String(value)
})

const placeholderText = computed(() => t('taskDetail.properties.clickToEdit', 'Click to edit'))

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    if (isFocused.value) return
    localValue.value = displayValue.value
  },
  { deep: true }
)

function handleInput(event) {
  localValue.value = event?.target?.value ?? ''
}

async function commitEdit() {
  if (readonly.value) {
    localValue.value = displayValue.value
    return
  }
  if (localValue.value === displayValue.value) return
  await persistValue(localValue.value)
}

function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    event.target?.blur?.()
  }
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
  localValue.value = displayValue.value
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="property-text-cell h-full w-full flex items-center px-2"
    :class="{ 'is-readonly': readonly, 'is-focused': isFocused }"
    @mousedown.stop
    @click.stop
  >
    <FormInput
        v-model="localValue"
        :disabled="readonly"
        as="text"
        :placeholder="placeholderText"
        label="Property text"
        labelClass="sr-only"
        wrapperClass="w-full"
        class="task-grid-inline-input h-7 w-full min-w-0 text-left"
        @focus="isFocused = true"
        @blur="isFocused = false; commitEdit()"
        @input="handleInput"
        @keydown="onKeydown"
        @mousedown.stop
        @click.stop
      />
  </div>
</template>

<style scoped>
.property-text-cell {
  min-height: 100%;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

.property-text-cell:not(.is-readonly):not(.is-focused):hover {
  background: rgba(15, 23, 42, 0.04);
}

.property-text-cell.is-readonly {
  cursor: default;
}

</style>

<style>
.property-text-cell .task-grid-inline-input.p-inputtext,
.property-text-cell .task-grid-inline-input.p-inputtext.p-component {
  border-radius: 6px !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  font-size: 13px !important;
  color: #1f2937 !important;
  background: transparent !important;
  padding: 4px 8px !important;
  height: 28px !important;
  line-height: 20px !important;
}

.property-text-cell .task-grid-inline-input.p-inputtext::placeholder {
  color: #9ca3af !important;
  font-style: italic;
}

.property-text-cell:hover .task-grid-inline-input.p-inputtext {
  border-color: #9ca3af !important;
}

.property-text-cell .task-grid-inline-input.p-inputtext:focus,
.property-text-cell .task-grid-inline-input.p-inputtext:focus-visible {
  border-color: #9ca3af !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>
