<script setup>
import { computed, ref, watch, nextTick } from 'vue'
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
  const minChars = 0
  const maxChars = 9999
  const charCount = Math.min(Math.max(text.length || 1, minChars), maxChars)
  return { width: `${charCount + 0.7}ch` }
})

function onKeydown(event) {
  if (event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
    // Keep Ctrl+A selection inside the input instead of triggering grid selection
    event.stopPropagation()
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

function handleBlur() {
  props.params?.context?.handleCommit?.(pathKey.value)
}

function tryFocus() {
  if (focusKey.value && focusKey.value === pathKey.value) {
    nextTick(() => {
      const input = document.getElementById(`dartboard-input-${pathKey.value}`)
      input?.focus()
      input?.select?.()
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
  return true // tell ag-Grid to reuse this component, keeping focus
}

defineExpose({ refresh })
</script>

<template>
  <div
    class="dartboard-cell w-full h-full flex items-center"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <span class="indent" :style="{ width: `${Math.max(0, level.value) * 12}px` }"></span>
    <InputText
      v-model="inputValue"
      :style="inputStyle"
      :id="`dartboard-input-${pathKey.value}`"
      class="dartboard-input h-7 px-2 py-1 w-auto min-w-0 text-left mr-2"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @input="onInput"
      @keydown="onKeydown"
      @blur.capture="handleBlur"
    />
    <button class="icon-button mr-1" type="button" aria-label="Add subtask" @click.stop="() => props.params?.context?.addSubtask?.(pathKey.value)">
      <svg
        class="h-4 w-4 text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
      <path
        d="M12 5v14m7-7H5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    </button>
    <button class="icon-button" type="button" aria-label="Open details" @click.stop="openSidebar">
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
  padding: 0;
  height: 24px;
  min-height: 24px;
  width: 26px;
  min-width: 26px;
}

.icon-button svg {
  display: block;
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
}

.indent {
  flex: 0 0 auto;
}
</style>
