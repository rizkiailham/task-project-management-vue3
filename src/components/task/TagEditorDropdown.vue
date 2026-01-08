<script setup>
import { computed, isRef, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TagSelectPopper from '@/components/ui/TagSelectPopper.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const localOptions = ref([])
const selectedTags = ref([])
const tagRef = ref(null)
let resizeRaf = null
const columnWidth = ref(0)

function scheduleRecalc() {
  if (!tagRef.value?.recalc) return
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    tagRef.value?.recalc?.()
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
  const source = props.params?.context?.tagOptions
  if (isRef(source)) return source.value
  if (Array.isArray(source)) return source
  return localOptions.value
}

function setOptionsSource(next) {
  const source = props.params?.context?.tagOptions
  if (isRef(source)) {
    source.value = next
    return
  }
  if (Array.isArray(source)) {
    source.splice(0, source.length, ...next)
    return
  }
  localOptions.value = next
}

const optionsProxy = computed({
  get: () => getOptionsSource(),
  set: (next) => setOptionsSource(next)
})

function syncSelectedTags(nextTags = props.params?.data?.tags) {
  selectedTags.value = Array.isArray(nextTags) ? nextTags : []
}

watch(
  () => props.params?.data?.tags,
  (next) => syncSelectedTags(next),
  { immediate: true, deep: true }
)

function commitTags(next) {
  selectedTags.value = next
  const pathKey = props.params?.data?.pathKey
  props.params.data.tags = next
  props.params.context?.updateField?.(pathKey, 'tags', next)
}

function refresh(nextParams) {
  syncSelectedTags(nextParams?.data?.tags)
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
</script>

<template>
  <TagSelectPopper
    ref="tagRef"
    v-model="selectedTags"
    v-model:options="optionsProxy"
    :placeholder="'Add an option...'"
    :available-width="columnWidth"
    @update:modelValue="commitTags"
  />
</template>
