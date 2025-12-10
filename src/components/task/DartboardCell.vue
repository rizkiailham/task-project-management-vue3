<script setup>
import { computed, ref, watch } from 'vue'
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
const hasChildren = computed(() => props.params?.node?.hasChildren?.() ?? false)

watch(
  () => props.params.value,
  (next) => {
    if (next !== inputValue.value) {
      inputValue.value = next ?? ''
    }
  }
)

function onInput(event) {
  const newValue = event.target.value
  inputValue.value = newValue
  props.params.setValue?.(newValue)
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
    <InputText
      v-model="inputValue"
      :style="inputStyle"
      class="dartboard-input h-8 px-2 py-1 w-auto min-w-0 text-left mr-2"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div class="icon-button mr-1">
    <svg
      class="h-4 w-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3v10.2c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 18 6.12 18 7.8 18H15m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM3 8h12m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    </div>
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
  padding: 4px 2px!important;
  height: 26px!important;
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
  padding: 1px;
}

.icon-button:hover {
  color: #374151;
}
</style>
