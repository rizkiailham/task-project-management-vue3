<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import FormInput from '@/components/ui/FormInput.vue'
import UserMultiSearchDropdown from '@/components/user/UserMultiSearchDropdown.vue'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'

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

const { t } = useI18n()
const dpRefs = ref({})

const visibleFields = computed(() => (props.fields || []).filter((field) => field?.isShow !== false))

function getFieldKey(field) {
  return field?.key || field?.id || field?.label || ''
}

function updateValue(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
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

function updateDateRangeValue(key, value) {
  const start = value?.start || ''
  const end = value?.end || ''
  emit('update:modelValue', { ...props.modelValue, [key]: { start, end } })
}

const dateModelConfig = { type: 'string', mask: 'YYYY-MM-DD' }
const dateMasks = { input: 'YYYY-MM-DD' }

function formatRangeInput(range) {
  const start = range?.start || ''
  const end = range?.end || ''
  if (start && end) return `${start} - ${end}`
  return start || end || ''
}

function mapInputListeners(events) {
  if (!events || typeof events !== 'object') return {}
  return Object.entries(events).reduce((acc, [key, handler]) => {
    if (typeof handler !== 'function') return acc
    const onKey = `on${key.charAt(0).toUpperCase()}${key.slice(1)}`
    acc[onKey] = handler
    return acc
  }, {})
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
          display="chip"
          class="w-full"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'user'">
        <label class="mb-1.5 text-xs text-gray-500">{{ field.label }}</label>
        <UserMultiSearchDropdown
          :modelValue="modelValue[getFieldKey(field)]"
          :multiple="!!field.settings?.isAllowMultiple"
          :options="userOptions"
          :placeholder="field.label"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        />
      </template>

      <template v-else-if="field.type === 'date' && field.settings?.isDateRange">
        <VDatePicker
          :ref="el => { if (el) dpRefs[getFieldKey(field)] = el }"
          :modelValue="modelValue[getFieldKey(field)]"
          is-range
          :model-config="dateModelConfig"
          :masks="dateMasks"
          class="w-full"
          :popover="{ visibility: 'click' }"
          @update:modelValue="(value) => updateDateRangeValue(getFieldKey(field), value)"
        >
          <template #default="{ inputValue, inputEvents }">
            <FormInput
              :id="`custom-${getFieldKey(field)}`"
              :modelValue="formatRangeInput(inputValue)"
              :as="InputText"
              :label="field.label"
              labelClass="mb-1.5 text-xs text-gray-500"
              class="w-full"
              inputClass="w-full"
              readonly
              aria-label="Date range"
              :pt="{ root: mapInputListeners(inputEvents?.start) }"
            />
          </template>
          <template #footer>
            <div class="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].updateValue({ start: new Date(), end: new Date() }); dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].hidePopover()">{{ t('calendar.today', 'Today') }}</button>
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].updateValue(null); dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].hidePopover()">{{ t('calendar.clear', 'Clear') }}</button>
            </div>
          </template>
        </VDatePicker>
      </template>

      <template v-else-if="field.type === 'date'">
        <VDatePicker
          :ref="el => { if (el) dpRefs[getFieldKey(field)] = el }"
          :modelValue="modelValue[getFieldKey(field)]"
          :model-config="dateModelConfig"
          :masks="dateMasks"
          class="w-full"
          :popover="{ visibility: 'click' }"
          @update:modelValue="(value) => updateValue(getFieldKey(field), value)"
        >
          <template #default="{ inputValue, inputEvents }">
            <div class="flex flex-col">
              <FormInput
                :id="`custom-${getFieldKey(field)}`"
                :modelValue="inputValue || ''"
                :as="InputText"
                :label="field.label"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                inputClass="w-full"
                :pt="{ root: mapInputListeners(inputEvents) }"
              />
            </div>
          </template>
          <template #footer>
            <div class="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].updateValue(new Date()); dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].hidePopover()">{{ t('calendar.today', 'Today') }}</button>
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].updateValue(null); dpRefs[getFieldKey(field)] && dpRefs[getFieldKey(field)].hidePopover()">{{ t('calendar.clear', 'Clear') }}</button>
            </div>
          </template>
        </VDatePicker>
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
