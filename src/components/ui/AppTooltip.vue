<script setup>
import { computed, ref, watch } from 'vue'
import Popper from 'vue3-popper'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  placement: {
    type: String,
    default: 'top'
  },
  offsetDistance: {
    type: [Number, String],
    default: 8
  },
  disabled: {
    type: Boolean,
    default: false
  },
  width: {
    type: [Number, String],
    default: null
  },
  minWidth: {
    type: [Number, String],
    default: null
  },
  maxWidth: {
    type: [Number, String],
    default: null
  },
  zIndex: {
    type: [Number, String],
    default: 9999
  }
})

const isOpen = ref(false)

const hasContent = computed(() => Boolean(props.content))
const isDisabled = computed(() => props.disabled || !hasContent.value)
const offsetDistanceValue = computed(() => String(props.offsetDistance))

function normalizeSize(value) {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'number' ? `${value}px` : String(value)
}

const tooltipStyle = computed(() => {
  const width = normalizeSize(props.width)
  const minWidth = normalizeSize(props.minWidth)
  const maxWidth = normalizeSize(props.maxWidth)
  const style = {
    '--app-tooltip-max-width': maxWidth || 'min(320px, calc(100vw - 24px))'
  }

  if (width) {
    style['--app-tooltip-width'] = width
  }
  if (minWidth) {
    style['--app-tooltip-min-width'] = minWidth
  }
  if (maxWidth) {
    style['--app-tooltip-max-width'] = maxWidth
  }

  return style
})

watch(
  () => isDisabled.value,
  (value) => {
    if (value) {
      isOpen.value = false
    }
  }
)

function openTooltip() {
  if (isDisabled.value) return
  isOpen.value = true
}

function closeTooltip() {
  isOpen.value = false
}
</script>

<template>
  <Popper
    class="app-tooltip-popper"
    :style="tooltipStyle"
    :content="content"
    :placement="placement"
    :offset-distance="offsetDistanceValue"
    :interactive="false"
    :show="isOpen"
    :disable-click-away="true"
    :disabled="isDisabled"
    :z-index="zIndex"
    arrow
  >
    <span
      class="app-tooltip-trigger"
      @mouseenter="openTooltip"
      @mouseleave="closeTooltip"
      @focusin="openTooltip"
      @focusout="closeTooltip"
    >
      <slot />
    </span>
  </Popper>
</template>

<style scoped>
.app-tooltip-popper {
  --popper-theme-background-color: #ffffff;
  --popper-theme-background-color-hover: #ffffff;
  --popper-theme-text-color: #374151;
  --popper-theme-border-width: 1px;
  --popper-theme-border-style: solid;
  --popper-theme-border-color: #e5e7eb;
  --popper-theme-border-radius: 6px;
  --popper-theme-padding: 6px 10px;
  --popper-theme-box-shadow: var(--shadow-md);
  font-size: 13px;
  line-height: 1.25;
}

.app-tooltip-trigger {
  display: inline-flex;
}

.app-tooltip-popper :deep(.popper) {
  width: var(--app-tooltip-width, max-content);
  min-width: var(--app-tooltip-min-width, 0);
  max-width: var(--app-tooltip-max-width, min(320px, calc(100vw - 24px)));
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
