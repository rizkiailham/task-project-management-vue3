<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Popper from 'vue3-popper'
import ColorPicker from '@/components/ui/ColorPicker.vue'

const defaultOptions = [
  { id: 'product', name: 'Product', color: '#3b82f6' },
  { id: 'design', name: 'Design', color: '#8b5cf6' },
  { id: 'engineering', name: 'Engineering', color: '#f97316' },
  { id: 'bug', name: 'Bug', color: '#ef4444' }
]

const palette = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#10b981',
  '#ef4444',
  '#0ea5e9',
  '#f59e0b'
]

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: null
  },
  placeholder: {
    type: String,
    default: 'Add an option...'
  },
  allowCreate: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placement: {
    type: String,
    default: 'bottom-start'
  },
  offsetDistance: {
    type: Number,
    default: 8
  },
  useFallbackWhenEmpty: {
    type: Boolean,
    default: true
  },
  availableWidth: {
    type: Number,
    default: null
  },
  maxVisibleTags: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'update:options', 'change', 'create'])

const localOptions = ref(normalizeOptions(defaultOptions))
const optionsRef = ref([])
const currentPlacement = ref(props.placement)
const offsetDistanceValue = computed(() => String(props.offsetDistance))

const isExternalOptions = computed(() => Array.isArray(props.options))

watch(
  () => props.options,
  (next) => {
    if (Array.isArray(next)) {
      optionsRef.value = normalizeOptions(next)
      return
    }
    optionsRef.value = normalizeOptions(localOptions.value)
  },
  { immediate: true, deep: true }
)

const availableOptions = computed(() => {
  if (optionsRef.value.length) return optionsRef.value
  if (props.useFallbackWhenEmpty) return normalizeOptions(defaultOptions)
  return optionsRef.value
})

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tag'
}

function colorFromName(name) {
  const str = String(name || '')
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}

function normalizeOption(option) {
  if (!option) return null
  if (typeof option === 'string') {
    const name = option
    return { id: slugify(name), name, color: colorFromName(name) }
  }
  if (typeof option === 'object') {
    const name = option.name || option.label || option.value || option.id || ''
    if (!name) return null
    return {
      id: option.id || slugify(name),
      name,
      color: option.color || colorFromName(name)
    }
  }
  return null
}

function normalizeOptions(list) {
  return (Array.isArray(list) ? list : []).map(normalizeOption).filter(Boolean)
}

function setOptionsSource(next) {
  optionsRef.value = next
  if (isExternalOptions.value) {
    emit('update:options', next)
    return
  }
  localOptions.value = next
}

function findOptionByName(name) {
  return availableOptions.value.find((opt) => opt.name.toLowerCase() === String(name || '').toLowerCase())
}

function findOptionById(id) {
  return availableOptions.value.find((opt) => opt.id === id)
}

function normalizeTag(tag) {
  if (!tag) return null
  if (typeof tag === 'string') {
    const match = findOptionByName(tag)
    return match || { id: slugify(tag), name: tag, color: colorFromName(tag) }
  }
  if (typeof tag === 'object') {
    const name = tag.name || tag.label || tag.value || tag.id || ''
    const match = findOptionById(tag.id) || findOptionByName(name)
    return {
      id: tag.id || match?.id || slugify(name),
      name: match?.name || name,
      color: tag.color || match?.color || colorFromName(name)
    }
  }
  return null
}

function normalizeTags(list) {
  return (Array.isArray(list) ? list : []).map(normalizeTag).filter(Boolean)
}

const selectedTags = ref([])
const tagListRef = ref(null)
const measureRef = ref(null)
const visibleCount = ref(0)
const newOptionName = ref('')
const inputRef = ref(null)
const rootRef = ref(null)
const triggerRef = ref(null)
const chevronRef = ref(null)
const popperNode = ref(null)
const popperParent = ref(null)
const isOpen = ref(false)
let overflowRaf = null

const maxVisibleLimit = computed(() =>
  Number.isFinite(props.maxVisibleTags) && props.maxVisibleTags > 0 ? props.maxVisibleTags : Number.POSITIVE_INFINITY
)

const tagsForMeasure = computed(() => selectedTags.value.slice(0, maxVisibleLimit.value))

const displayTags = computed(() => tagsForMeasure.value.slice(0, visibleCount.value))

const overflowCount = computed(() => Math.max(0, selectedTags.value.length - visibleCount.value))

const countFits = ref(false)

const showCount = computed(() => overflowCount.value > 0 && (visibleCount.value === 0 || countFits.value))

const countValue = computed(() => overflowCount.value)

function ensureOptionsFromTags(tags) {
  const nextOptions = [...availableOptions.value]
  let changed = false
  for (const tag of tags) {
    if (!findOptionById(tag.id) && !findOptionByName(tag.name)) {
      nextOptions.push(tag)
      changed = true
    }
  }
  if (changed) setOptionsSource(nextOptions)
}

function syncSelectedTags(nextTags = props.modelValue) {
  selectedTags.value = normalizeTags(nextTags)
  ensureOptionsFromTags(selectedTags.value)
  nextTick(() => {
    scheduleOverflowCheck()
  })
}

watch(
  () => props.modelValue,
  (next) => syncSelectedTags(next),
  { immediate: true, deep: true }
)

watch(
  () => availableOptions.value,
  () => syncSelectedTags(props.modelValue),
  { deep: true }
)

function updateOverflow() {
  const measureEl = measureRef.value
  const listEl = tagListRef.value
  if (!measureEl || !listEl) return
  const totalCount = selectedTags.value.length
  if (!totalCount) {
    visibleCount.value = 0
    countFits.value = false
    return
  }

  const getWidth = (el) => (el ? el.getBoundingClientRect().width : 0)
  let availableWidth = 0

  if (Number.isFinite(props.availableWidth) && props.availableWidth > 0) {
    const tagAreaPadding = 30
    availableWidth = props.availableWidth - tagAreaPadding
  }

  if (availableWidth <= 0 && rootRef.value?.closest) {
    const cell = rootRef.value.closest('.ag-cell')
    if (cell) {
      availableWidth = getWidth(cell) - 16
    }
  }

  if (availableWidth <= 0) {
    const listWidth = getWidth(listEl)
    if (listWidth > 0) {
      availableWidth = listWidth
    }
  }

  if (availableWidth <= 0) {
    const triggerWidth = getWidth(triggerRef.value)
    if (triggerWidth > 0) {
      const triggerStyle = window.getComputedStyle(triggerRef.value)
      const paddingLeft = parseFloat(triggerStyle.paddingLeft || '0') || 0
      const paddingRight = parseFloat(triggerStyle.paddingRight || '0') || 0
      const triggerGap = parseFloat(triggerStyle.columnGap || triggerStyle.gap || '0') || 0
      const chevronWidth = getWidth(chevronRef.value)
      availableWidth = triggerWidth - paddingLeft - paddingRight - triggerGap - chevronWidth
    }
  }

  availableWidth = Math.max(0, availableWidth)
  if (availableWidth <= 0) {
    visibleCount.value = Math.min(totalCount, 1)
    countFits.value = false
    return
  }

  const style = window.getComputedStyle(listEl)
  const gap = parseFloat(style.columnGap || style.gap || '0') || 0
  const tagEls = Array.from(measureEl.querySelectorAll('[data-tag-measure]'))
  const countEl = measureEl.querySelector('[data-count-measure]')
  const tagWidths = tagEls.map((el) => {
    const rectWidth = el.getBoundingClientRect().width
    return rectWidth > 0 ? rectWidth : el.scrollWidth
  })
  if (tagWidths.length === 0 || Math.max(...tagWidths) === 0) {
    visibleCount.value = Math.min(totalCount, 1)
    countFits.value = false
    return
  }

  const measureCountWidth = (count) => {
    if (!countEl) return 0
    countEl.textContent = `+${count}`
    return countEl.getBoundingClientRect().width
  }

  const computeVisibleNoCount = () => {
    let used = 0
    let visible = 0
    for (let i = 0; i < tagWidths.length; i += 1) {
      const tagWidth = tagWidths[i]
      const nextUsed = used + (visible > 0 ? gap : 0) + tagWidth
      if (nextUsed <= availableWidth) {
        visible += 1
        used = nextUsed
        continue
      }
      break
    }
    return visible
  }

  const computeVisible = (countWidth) => {
    let used = 0
    let visible = 0
    for (let i = 0; i < tagWidths.length; i += 1) {
      const tagWidth = tagWidths[i]
      const nextUsed = used + (visible > 0 ? gap : 0) + tagWidth
      const remaining = totalCount - (visible + 1)
      if (remaining > 0) {
        const withCount = nextUsed + gap + countWidth
        if (withCount <= availableWidth) {
          visible += 1
          used = nextUsed
          continue
        }
        break
      }
      if (nextUsed <= availableWidth) {
        visible += 1
        used = nextUsed
      }
      break
    }
    return visible
  }

  const visibleNoCount = computeVisibleNoCount()
  if (visibleNoCount === 0) {
    const countWidth = measureCountWidth(totalCount)
    visibleCount.value = 0
    countFits.value = countWidth > 0 && countWidth <= availableWidth
    return
  }

  if (totalCount <= visibleNoCount) {
    visibleCount.value = totalCount
    countFits.value = false
    return
  }

  let countWidth = measureCountWidth(totalCount)
  let visible = computeVisible(countWidth)
  for (let i = 0; i < 2; i += 1) {
    const remaining = Math.max(0, totalCount - visible)
    const nextCountWidth = remaining > 0 ? measureCountWidth(remaining) : 0
    const nextVisible = computeVisible(nextCountWidth)
    if (nextVisible === visible) break
    visible = nextVisible
    countWidth = nextCountWidth
  }

  if (visible > 0) {
    visibleCount.value = Math.min(visible, totalCount)
    countFits.value = true
    return
  }

  visibleCount.value = Math.min(visibleNoCount, totalCount)
  countFits.value = false
}

function scheduleOverflowCheck() {
  if (overflowRaf) return
  overflowRaf = requestAnimationFrame(() => {
    overflowRaf = null
    updateOverflow()
  })
}

watch([selectedTags, () => props.maxVisibleTags], scheduleOverflowCheck, { deep: true })
watch(() => props.availableWidth, scheduleOverflowCheck)

watch(
  () => [tagListRef.value, measureRef.value],
  () => scheduleOverflowCheck()
)

let resizeObserver = null
let observedCell = null

function observeSizeTargets() {
  if (typeof ResizeObserver === 'undefined') return
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => scheduleOverflowCheck())
  }
  if (tagListRef.value) {
    resizeObserver.observe(tagListRef.value)
  }
  if (triggerRef.value) {
    resizeObserver.observe(triggerRef.value)
  }
  if (rootRef.value) {
    resizeObserver.observe(rootRef.value)
  }
  const cell = rootRef.value?.closest?.('.ag-cell') || null
  if (cell && cell !== observedCell) {
    if (observedCell) resizeObserver.unobserve(observedCell)
    resizeObserver.observe(cell)
    observedCell = cell
  }
}

onMounted(() => {
  scheduleOverflowCheck()
  if (typeof ResizeObserver !== 'undefined') {
    observeSizeTargets()
  } else {
    window.addEventListener('resize', scheduleOverflowCheck)
  }
})

watch(
  () => rootRef.value,
  () => {
    observeSizeTargets()
    scheduleOverflowCheck()
  }
)

defineExpose({ recalc: scheduleOverflowCheck })

function commitTags(next) {
  selectedTags.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

function isSelected(option) {
  return selectedTags.value.some((tag) => tag.id === option.id || tag.name === option.name)
}

function toggleOption(option) {
  if (!option) return
  if (isSelected(option)) {
    commitTags(selectedTags.value.filter((tag) => tag.id !== option.id && tag.name !== option.name))
  } else {
    commitTags([...selectedTags.value, option])
  }
}

function removeTag(tag) {
  commitTags(selectedTags.value.filter((t) => t.id !== tag.id && t.name !== tag.name))
}

function ensureUniqueId(baseId) {
  let id = baseId || 'tag'
  let count = 1
  while (findOptionById(id)) {
    id = `${baseId}-${count}`
    count += 1
  }
  return id
}

const floatingVars = {
  '--popper-theme-background-color': '#ffffff',
  '--popper-theme-background-color-hover': '#ffffff',
  '--popper-theme-border-width': '1px',
  '--popper-theme-border-style': 'solid',
  '--popper-theme-border-color': '#e5e7eb',
  '--popper-theme-border-radius': '12px',
  '--popper-theme-padding': '0px',
  '--popper-theme-box-shadow': '0 18px 28px -18px rgba(15, 23, 42, 0.4)'
}

function applyFloatingVars(node) {
  if (!node) return
  Object.entries(floatingVars).forEach(([key, value]) => {
    node.style.setProperty(key, value)
  })
  node.style.zIndex = '9999'
}

function movePopperToBody() {
  if (!rootRef.value) return
  const popperEl = rootRef.value.querySelector('.popper')
  if (!popperEl) return
  popperNode.value = popperEl
  popperParent.value = popperEl.parentElement
  applyFloatingVars(popperEl)
  if (popperEl.parentElement !== document.body) {
    document.body.appendChild(popperEl)
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
}

function toggleDropdown() {
  if (props.disabled) return
  if (!isOpen.value) {
    updatePlacement()
  }
  isOpen.value = !isOpen.value
}

function updatePlacement() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const minHeight = 300 // Estimated max height of dropdown

  // If strict placement is not needed, flip if tight
  if (props.placement.includes('bottom') && spaceBelow < minHeight && spaceAbove > spaceBelow) {
    currentPlacement.value = props.placement.replace('bottom', 'top')
  } else if (props.placement.includes('top') && spaceAbove < minHeight && spaceBelow > spaceAbove) {
    currentPlacement.value = props.placement.replace('top', 'bottom')
  } else {
    currentPlacement.value = props.placement
  }
}

function closeDropdown() {
  isOpen.value = false
}

function handleDocumentClick(event) {
  const target = event.target
  if (rootRef.value?.contains(target)) return
  if (triggerRef.value?.contains(target)) return
  if (popperNode.value?.contains(target)) return
  closeDropdown()
}

function handleEscape(event) {
  if (event.key === 'Escape') closeDropdown()
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('mousedown', handleDocumentClick)
    document.removeEventListener('keydown', handleEscape)
  }
})

watch(
  () => props.disabled,
  (next) => {
    if (next) closeDropdown()
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
  restorePopper()
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', scheduleOverflowCheck)
  if (overflowRaf) cancelAnimationFrame(overflowRaf)
})
function handleOpen() {
  nextTick(() => {
    movePopperToBody()
    if (props.allowCreate) {
      inputRef.value?.focus?.()
    }
  })
}

function handleClose() {
  newOptionName.value = ''
  restorePopper()
}

function createOption() {
  const name = newOptionName.value.trim()
  if (!name) return
  const existing = findOptionByName(name)
  if (existing) {
    if (!isSelected(existing)) {
      commitTags([...selectedTags.value, existing])
    }
    newOptionName.value = ''
    return
  }
  const baseId = slugify(name)
  const option = {
    id: ensureUniqueId(baseId),
    name,
    color: colorFromName(name)
  }
  const nextOptions = [...availableOptions.value, option]
  setOptionsSource(nextOptions)
  commitTags([...selectedTags.value, option])
  emit('create', option)
  newOptionName.value = ''
}

function updateOptionColor(optionId, color) {
  const nextOptions = availableOptions.value.map((opt) =>
    opt.id === optionId ? { ...opt, color } : opt
  )
  setOptionsSource(nextOptions)
  const hasSelection = selectedTags.value.some((tag) => tag.id === optionId)
  if (hasSelection) {
    const nextTags = selectedTags.value.map((tag) =>
      tag.id === optionId ? { ...tag, color } : tag
    )
    commitTags(nextTags)
  }
}

function handleOptionClick(option, event) {
  if (event?.target?.closest?.('.option-actions')) return
  toggleOption(option)
}

function getTextColor(hex) {
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
  <div ref="rootRef" class="tag-select" @mousedown.stop @click.stop>
    <Popper
      class="tag-select-popper"
      :placement="currentPlacement"
      :offset-distance="offsetDistanceValue"
      :interactive="true"
      :disabled="disabled"
      :disable-click-away="true"
      :show="isOpen"
      :z-index="9999"
      @open:popper="handleOpen"
      @close:popper="handleClose"
    >
      <button
        ref="triggerRef"
        type="button"
        class="tag-trigger"
        :class="disabled ? 'tag-trigger-disabled' : ''"
        :disabled="disabled"
        @click.stop="toggleDropdown"
        @keydown.enter.prevent="toggleDropdown"
        @keydown.space.prevent="toggleDropdown"
      >
        <div ref="tagListRef" class="tag-list">
          <span
            v-if="selectedTags.length === 0"
            class="tag-placeholder"
          >
            {{ placeholder }}
          </span>
          <span
            v-for="tag in displayTags"
            :key="tag.id"
            class="tag-pill"
            :style="{ backgroundColor: tag.color, color: getTextColor(tag.color) }"
          >
            <span class="tag-name">{{ tag.name }}</span>
            <span
              class="tag-remove"
              :style="{ color: getTextColor(tag.color) }"
              @click.stop="removeTag(tag)"
              role="button"
              tabindex="-1"
            >
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3l6 6M9 3L3 9" stroke-linecap="round" />
              </svg>
            </span>
          </span>
          <span v-if="showCount" class="tag-count">
            +{{ countValue }}
          </span>
          <div ref="measureRef" class="tag-measure" aria-hidden="true">
            <span
              v-for="tag in tagsForMeasure"
              :key="`measure-${tag.id}`"
              class="tag-pill"
              data-tag-measure
            >
              <span class="tag-name">{{ tag.name }}</span>
              <span class="tag-remove">
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3l6 6M9 3L3 9" stroke-linecap="round" />
                </svg>
              </span>
            </span>
            <span class="tag-count" data-count-measure>+0</span>
          </div>
        </div>
        <span ref="chevronRef" class="chevron-spacer" aria-hidden="true"></span>
      </button>

      <template #content>
        <div class="tag-panel">
          <slot
            v-if="$slots.head"
            name="head"
            :selected="selectedTags"
            :remove="removeTag"
            :toggle="toggleOption"
          />
          <slot
            v-else-if="$slots['selected-items']"
            name="selected-items"
            :selected="selectedTags"
            :remove="removeTag"
            :toggle="toggleOption"
          />
          <div v-if="allowCreate" class="panel-header">
            <input
              ref="inputRef"
              v-model="newOptionName"
              type="text"
              class="panel-input"
              :placeholder="placeholder"
              @keydown.enter.prevent="createOption"
              :disabled="disabled"
            />
            <button
              type="button"
              class="add-btn"
              @click.stop="createOption"
              :disabled="disabled"
            >
              +
            </button>
          </div>

          <div class="option-list">
            <div
              v-for="option in availableOptions"
              :key="option.id"
              class="option-row"
              :class="[
                isSelected(option) ? 'option-row-selected' : '',
                disabled ? 'option-row-disabled' : ''
              ]"
              @click.stop="disabled ? null : handleOptionClick(option, $event)"
              role="button"
              tabindex="0"
            >
              <span
                class="option-pill"
                :style="{ backgroundColor: option.color, color: getTextColor(option.color) }"
              >
                {{ option.name }}
              </span>
              <div class="option-actions">
                <Popper
                  class="tag-color-popper"
                  placement="right-start"
                  offset-distance="10"
                  :interactive="true"
                  :disabled="disabled"
                >
                  <button
                    type="button"
                    class="option-more"
                    :disabled="disabled"
                    aria-label="Edit tag color"
                    title="Edit tag color"
                  >
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                      <circle cx="4" cy="10" r="1.5"></circle>
                      <circle cx="10" cy="10" r="1.5"></circle>
                      <circle cx="16" cy="10" r="1.5"></circle>
                    </svg>
                  </button>
                  <template #content>
                    <div class="color-panel">
                      <ColorPicker
                        :modelValue="option.color"
                        @update:modelValue="(color) => updateOptionColor(option.id, color)"
                      >
                        <template v-if="$slots['color-picker-selected-item']" #selected-item="slotProps">
                          <slot name="color-picker-selected-item" v-bind="slotProps" :option="option" />
                        </template>
                      </ColorPicker>
                    </div>
                  </template>
                </Popper>
              </div>
            </div>

            <div v-if="availableOptions.length === 0" class="option-empty">
              No tags yet.
            </div>
          </div>
        </div>
      </template>
    </Popper>
  </div>
</template>

<style scoped>
.tag-select {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  min-width: 0;
}

.tag-select-popper {
  --popper-theme-background-color: #ffffff;
  --popper-theme-background-color-hover: #ffffff;
  --popper-theme-border-width: 1px;
  --popper-theme-border-style: solid;
  --popper-theme-border-color: #e5e7eb;
  --popper-theme-border-radius: 12px;
  --popper-theme-padding: 0px;
  --popper-theme-box-shadow: 0 18px 28px -18px rgba(15, 23, 42, 0.4);
  display: block;
}

.tag-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  flex: 1 1 auto;
  min-height: 28px;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  outline: none;
  user-select: none;
  overflow: hidden;
  min-width: 0;
}

.tag-trigger:hover {
  border-color: #e5e7eb;
  background-color: transparent;
}

.tag-trigger-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tag-list {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  max-width: 100%;
  position: relative;
}

.tag-placeholder {
  font-size: 12px;
  color: #9ca3af;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  height: 22px;
  max-width: 160px;
  flex: 0 1 auto;
  min-width: 0;
  flex-shrink: 0;
}

.tag-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  height: 22px;
  color: #6b7280;
  flex-shrink: 0;
}

.tag-measure {
  position: absolute;
  left: -9999px;
  top: 0;
  overflow: visible;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tag-name {
  max-width: 120px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  opacity: 0.9;
  padding: 0;
  border: 0;
  background: transparent;
  outline: none;
}

.chevron-spacer {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.tag-panel {
  /* width: 280px;
  max-width: 320px; */
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.panel-input {
  flex: 1;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  padding: 6px 8px;
  font-size: 12px;
  color: #374151;
  outline: none;
}

.panel-input:focus {
  border-color: #d1d5db;
}

.add-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  cursor: pointer;
}

.add-btn:hover {
  background-color: #f3f4f6;
}

.option-list {
  max-height: 240px;
  overflow: auto;
  padding: 6px 0;
}

.option-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #374151;
  background-color: #ffffff;
  border: 0;
  cursor: pointer;
  user-select: none;
}

.option-row:hover {
  background-color: #f3f4f6;
}

.option-row-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.option-row-disabled:hover {
  background-color: #ffffff;
}

.option-row-selected {
  background-color: #f3f4f6;
}

.option-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  height: 22px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.option-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 0 0 auto;
}

.option-more {
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
}

.option-more:hover {
  color: #6b7280;
  background-color: #f3f4f6;
}

.option-empty {
  padding: 12px 10px;
  font-size: 12px;
  color: #9ca3af;
}

.tag-color-popper {
  --popper-theme-background-color: #ffffff;
  --popper-theme-background-color-hover: #ffffff;
  --popper-theme-border-width: 1px;
  --popper-theme-border-style: solid;
  --popper-theme-border-color: #e5e7eb;
  --popper-theme-border-radius: 12px;
  --popper-theme-padding: 12px;
  --popper-theme-box-shadow: 0 16px 28px -18px rgba(15, 23, 42, 0.4);
  display: inline-flex;
}

.color-panel {
  width: 240px;
}
</style>
