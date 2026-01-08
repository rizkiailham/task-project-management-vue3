<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import InputText from 'primevue/inputtext'
import { ChevronsLeft } from 'lucide-vue-next'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const inputValue = ref(props.params.value ?? '')
const isFocused = ref(false)
const isHovered = ref(false)
const level = computed(() => props.params?.node?.level || 0)
const pathKey = computed(() => props.params?.data?.pathKey || props.params?.data?.id || props.params?.data?.title)
const focusKey = computed(() => props.params?.context?.focusKey?.value || null)
const childCount = ref(0)
const showSubtaskSummary = computed(() => childCount.value > 0)

function syncChildCount(nextParams = props.params) {
  const nonPlaceholder = (nextParams?.node?.childrenAfterGroup || []).filter((child) => !child.data?.isPlaceholder)
  const fromNode = nonPlaceholder.length
  const fromData = Array.isArray(nextParams?.data?.children) ? nextParams.data.children.length : 0
  // Use hasChildren flag as additional source of truth
  const hasChildrenFlag = nextParams?.data?.hasChildren === true
  // Take the maximum value to ensure we show the count immediately after adding
  childCount.value = Math.max(fromNode, fromData, hasChildrenFlag ? 1 : 0)
}

watch(
  () => props.params?.data?.children?.length,
  () => syncChildCount(),
  { immediate: true }
)

watch(
  () => props.params?.node?.childrenAfterGroup?.length,
  () => syncChildCount(),
  { immediate: true, deep: true }
)

watch(
  () => props.params?.data?.hasChildren,
  () => syncChildCount(),
  { immediate: true }
)

watch(
  () => props.params.value,
  (next) => {
    if (next !== inputValue.value) {
      inputValue.value = next ?? ''
    }
  }
)

watch(
  () => props.params?.data?.title,
  (next) => {
    if (next !== undefined && next !== inputValue.value) {
      inputValue.value = next ?? ''
    }
  }
)

function onInput(event) {
  const newValue = event.target.value
  inputValue.value = newValue
  if (props.params?.context?.updateTitle) {
    props.params.context.updateTitle(pathKey.value, newValue)
  } else {
    props.params.setValue?.(newValue)
  }
}

const inputStyle = computed(() => {
  const text = inputValue.value || ''
  // Use a clamped width so long titles don't crush icons, but short titles stay tidy
  const minCh = 10
  const maxCh = 48
  const charCount = Math.min(Math.max(text.length || minCh, minCh), maxCh)
  return {
    width: `${charCount + 1}ch`,
    minWidth: `${minCh}ch`,
    maxWidth: `${maxCh}ch`,
    flex: '1 1 auto'
  }
})

function onKeydown(event) {
  if (event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
    // Keep Ctrl+A selection inside the input instead of triggering grid selection
    event.stopPropagation()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    commitTitle()
    // Blur to signal save/commit and close editing
    event.target?.blur?.()
  }
}

function toggleExpand() {
  if (hasChildren.value) {
    props.params.node.setExpanded(!props.params.node.expanded)
    return
  }
  props.params?.context?.addSubtask?.(pathKey.value)
}

function toggleSelect() {
  const selected = props.params.node.isSelected?.()
  props.params.node.setSelected?.(!selected)
}

function commitTitle() {
  props.params?.context?.handleCommit?.(pathKey.value)
  // Re-sync child count in case a new subtask was added and committed
  syncChildCount()
}

function handleBlur() {
  props.params?.context?.handleCommit?.(pathKey.value)
}

function tryFocus() {
  if (focusKey.value && focusKey.value === pathKey.value) {
    let attempts = 0
    const attemptFocus = () => {
      const input = document.getElementById(`dartboard-input-${pathKey.value}`)
      if (input) {
        input.focus()
        input.select?.()
        return
      }
      attempts += 1
      if (attempts < 5) {
        requestAnimationFrame(attemptFocus)
      }
    }
    nextTick(() => {
      requestAnimationFrame(attemptFocus)
    })
  }
}

watch(focusKey, tryFocus, { immediate: true })

function openSidebar() {
  props.params.api?.dispatchEvent?.({
    type: 'openDartboardSidebar',
    data: props.params.data
  })
}

function refresh(nextParams) {
  inputValue.value = nextParams.value ?? ''
  syncChildCount(nextParams)
  return true // tell ag-Grid to reuse this component, keeping focus
}

// Keep child count in sync with any grid model updates (sort, filter, add child, etc.)
let modelListenerCleanup = null
onMounted(() => {
  const api = props.params?.api
  if (!api) return
  const handler = (event) => {
    if (event?.type === 'modelUpdated' || event?.type === 'rowDataUpdated') {
      syncChildCount()
    }
  }
  api.addEventListener('modelUpdated', handler)
  api.addEventListener('rowDataUpdated', handler)
  modelListenerCleanup = () => {
    api.removeEventListener('modelUpdated', handler)
    api.removeEventListener('rowDataUpdated', handler)
  }
})

onBeforeUnmount(() => {
  modelListenerCleanup?.()
})

defineExpose({ refresh })
</script>

<template>
  <div
    class="dartboard-cell w-full h-full flex items-center gap-1"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <InputText
      v-model="inputValue"
      :style="inputStyle"
      :id="`dartboard-input-${pathKey.value}`"
      class="dartboard-input h-7 px-1.5 py-1 w-auto min-w-0 text-left min-w-[60px]"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @input="onInput"
      @keydown="onKeydown"
      @blur.capture="handleBlur"
    />

    <!-- task info -->
    <button
      v-if="showSubtaskSummary"
      class="icon-button mr-1"
      type="button"
      aria-label="Add subtask"
      @click.stop="() => props.params?.context?.addSubtask?.(pathKey.value)"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        class="icon-xs"
      >
        <path
          d="M3 3v10.2c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 18 6.12 18 7.8 18H15m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM3 8h12m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div class="pl-1">{{ childCount }}</div>
    </button>
    <!-- open detail - always show on hover for all tasks -->
    <button
      v-show="isHovered || showSubtaskSummary"
      class="icon-button"
      type="button"
      aria-label="Open details"
      @click.stop="openSidebar"
    >
      <ChevronsLeft class="h-4 w-4" />
    </button>
  </div>
</template>

<style>
.dartboard-input.p-inputtext {
  border: 1px solid transparent!important;
  box-shadow: none!important;
  font-size: 12px!important;
  padding: 2px 8px!important;
  height: 24px!important;
  line-height: 20px!important;
  background-color: transparent!important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}

.dartboard-input.p-inputtext:hover {
  box-shadow: none!important;
  border-color: grey!important;
  background-color: transparent!important;

}

.dartboard-input.p-inputtext:focus {
  box-shadow: none!important;
  border-color: grey!important;
}

.dartboard-text {
  display: block;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px!important;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  padding: 2px;
  height: 24px;
  min-height: 24px;
  min-width: 26px;
  font-size: 12px;
  flex-shrink: 0;
}

.icon-button svg {
  display: block;
  flex-shrink: 0;
}

.icon-button:hover {
  color: #374151;
}

.dartboard-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  width: 100%;
  min-width: 0; /* allow input to shrink before icons are compressed */
}

</style>
