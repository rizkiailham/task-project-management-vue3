<script setup>
import { computed, ref, shallowRef, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import FormInput from '@/components/ui/FormInput.vue'
import { ChevronsLeft, ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})



const localParams = shallowRef(props.params)

const inputValue = ref(localParams.value.value ?? '')
const isFocused = ref(false)
const isHovered = ref(false)
const childCount = ref(0)
const showSubtaskSummary = computed(() => childCount.value > 0)

// Expand/collapse state
const hasChildren = computed(() => {
  const p = localParams.value
  const fromData = Array.isArray(p.data?.children) && p.data.children.length > 0
  const fromNode = (p.node?.childrenAfterGroup || []).filter((child) => !child.data?.isPlaceholder).length > 0
  const hasChildrenFlag = p.data?.hasChildren === true
  return fromNode || fromData || hasChildrenFlag
})

const isExpanded = ref(localParams.value.node?.expanded || false)

// Indentation based on level (20px per level like DartAI)
const level = computed(() => localParams.value.node?.level || 0)

const pathKey = computed(() => localParams.value.data?.pathKey || localParams.value.data?.id || localParams.value.data?.title)
const focusKey = computed(() => localParams.value.context?.focusKey?.value || null)

// ...



function syncChildCount(nextParams = localParams.value) {
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

// Input style - dynamic width based on text length
const inputStyle = computed(() => {
  const charWidth = 7
  const padding = 16
  const minWidth = 40
  // Calculate width based on text, let CSS handle overflow
  const calculatedWidth = Math.max(minWidth, (inputValue.value?.length || 1) * charWidth + padding)
  return {
    width: `${calculatedWidth}px`,
    minWidth: `${minWidth}px`
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

const inputRef = ref(null)

function tryFocus() {
  const targetMatches = focusKey.value && (
    focusKey.value === pathKey.value || 
    focusKey.value === props.params?.data?.id
  )
  if (targetMatches) {
    nextTick(() => {
      // Try component ref first
      if (inputRef.value?.focus) {
        inputRef.value.focus()
        return
      }
      
      // Fallback to DOM ID
      const attemptFocus = (attempts = 0) => {
        const input = document.getElementById(`dartboard-input-${pathKey.value}`)
        if (input) {
          input.focus()
          input.select?.()
          return
        }
        if (attempts < 5) {
          requestAnimationFrame(() => attemptFocus(attempts + 1))
        }
      }
      attemptFocus()
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
  localParams.value = nextParams
  inputValue.value = nextParams.value ?? ''
  isExpanded.value = nextParams.node?.expanded || false
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
    if (event?.type === 'rowGroupOpened') {
      // Check if this node was involved or just refresh state
      if (event.node === props.params.node) {
        isExpanded.value = props.params.node.expanded
      }
    }
  }
  api.addEventListener('modelUpdated', handler)
  api.addEventListener('rowDataUpdated', handler)
  api.addEventListener('rowGroupOpened', handler)
  modelListenerCleanup = () => {
    api.removeEventListener('modelUpdated', handler)
    api.removeEventListener('rowDataUpdated', handler)
    api.removeEventListener('rowGroupOpened', handler)
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
    <!-- Expand/Collapse Chevron -->
    <div
      class="dart-subtask-expand flex-shrink-0 rounded cursor-pointer hover:bg-gray-900/10 dark:hover:bg-white/10"
      :class="{
        'opacity-100': hasChildren || isHovered,
        'opacity-0': !hasChildren && !isHovered
      }"
      @click.stop="toggleExpand"
      :title="hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'Add subtask'"
    >
      <component
        :is="isExpanded ? ChevronDown : ChevronRight"
        class="w-5 h-5 text-gray-400"
      />
    </div>

    <!-- Title and subtask group - these stay together, with overflow clipping -->
    <div class="flex items-center gap-1 flex-shrink min-w-0 overflow-hidden">
      <FormInput
        ref="inputRef"
        v-model="inputValue"
        :style="inputStyle"
        :id="`dartboard-input-${pathKey.value}`"
        label="Task title"
        labelClass="sr-only"
        wrapperClass="min-w-0"
        class="dartboard-input h-7 px-1.5 py-1 w-auto min-w-0 text-left"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @input="onInput"
        @keydown="onKeydown"
        @blur.capture="handleBlur"
      />

      <!-- task info - subtask count hugs the input -->
      <button
        v-if="showSubtaskSummary"
        class="icon-button flex-shrink-0"
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
        <div class="pl-1">0/{{ childCount }}</div>
      </button>
    </div>

    <!-- open detail - pushed to far right, always present but visible only on hover -->
    <button
      class="icon-button open-button flex-shrink-0 ml-auto"
      :class="{ 'opacity-0': !isHovered, 'opacity-100': isHovered }"
      type="button"
      aria-label="Open details"
      @click.stop="openSidebar"
    >
      <ChevronsLeft class="h-4 w-4" />
      <span class="open-text">Open</span>
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
  overflow: hidden!important;
  text-overflow: ellipsis!important;
  white-space: nowrap!important;
  flex-shrink: 1!important;
  max-width: 100%!important;
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
  color: var(--color-gray-500);
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
  color: var(--color-gray-700);
}

.dartboard-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  width: 100%;
  min-width: 0; /* allow input to shrink before icons are compressed */
  padding-right: 8px; /* Add padding for the open button */
}

.open-button {
  gap: 2px;
  transition: opacity 0.15s ease;
}

.open-text {
  display: none;
  font-size: 11px;
  font-weight: var(--font-weight-medium);
}

@media (min-width: 640px) {
  .open-text {
    display: inline;
  }
}

</style>




