<script setup>
import { computed, ref, watch, onBeforeUnmount, nextTick, isRef } from 'vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

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

const localOptions = ref(defaultOptions)

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

const availableOptions = computed(() => {
  const raw = getOptionsSource()
  const normalized = normalizeOptions(raw.length ? raw : defaultOptions)
  return normalized.length ? normalized : normalizeOptions(defaultOptions)
})

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

function syncSelectedTags(nextTags = props.params?.data?.tags) {
  selectedTags.value = normalizeTags(nextTags)
  ensureOptionsFromTags(selectedTags.value)
}

watch(
  () => props.params?.data?.tags,
  (next) => syncSelectedTags(next),
  { immediate: true, deep: true }
)

watch(
  () => availableOptions.value,
  () => syncSelectedTags(props.params?.data?.tags),
  { deep: true }
)

function commitTags(next) {
  selectedTags.value = next
  const pathKey = props.params?.data?.pathKey
  props.params.data.tags = next
  props.params.context?.updateField?.(pathKey, 'tags', next)
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

const isOpen = ref(false)
const triggerRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})
const inputRef = ref(null)

const newOptionName = ref('')
const newOptionColor = ref('#3b82f6')
const showNewColorPicker = ref(false)

const editingOptionId = ref(null)
const editName = ref('')
const editColor = ref('#6366f1')
const editorRef = ref(null)
const editorStyle = ref({})
let editorAnchor = null

function updatePanelPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const width = Math.max(260, Math.min(320, rect.width + 24))
  const gap = 6
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.left))
  const top = rect.bottom + gap
  panelStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function updateEditorPosition(anchorEl) {
  if (!anchorEl) return
  const rect = anchorEl.getBoundingClientRect()
  const width = 280
  const gap = 8
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  let left = rect.right + gap
  if (left + width > viewportWidth - 8) {
    left = rect.left - width - gap
  }
  left = Math.max(8, Math.min(viewportWidth - width - 8, left))
  const top = rect.top
  editorStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function openDropdown() {
  if (props.params?.data?.isPlaceholder) return
  isOpen.value = true
  updatePanelPosition()
  nextTick(() => {
    inputRef.value?.focus?.()
  })
}

function closeDropdown() {
  isOpen.value = false
  showNewColorPicker.value = false
  closeEditor()
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
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
    showNewColorPicker.value = false
    return
  }
  const baseId = slugify(name)
  const option = {
    id: ensureUniqueId(baseId),
    name,
    color: newOptionColor.value
  }
  const nextOptions = [...availableOptions.value, option]
  setOptionsSource(nextOptions)
  commitTags([...selectedTags.value, option])
  newOptionName.value = ''
  showNewColorPicker.value = false
}

function openEditor(option, event) {
  editingOptionId.value = option.id
  editName.value = option.name
  editColor.value = option.color
  editorAnchor = event?.currentTarget || null
  updateEditorPosition(editorAnchor)
}

function closeEditor() {
  editingOptionId.value = null
  editorAnchor = null
}

function saveEdit() {
  const optionId = editingOptionId.value
  if (!optionId) return
  const name = editName.value.trim()
  if (!name) return
  const nextOptions = availableOptions.value.map((opt) =>
    opt.id === optionId ? { ...opt, name, color: editColor.value } : opt
  )
  setOptionsSource(nextOptions)
  const nextTags = selectedTags.value.map((tag) =>
    tag.id === optionId ? { ...tag, name, color: editColor.value } : tag
  )
  commitTags(nextTags)
  closeEditor()
}

function getTextColor(hex) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return '#ffffff'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 170 ? '#111827' : '#ffffff'
}

function handleDocumentClick(event) {
  const target = event.target
  if (triggerRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  if (editorRef.value?.contains(target)) return
  closeDropdown()
}

function handleEscape(event) {
  if (event.key === 'Escape') closeDropdown()
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', updatePanelPosition)
    document.addEventListener('scroll', updatePanelPosition, true)
  } else {
    document.removeEventListener('mousedown', handleDocumentClick)
    document.removeEventListener('keydown', handleEscape)
    window.removeEventListener('resize', updatePanelPosition)
    document.removeEventListener('scroll', updatePanelPosition, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updatePanelPosition)
  document.removeEventListener('scroll', updatePanelPosition, true)
})

function refresh(nextParams) {
  syncSelectedTags(nextParams?.data?.tags)
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div class="select-cell" @mousedown.stop @click.stop>
    <div
      ref="triggerRef"
      class="select-trigger"
      @click.stop="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
      role="button"
      tabindex="0"
    >
      <div class="tag-list">
        <span
          v-if="selectedTags.length === 0"
          class="tag-placeholder"
        >
          Add an option...
        </span>
        <span
          v-for="tag in selectedTags"
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
      </div>
      <span class="chevron-spacer" aria-hidden="true"></span>
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="select-panel fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-xl"
        :style="panelStyle"
      >
        <div class="panel-header border-b border-gray-100 p-2">
          <div class="flex items-center gap-2">
            <input
              ref="inputRef"
              v-model="newOptionName"
              type="text"
              class="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-300"
              placeholder="Add an option..."
              @keydown.enter.prevent="createOption"
            />
            <button
              type="button"
              class="color-swatch"
              :style="{ backgroundColor: newOptionColor }"
              @click.stop="showNewColorPicker = !showNewColorPicker"
            />
            <button
              type="button"
              class="add-btn"
              @click.stop="createOption"
            >
              +
            </button>
          </div>
          <div v-if="showNewColorPicker" class="mt-2">
            <ColorPicker v-model="newOptionColor" />
          </div>
        </div>

        <div class="max-h-60 overflow-auto py-1">
          <div
            v-for="option in availableOptions"
            :key="option.id"
            class="option-row"
            @click.stop="toggleOption(option)"
            @keydown.enter.prevent="toggleOption(option)"
            @keydown.space.prevent="toggleOption(option)"
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
              <span v-if="isSelected(option)" class="option-check" aria-label="Selected">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 8l3 3 7-7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <button
                type="button"
                class="option-more"
                @click.stop="openEditor(option, $event)"
                aria-label="Modify option"
                title="Modify option"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <circle cx="4" cy="10" r="1.5"></circle>
                  <circle cx="10" cy="10" r="1.5"></circle>
                  <circle cx="16" cy="10" r="1.5"></circle>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="editingOptionId"
        ref="editorRef"
        class="fixed z-[10000] rounded-lg border border-gray-200 bg-white shadow-xl"
        :style="editorStyle"
      >
        <div class="p-3">
          <input
            v-model="editName"
            type="text"
            class="w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:border-gray-300"
            placeholder="Option name"
          />
          <div class="mt-3">
            <ColorPicker v-model="editColor" />
          </div>
          <div class="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              @click="closeEditor"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800"
              @click="saveEdit"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.select-cell {
  width: 100%;
  height: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  min-height: 28px;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  outline: none;
  user-select: none;
}

.select-trigger:hover {
  border-color: #e5e7eb;
  background-color: #f9fafb;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.tag-placeholder {
  font-size: 12px;
  color: #9ca3af;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  height: 22px;
  max-width: 160px;
  flex: 0 1 auto;
}

.tag-name {
  max-width: 120px;
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

.chevron {
  width: 14px;
  height: 14px;
  color: #9ca3af;
  flex-shrink: 0;
}

.chevron-spacer {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
}

.add-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  background-color: #f3f4f6;
}

.option-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: #374151;
  background: transparent;
  border: 0;
  cursor: pointer;
  user-select: none;
  min-width: 0;
}

.option-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  margin-left: 12px;
  white-space: nowrap;
  justify-self: end;
}

.option-row:hover {
  background-color: #f9fafb;
}

.option-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
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

.option-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: #6b7280;
}

.option-more {
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.option-more:hover {
  color: #6b7280;
  background-color: #f3f4f6;
}
</style>
