<script setup>
import { computed, isRef, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MultiSelectPopper from '@/components/ui/MultiSelectPopper.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const localOptions = ref([])
const selectedValues = ref([])
const selectRef = ref(null)
let resizeRaf = null
const columnWidth = ref(0)

const rendererParams = computed(() => props.params?.colDef?.cellRendererParams || props.params?.cellRendererParams || {})
const fieldKey = computed(() => rendererParams.value.fieldKey || props.params?.colDef?.field || 'tags')
const optionsKey = computed(() => {
  if (rendererParams.value.optionsKey) return rendererParams.value.optionsKey
  const field = fieldKey.value || 'tags'
  if (field === 'tags') return 'tagOptions'
  return `${field}Options`
})
const placeholderText = computed(() => rendererParams.value.placeholder || 'Add an option...')
const allowCreate = computed(() => rendererParams.value.allowCreate ?? true)
const useFallbackWhenEmpty = computed(() => rendererParams.value.useFallbackWhenEmpty ?? true)
const maxVisibleTags = computed(() => rendererParams.value.maxVisibleTags ?? 0)

function scheduleRecalc() {
  if (!selectRef.value?.recalc) return
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    selectRef.value?.recalc?.()
  })
}

function handleGridResize(event) {
  const nextWidth = props.params?.column?.getActualWidth?.()
  if (Number.isFinite(nextWidth) && nextWidth > 0) {
    const delta = Math.abs(nextWidth - columnWidth.value)
    if (delta < 1) return
    columnWidth.value = nextWidth
  }
  scheduleRecalc()
}

function getOptionsSource() {
  const rendererSource = rendererParams.value.options ?? rendererParams.value.optionsSource
  const context = props.params?.context
  const mapSource = context?.fieldOptions?.[fieldKey.value]
    || context?.optionsByField?.[fieldKey.value]
    || context?.optionsMap?.[fieldKey.value]
  const contextSource = context?.[optionsKey.value]
  if (isRef(rendererSource)) return rendererSource.value
  if (Array.isArray(rendererSource)) return rendererSource
  if (isRef(mapSource)) return mapSource.value
  if (Array.isArray(mapSource)) return mapSource
  if (isRef(contextSource)) return contextSource.value
  if (Array.isArray(contextSource)) return contextSource
  return localOptions.value
}

function setOptionsSource(next) {
  const rendererSource = rendererParams.value.options ?? rendererParams.value.optionsSource
  if (isRef(rendererSource)) {
    rendererSource.value = next
    return
  }
  if (Array.isArray(rendererSource)) {
    rendererSource.splice(0, rendererSource.length, ...next)
    return
  }
  const context = props.params?.context
  const mapSource = context?.fieldOptions?.[fieldKey.value]
    || context?.optionsByField?.[fieldKey.value]
    || context?.optionsMap?.[fieldKey.value]
  if (isRef(mapSource)) {
    mapSource.value = next
    return
  }
  if (Array.isArray(mapSource)) {
    mapSource.splice(0, mapSource.length, ...next)
    return
  }
  const contextSource = context?.[optionsKey.value]
  if (isRef(contextSource)) {
    contextSource.value = next
    return
  }
  if (Array.isArray(contextSource)) {
    contextSource.splice(0, contextSource.length, ...next)
    return
  }
  localOptions.value = next
}

const optionsProxy = computed({
  get: () => getOptionsSource(),
  set: (next) => setOptionsSource(next)
})

function syncSelectedValues(nextValues = props.params?.data?.[fieldKey.value]) {
  selectedValues.value = Array.isArray(nextValues) ? nextValues : []
}

watch(
  () => props.params?.data?.[fieldKey.value],
  (next) => syncSelectedValues(next),
  { immediate: true, deep: true }
)

watch(fieldKey, () => {
  syncSelectedValues(props.params?.data?.[fieldKey.value])
})

function commitSelection(next) {
  selectedValues.value = next
  const pathKey = props.params?.data?.pathKey
  const key = fieldKey.value || 'tags'
  if (props.params?.data && key) {
    props.params.data[key] = next
  }
  props.params.context?.updateField?.(pathKey, key, next)
}

function refresh(nextParams) {
  syncSelectedValues(nextParams?.data?.[fieldKey.value])
  return true
}

defineExpose({ refresh })

onMounted(() => {
  const api = props.params?.api
  if (!api) return
  if (props.params?.column?.getActualWidth) {
    columnWidth.value = props.params.column.getActualWidth()
  }
  api.addEventListener('columnResized', handleGridResize)
  api.addEventListener('gridSizeChanged', handleGridResize)
  api.addEventListener('displayedColumnsChanged', handleGridResize)
})

onBeforeUnmount(() => {
  const api = props.params?.api
  if (!api) return
  api.removeEventListener('columnResized', handleGridResize)
  api.removeEventListener('gridSizeChanged', handleGridResize)
  api.removeEventListener('displayedColumnsChanged', handleGridResize)
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
})

function getIndicatorColor(hex) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return '#ffffff'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 170 ? '#6b7280' : '#ffffff'
}
</script>

<template>
  <MultiSelectPopper
    ref="selectRef"
    v-model="selectedValues"
    v-model:options="optionsProxy"
    :placeholder="placeholderText"
    :allow-create="allowCreate"
    :use-fallback-when-empty="useFallbackWhenEmpty"
    :max-visible-tags="maxVisibleTags"
    :available-width="columnWidth"
    @update:modelValue="commitSelection"
  >
    <template v-if="fieldKey === 'tags'" #head="{ selected, remove }">
      <div class="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-500">Selected tags</div>
      <div v-if="selected.length" class="flex flex-wrap gap-1 px-3 pb-2">
        <button
          v-for="tag in selected"
          :key="tag.id"
          type="button"
          class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
          :style="{ backgroundColor: tag.color, color: getIndicatorColor(tag.color) }"
          @click.stop="remove(tag)"
          title="Remove tag"
        >
          <span class="max-w-[120px] truncate">{{ tag.name }}</span>
          <span class="opacity-80">x</span>
        </button>
      </div>
      <div v-else class="px-3 pb-2 text-[11px] text-gray-400">No tags selected.</div>
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
</template>
