<script setup>
import { computed } from 'vue'
import FormInput from '@/components/ui/FormInput.vue'
import Checkbox from 'primevue/checkbox'

const props = defineProps({
  fields: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  userOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const visibleFields = computed(() => (props.fields || []).filter((field) => field?.isShow !== false))

function getFieldKey(field) {
  return field?.key || field?.id || field?.label || ''
}

function updateValue(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateRangeValue(key, part, value) {
  const nextRange = { ...(props.modelValue?.[key] || {}), [part]: value }
  emit('update:modelValue', { ...props.modelValue, [key]: nextRange })
}

function normalizeOptions(options) {
  const list = Array.isArray(options) ? options : []
  const flattened = []

  list.forEach((option) => {
    if (option && typeof option === 'object') {
      if (option.label) {
        flattened.push({ label: option.label, value: option.label })
      }
      if (Array.isArray(option.children)) {
        option.children.forEach((child) => {
          if (child?.label) {
            flattened.push({
              label: `${option.label} / ${child.label}`,
              value: `${option.label} / ${child.label}`
            })
          }
        })
      }
      return
    }
    if (option) {
      flattened.push({ label: String(option), value: option })
    }
  })

  return flattened
}

function getNumberProps(field) {
  const format = field?.settings?.numberFormat || 'number'
  if (format === 'currency') {
    return { mode: 'currency', currency: field?.settings?.currencySign || 'NOK' }
  }
  if (format === 'percentage') {
    return { suffix: '%' }
  }
  return { mode: 'decimal' }
}
</script>

<template>
  <div v-if="visibleFields.length" class="grid gap-4 sm:grid-cols-2">
    <div
      v-for="field in visibleFields"
      :key="field.id || field.key || field.label"
      class="flex flex-col"
    >
      <template v-if="field.type === 'checkbox' || field.type === 'boolean'">
        <div class="flex items-center gap-2 pt-1">
          <Checkbox
            :modelValue="modelValue[getFieldKey(field)]"
            :binary="true"
            :inputId="`custom-${getFieldKey(field)}`"
            @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
          />
          <label :for="`custom-${getFieldKey(field)}`" class="text-sm text-gray-700 cursor-pointer">
            {{ field.label }}
          </label>
        </div>
      </template>

      <template v-else-if="field.type === 'number'">
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          as="number"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          showButtons
          :min="0"
          class="w-full"
          inputClass="w-full"
          v-bind="getNumberProps(field)"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'select'">
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          as="select"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          :options="normalizeOptions(field.settings?.options)"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'multiselect'">
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          as="multiselect"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          :options="normalizeOptions(field.settings?.options)"
          optionLabel="label"
          optionValue="value"
          display="comma"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'user'">
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          :as="field.settings?.isAllowMultiple ? 'multiselect' : 'select'"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          :options="userOptions"
          optionLabel="label"
          optionValue="value"
          display="comma"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'date' && field.settings?.isDateRange">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormInput
            :id="`custom-${getFieldKey(field)}-start`"
            :modelValue="modelValue[getFieldKey(field)]?.start || ''"
            type="date"
            :label="field.label"
            labelClass="mb-1.5 text-xs text-gray-500"
            class="w-full"
            @update:modelValue="(value) => updateRangeValue(getFieldKey(field), 'start', value)"
          />
          <FormInput
            :id="`custom-${getFieldKey(field)}-end`"
            :modelValue="modelValue[getFieldKey(field)]?.end || ''"
            type="date"
            labelClass="mb-1.5 text-xs text-gray-500"
            class="w-full"
            @update:modelValue="(value) => updateRangeValue(getFieldKey(field), 'end', value)"
          />
        </div>
      </template>

      <template v-else-if="field.type === 'date'">
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          type="date"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else>
        <FormInput
          :id="`custom-${getFieldKey(field)}`"
          :modelValue="modelValue[getFieldKey(field)]"
          :label="field.label"
          labelClass="mb-1.5 text-xs text-gray-500"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>
    </div>
  </div>
</template>
