<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
const rootRef = ref(null)
const popperNode = ref(null)
const popperParent = ref(null)
const instanceId = `app-tooltip-${Math.random().toString(36).slice(2, 9)}`

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
      restorePopper()
    }
  }
)

function applyFloatingStyle(node) {
  if (!node) return
  node.style.zIndex = String(props.zIndex || 9999)
  const width = normalizeSize(props.width)
  const minWidth = normalizeSize(props.minWidth)
  const maxWidth = normalizeSize(props.maxWidth)
  node.style.width = width || 'max-content'
  node.style.minWidth = minWidth || '0'
  node.style.maxWidth = maxWidth || 'min(320px, calc(100vw - 24px))'
  node.style.pointerEvents = 'none'
  node.style.whiteSpace = 'normal'
  node.style.overflowWrap = 'anywhere'
  node.style.wordBreak = 'break-word'
  node.style.fontSize = '13px'
  node.style.lineHeight = '1.25'
  node.style.setProperty('--popper-theme-background-color', '#ffffff')
  node.style.setProperty('--popper-theme-background-color-hover', '#ffffff')
  node.style.setProperty('--popper-theme-text-color', '#374151')
  node.style.setProperty('--popper-theme-border-width', '1px')
  node.style.setProperty('--popper-theme-border-style', 'solid')
  node.style.setProperty('--popper-theme-border-color', '#e5e7eb')
  node.style.setProperty('--popper-theme-border-radius', '6px')
  node.style.setProperty('--popper-theme-padding', '6px 10px')
  node.style.setProperty('--popper-theme-box-shadow', 'var(--shadow-md)')
  node.dataset.appTooltipOwner = instanceId
}

function movePopperToBody() {
  if (!rootRef.value) return
  const nextPopperNode = rootRef.value.querySelector('.popper')
  if (!nextPopperNode) return

  // Defensive cleanup in case stale floating nodes were left behind
  document.querySelectorAll(`.popper[data-app-tooltip-owner="${instanceId}"]`).forEach((node) => {
    if (node !== nextPopperNode && node.parentElement) {
      node.parentElement.removeChild(node)
    }
  })

  popperNode.value = nextPopperNode
  popperParent.value = nextPopperNode.parentElement
  applyFloatingStyle(nextPopperNode)

  if (nextPopperNode.parentElement !== document.body) {
    document.body.appendChild(nextPopperNode)
  }

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

function restorePopper() {
  if (!popperNode.value || !popperParent.value) return
  if (popperNode.value.parentElement !== popperParent.value) {
    popperParent.value.appendChild(popperNode.value)
  }
  if (popperNode.value?.dataset) {
    delete popperNode.value.dataset.appTooltipOwner
  }
}

function openTooltip() {
  if (isDisabled.value) return
  isOpen.value = true
}

function closeTooltip() {
  isOpen.value = false
}

function handleOpen() {
  nextTick(() => {
    movePopperToBody()
  })
}

function handleClose() {
  restorePopper()
}

onBeforeUnmount(() => {
  restorePopper()
})
</script>

<template>
  <div ref="rootRef" class="app-tooltip-root">
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
      @open:popper="handleOpen"
      @close:popper="handleClose"
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
  </div>
</template>

<style scoped>
.app-tooltip-root {
  display: inline-flex;
  align-items: center;
  height: 100%;
}

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
  align-items: center;
  height: 100%;
  line-height: 1;
  vertical-align: middle;
}

.app-tooltip-popper :deep(.popper) {
  width: var(--app-tooltip-width, max-content);
  min-width: var(--app-tooltip-min-width, 0);
  max-width: var(--app-tooltip-max-width, min(320px, calc(100vw - 24px)));
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  pointer-events: none;
}

.app-tooltip-root :deep(.inline-block) {
  display: inline-flex !important;
  align-items: center !important;
  height: 100% !important;
  line-height: 1 !important;
  vertical-align: middle !important;
}
</style>
