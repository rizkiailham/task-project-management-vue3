<script setup>
/**
 * PropertyCheckboxCell - AG Grid cell renderer for checkbox/boolean property values.
 */
import { computed, ref, watch } from 'vue'
import Checkbox from 'primevue/checkbox'
import {
  getPropertyId,
  isPropertyReadonly,
  resolvePropertyValue
} from '@/components/task/cells/propertyCellUtils'

const props = defineProps({
  params: { type: Object, required: true }
})

const propertyId = computed(() => getPropertyId(props.params))
const readonly = computed(() => isPropertyReadonly(props.params))

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '1'
  if (typeof value === 'number') return value !== 0
  return Boolean(value)
}

const checked = ref(toBoolean(resolvePropertyValue(props.params)))

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    checked.value = toBoolean(resolvePropertyValue(props.params))
  },
  { deep: true }
)

async function handleToggle(nextValue) {
  if (readonly.value) return
  const taskId = props.params?.data?.id
  if (!taskId || !propertyId.value) return

  const value = Boolean(nextValue)
  checked.value = value

  const updateFn = props.params?.context?.updatePropertyValue
  if (updateFn) {
    await Promise.resolve(updateFn({ taskId, propertyId: propertyId.value, value }))
  }
}

function refresh() {
  checked.value = toBoolean(resolvePropertyValue(props.params))
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="property-checkbox-cell h-full w-full flex items-center justify-start"
    :class="{ 'is-readonly': readonly }"
    @mousedown.stop
    @click.stop
  >
    <Checkbox
      :modelValue="checked"
      :binary="true"
      :disabled="readonly"
      @update:modelValue="handleToggle"
      @click.stop
    />
  </div>
</template>

<style scoped>
.property-checkbox-cell {
  cursor: pointer;
}

.property-checkbox-cell.is-readonly {
  cursor: default;
}

.property-checkbox-cell :deep(.p-checkbox) {
  width: 18px;
  height: 18px;
}

.property-checkbox-cell :deep(.p-checkbox-box) {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}
</style>
