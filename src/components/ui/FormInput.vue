<script setup>
import { computed, ref, useAttrs, useSlots } from 'vue'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Password from 'primevue/password'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, Object, Array, Date],
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  as: {
    type: [String, Object],
    default: 'text'
  },
  floatVariant: {
    type: String,
    default: 'on'
  },
  labelClass: {
    type: String,
    default: ''
  },
  labelWrapperClass: {
    type: String,
    default: ''
  },
  wrapperClass: {
    type: String,
    default: ''
  },
  inputClass: {
    type: [String, Array, Object],
    default: ''
  },
  invalid: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const attrs = useAttrs()
const slots = useSlots()
const inputRef = ref(null)

const componentMap = {
  text: InputText,
  textarea: Textarea,
  password: Password,
  number: InputNumber,
  select: Select,
  multiselect: MultiSelect
}

const resolvedComponent = computed(() => {
  if (typeof props.as === 'string') {
    return componentMap[props.as] || InputText
  }
  return props.as || InputText
})

const inputId = computed(() => props.id || attrs.id)

const hasLabel = computed(() => Boolean(props.label || slots.label))
const labelHasStar = computed(() => typeof props.label === 'string' && props.label.includes('*'))
const labelText = computed(() => {
  if (!labelHasStar.value) return props.label
  return props.label.replace('*', '').trim()
})
const isSelectLike = computed(() => {
  if (props.as === 'select' || props.as === 'multiselect') return true
  return resolvedComponent.value === Select || resolvedComponent.value === MultiSelect
})

const inputAttrs = computed(() => {
  const { class: _class, placeholder, 'aria-label': ariaLabel, ...rest } = attrs
  const next = { ...rest, placeholder }

  if (hasLabel.value && isSelectLike.value && placeholder) {
    return { ...next, 'aria-label': ariaLabel || placeholder }
  }

  return next
})

const mergedInputClass = computed(() => ['w-full', attrs.class, { 'p-invalid': props.invalid }])

const passThroughSlotNames = computed(() =>
  Object.keys(slots).filter((name) => !['label', 'labelRight', 'help'].includes(name))
)

function updateValue(value) {
  emit('update:modelValue', value)
}

function focus() {
  const el = inputRef.value?.$el || inputRef.value
  const focusTarget = el?.matches?.('input, textarea, [tabindex]')
    ? el
    : el?.querySelector?.('input, textarea, [tabindex]')
  focusTarget?.focus?.()
}

defineExpose({ focus })
</script>

<template>
  <div :class="['w-full', wrapperClass]">
    <div v-if="$slots.labelRight" :class="labelWrapperClass">
      <slot name="labelRight" />
    </div>
    <FloatLabel v-if="hasLabel" :variant="floatVariant" class="form-input-float">
      <component
        :is="resolvedComponent"
        ref="inputRef"
        :id="inputId"
        :modelValue="modelValue"
        :inputClass="inputClass"
        v-bind="inputAttrs"
        :class="mergedInputClass"
        @update:modelValue="updateValue"
      >
        <template v-for="name in passThroughSlotNames" v-slot:[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </component>
      <label :for="inputId" :class="labelClass">
        <template v-if="$slots.label">
          <slot name="label" />
        </template>
        <template v-else-if="labelHasStar">
          {{ labelText }} <span class="text-red-500">*</span>
        </template>
        <template v-else>
          {{ label }}
        </template>
      </label>
    </FloatLabel>
    <component
      v-else
      :is="resolvedComponent"
      ref="inputRef"
      :id="inputId"
      :modelValue="modelValue"
      :inputClass="inputClass"
      v-bind="inputAttrs"
      :class="mergedInputClass"
      @update:modelValue="updateValue"
    >
      <template v-for="name in passThroughSlotNames" v-slot:[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </component>
    <slot name="help" />
  </div>
</template>

<style scoped>
.form-input-float {
  display: block;
  width: 100%;
}

.form-input-float :deep(.p-inputtext),
.form-input-float :deep(.p-inputnumber),
.form-input-float :deep(.p-password),
.form-input-float :deep(.p-select),
.form-input-float :deep(.p-textarea) {
  width: 100%;
}

.form-input-float :deep(.p-password input) {
  width: 100%;
}
</style>
