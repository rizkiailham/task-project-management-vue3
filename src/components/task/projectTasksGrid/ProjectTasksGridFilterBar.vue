<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ListFilter,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronDown
} from 'lucide-vue-next'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  activeFilters: {
    type: Array,
    default: () => []
  },
  filterableColumns: {
    type: Array,
    default: () => []
  },
  statusOptions: {
    type: Array,
    default: () => []
  },
  getOperatorsForColumn: {
    type: Function,
    default: () => () => []
  },
  sortModel: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'add-filter',
  'remove-filter',
  'update-filter',
  'reset-filters',
  'update-sort'
])

const { t } = useI18n()

// Search within "Filter by" dropdown
const filterSearchQuery = ref('')
const editingFilterId = ref(null)
const filterPillRefs = ref({})
const sortDropdownRef = ref(null)

const activeColumnSet = computed(() => new Set(props.activeFilters.map((filter) => filter.column)))

// Build dropdown items from filterable columns
const filterColumnItems = computed(() => {
  const query = filterSearchQuery.value.trim().toLowerCase()
  return props.filterableColumns
    .filter((col) => {
      if (activeColumnSet.value.has(col.id)) return false
      if (!query) return true
      return col.label.toLowerCase().includes(query)
    })
    .map((col) => ({
      type: 'item',
      label: col.label,
      key: col.id
    }))
})

// Build sort menu items
const sortColumnItems = computed(() => {
  return props.filterableColumns.map((col) => ({
    type: 'item',
    label: col.label,
    key: col.id,
    items: [
      {
        type: 'item',
        label: t('common.ascending', 'Ascending'),
        key: `${col.id}:asc`,
        active: isSortActive(col.id, 'asc')
      },
      {
        type: 'item',
        label: t('common.descending', 'Descending'),
        key: `${col.id}:desc`,
        active: isSortActive(col.id, 'desc')
      }
    ]
  }))
})

function isSortActive(colId, direction) {
  const sort = props.sortModel.find(s => s.colId === colId)
  return sort ? sort.sort === direction : false
}

function handleSortSelect(item) {
  sortDropdownRef.value?.close()
  
  if (!item?.key) return
  
  // Handle nested selection (key format: "colId:direction")
  const parts = item.key.split(':')
  if (parts.length === 2) {
    const [colId, direction] = parts
    emit('update-sort', { colId, sort: direction })
    return
  }

  // Handle direct toggle (if top-level item clicked - though UI prevents this for items with children)
  // Fallback behavior
  const currentSort = props.sortModel.find(s => s.colId === item.key)
  let nextSort = 'asc'
  
  if (currentSort) {
    if (currentSort.sort === 'asc') nextSort = 'desc'
    else nextSort = null // Toggle off
  }
  
  emit('update-sort', { colId: item.key, sort: nextSort })
}

function handleAddFilter(item) {
  if (item?.key) {
    emit('add-filter', item.key)
    filterSearchQuery.value = ''
  }
}

function handleRemoveFilter(filterId) {
  emit('remove-filter', filterId)
  if (editingFilterId.value === filterId) {
    editingFilterId.value = null
  }
}

function handleResetFilters() {
  emit('reset-filters')
  editingFilterId.value = null
}

function toggleEditFilter(filterId) {
  editingFilterId.value = editingFilterId.value === filterId ? null : filterId
}

function setFilterPillRef(filterId, element) {
  if (element) {
    filterPillRefs.value[filterId] = element
    return
  }
  delete filterPillRefs.value[filterId]
}

function getEditorPortalStyle(filterId) {
  const pill = filterPillRefs.value[filterId]
  if (!pill || typeof window === 'undefined') {
    return { visibility: 'hidden' }
  }

  const rect = pill.getBoundingClientRect()
  const editorWidth = 240
  const viewportPadding = 8
  const maxLeft = Math.max(viewportPadding, window.innerWidth - editorWidth - viewportPadding)
  const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft)
  const top = Math.max(viewportPadding, rect.top - 6)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${editorWidth}px`,
    transform: 'translateY(-100%)'
  }
}

function handleDocumentClick(event) {
  if (!editingFilterId.value) return
  const target = event?.target
  if (!(target instanceof Element)) return
  if (target.closest('.p-select-overlay')) return
  if (target.closest('.vc-container') || target.closest('.vc-popover-content') || target.closest('.vc-popover-content-wrapper')) return
  if (target.closest('.filter-pill') || target.closest('.filter-editor')) return
  editingFilterId.value = null
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    editingFilterId.value = null
  }
}

function handleOperatorChange(filterId, operator) {
  emit('update-filter', filterId, { operator })
}

function handleValueChange(filterId, value) {
  emit('update-filter', filterId, { value })
}

function parseCommaSeparatedValues(rawValue) {
  const list = String(rawValue || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return [...new Set(list)]
}

function getCommaSeparatedValue(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function handleSelectToggle(filterId, currentValue, optionValue) {
  const current = (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [])
    .map((v) => String(v))
  const target = String(optionValue)
  const idx = current.indexOf(target)
  let next
  if (idx >= 0) {
    next = current.filter((v) => v !== target)
  } else {
    next = [...current, target]
  }
  emit('update-filter', filterId, { value: next })
}

function getFilterSummary(filter) {
  const { value, type, column, operator } = filter
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return '...'
  }

  // Handle 'between' operator specially
  if (operator === 'between' && type === 'date') {
    if (!Array.isArray(value) || value.length < 2) return '...'
    const start = formatDateDisplay(value[0])
    const end = formatDateDisplay(value[1])
    return `${start} - ${end}`
  }

  if (column === 'status') {
    const values = Array.isArray(value) ? value : [value]
    const labels = values.map((item) => getStatusLabel(item)).filter(Boolean)
    if (!labels.length) return '...'
    if (labels.length === 1) return labels[0]
    return `${labels.length} ${t('tasks.selectedLabel', 'selected')}`
  }

  if (type === 'multiselect' || (Array.isArray(value) && value.length > 0)) {
    const values = Array.isArray(value) ? value : parseCommaSeparatedValues(value)
    if (!values.length) return '...'
    if (values.length === 1) return String(values[0])
    return `${values.length} ${t('tasks.selectedLabel', 'selected')}`
  }

  if (type === 'date') {
    return formatDateDisplay(value)
  }

  return String(value)
}

function formatDateDisplay(value) {
  try {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  } catch (e) { /* ignore */ }
  return String(value)
}

function getOperatorLabel(filter) {
  const operators = props.getOperatorsForColumn(filter.column)
  const op = operators.find((o) => o.id === filter.operator)
  return op?.label || filter.operator
}

// Get status label for display
function getStatusLabel(statusId) {
  const target = String(statusId)
  const opt = props.statusOptions.find((s) => {
    const keys = [s?.id, s?.value, s?.key, s?.kanbanColumnId].filter((v) => v !== undefined && v !== null)
    return keys.some((k) => String(k) === target)
  })
  return opt?.label || opt?.name || statusId
}

function getDateModel(value) {
  if (Array.isArray(value)) {
    if (value.length === 2) {
      return { 
        start: value[0] ? new Date(value[0]) : null, 
        end: value[1] ? new Date(value[1]) : null 
      }
    }
    return null
  }
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateForFilter(value) {
  if (!value) return ''
  const date = Array.isArray(value) ? value[0] : value
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function handleDateChange(filterId, value, operator) {
  if (operator === 'between') {
    // value is expected to be { start, end } from v-calendar range mode
    if (value && typeof value === 'object' && (value.start || value.end)) {
      const start = value.start ? formatDateForFilter(value.start) : ''
      const end = value.end ? formatDateForFilter(value.end) : ''
      handleValueChange(filterId, [start, end])
    } else {
      handleValueChange(filterId, [])
    }
    return
  }
  
  handleValueChange(filterId, formatDateForFilter(value))
}

const activeSort = computed(() => {
  return props.sortModel.length > 0 ? props.sortModel[0] : null
})

function getColumnLabel(colId) {
  const col = props.filterableColumns.find(c => c.id === colId)
  return col ? col.label : colId
}

function toggleSortDirection(sortItem) {
  const next = sortItem.sort === 'asc' ? 'desc' : 'asc'
  emit('update-sort', { colId: sortItem.colId, sort: next })
}

// Auto-open filter editor when a new filter is added
watch(() => props.activeFilters, async (newFilters, oldFilters) => {
  if (newFilters.length > oldFilters.length) {
    // A filter was added. Find the new one.
    // Assuming new filters are appended to the end, but we can check IDs
    const oldIds = new Set(oldFilters.map(f => f.id))
    const addedFilter = newFilters.find(f => !oldIds.has(f.id))
    
    if (addedFilter) {
      // Ensure the pill is rendered
      await nextTick()
      // Open the editor
      editingFilterId.value = addedFilter.id
    }
  }
}, { deep: true })

function getStatusOptionValue(status) {
  return String(status?.id ?? status?.value ?? status?.key ?? status?.kanbanColumnId ?? '')
}

function getStatusOptionLabel(status) {
  return status?.label || status?.name || getStatusOptionValue(status)
}

function isStatusSelected(currentValue, optionValue) {
  const current = (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [])
    .map((v) => String(v))
  return current.includes(String(optionValue))
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar__scroll">
      <div class="filter-bar__scroll-inner">
        <!-- Sort UI -->
        <div class="flex items-center gap-2">
          
          <template v-if="activeSort">
            <div class="flex items-center gap-1">
              <!-- Active Sort Pill (Triggers Column Menu) -->
              <DropdownMenu
                ref="sortDropdownRef"
                :items="sortColumnItems"
                position="left"
                width="14rem"
                contentPosition="before"
                :openUp="true"
                @select="handleSortSelect"
              >
                <template #trigger>
                  <button
                    type="button"
                    class="flex items-center gap-2 px-2 h-7 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <span>{{ getColumnLabel(activeSort.colId) }}</span>
                    <ChevronDown class="w-3 h-3 text-gray-400" />
                  </button>
                </template>
              </DropdownMenu>

              <!-- Sort Direction Toggle -->
              <button
                type="button"
                class="flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
                @click="toggleSortDirection(activeSort)"
                :title="activeSort.sort === 'asc' ? 'Ascending' : 'Descending'"
              >
                <component :is="activeSort.sort === 'asc' ? ArrowUp : ArrowDown" class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>

          <template v-else>
            <!-- Default Sort Button (No active sort) -->
            <DropdownMenu
              :items="sortColumnItems"
              position="left"
              width="14rem"
              contentPosition="before"
              :openUp="true"
              @select="handleSortSelect"
            >
              <template #trigger>
                <button
                  type="button"
                  class="flex items-center gap-2 px-2 h-7 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  :title="t('common.sort', 'Sort')"
                >
                  <span>{{ t('common.sort', 'Sort') }}</span>
                </button>
              </template>
            </DropdownMenu>
          </template>
        </div>

        <!-- Filter by button -->
        <DropdownMenu
          :items="filterColumnItems"
          position="left"
          width="14rem"
          contentPosition="before"
          :openUp="true"
          @select="handleAddFilter"
        >
          <template #trigger>
            <button
              type="button"
              class="text-xs font-medium text-gray-500 whitespace-nowrap hover:text-gray-700 transition-colors"
              :title="t('tasks.filterBy', 'Filter by')"
            >
              {{ t('tasks.filterBy', 'Filter by') }}
            </button>
          </template>

          <template #content>
            <div class="filter-bar__search">
              <Search class="w-3.5 h-3.5 text-gray-400" />
              <InputText
                v-model="filterSearchQuery"
                :placeholder="t('tasks.searchFilters', 'Search filters...')"
                class="filter-bar__search-input w-full !text-[13px] !border-0 !bg-transparent !shadow-none !px-0 !py-0 focus:!shadow-none"
                @click.stop
              />
            </div>
            <div v-if="filterColumnItems.length === 0" class="filter-bar__empty">
              {{ t('tasks.noFiltersFound', 'No filters found') }}
            </div>
          </template>
        </DropdownMenu>

        <!-- Active filter pills -->
        <div v-if="activeFilters.length > 0" class="filter-bar__pills">
          <div
            v-for="filter in activeFilters"
            :key="filter.id"
            class="filter-pill"
            :class="{ 'filter-pill--editing': editingFilterId === filter.id }"
            :ref="(element) => setFilterPillRef(filter.id, element)"
          >
            <button
              type="button"
              class="filter-pill__body"
              @click.stop="toggleEditFilter(filter.id)"
            >
              <span class="filter-pill__label">{{ filter.label }}</span>
              <span class="filter-pill__operator">{{ getOperatorLabel(filter) }}</span>
              <span class="filter-pill__value">{{ getFilterSummary(filter) }}</span>
            </button>
            <button
              type="button"
              class="filter-pill__remove"
              @click.stop="handleRemoveFilter(filter.id)"
            >
              <X class="w-3 h-3" />
            </button>

            <!-- Inline editor popover -->
            <Teleport to="body">
              <div
                v-if="editingFilterId === filter.id"
                class="filter-editor filter-editor--portal"
                :style="getEditorPortalStyle(filter.id)"
                @click.stop
              >
                <!-- Operator selector -->
                <div class="filter-editor__row">
                  <Select
                    :modelValue="filter.operator"
                    :options="getOperatorsForColumn(filter.column)"
                    optionLabel="label"
                    optionValue="id"
                    appendTo="self"
                    class="w-full"
                    @update:modelValue="(value) => handleOperatorChange(filter.id, value)"
                  />
                </div>

                <!-- Value editor based on type -->
                <div class="filter-editor__row">
                  <!-- Text input -->
                  <template v-if="filter.type === 'text'">
                    <InputText
                      :modelValue="getCommaSeparatedValue(filter.value)"
                      :placeholder="t('tasks.enterValue', 'Enter value...')"
                      class="filter-editor__input w-full"
                      @update:modelValue="(value) => handleValueChange(filter.id, value)"
                    />
                  </template>

                  <!-- Status multi-select -->
                  <template v-else-if="filter.column === 'status'">
                    <div class="filter-editor__options">
                      <label
                        v-for="status in statusOptions"
                        :key="getStatusOptionValue(status)"
                        class="filter-editor__option"
                      >
                        <Checkbox
                          :modelValue="isStatusSelected(filter.value, getStatusOptionValue(status))"
                          :binary="true"
                          @update:modelValue="() => handleSelectToggle(filter.id, filter.value, getStatusOptionValue(status))"
                        />
                        <span>{{ getStatusOptionLabel(status) }}</span>
                      </label>
                    </div>
                  </template>

                  <!-- Select (assignee, etc.) -->
                  <template v-else-if="filter.type === 'select'">
                    <InputText
                      :modelValue="getCommaSeparatedValue(filter.value)"
                      :placeholder="t('tasks.enterValue', 'Enter value...')"
                      class="filter-editor__input w-full"
                      @update:modelValue="(value) => handleValueChange(filter.id, parseCommaSeparatedValues(value))"
                    />
                  </template>

                  <!-- Multi-select (tags) -->
                  <template v-else-if="filter.type === 'multiselect'">
                    <InputText
                      :modelValue="getCommaSeparatedValue(filter.value)"
                      :placeholder="t('tasks.enterTags', 'Enter tags (comma-separated)...')"
                      class="filter-editor__input w-full"
                      @update:modelValue="(value) => handleValueChange(filter.id, parseCommaSeparatedValues(value))"
                    />
                  </template>

                  <!-- Date picker -->
                  <template v-else-if="filter.type === 'date'">
                    <VDatePicker
                      :model-value="getDateModel(filter.value)"
                      :mode="filter.operator === 'between' ? 'date' : 'date'"
                      :is-range="filter.operator === 'between'"
                      :popover="{ visibility: 'click' }"
                      @update:model-value="(value) => handleDateChange(filter.id, value, filter.operator)"
                    >
                      <template #default="{ inputValue, togglePopover }">
                        <button
                          type="button"
                          class="filter-editor__input w-full text-left"
                          @click="togglePopover"
                        >
                          <template v-if="filter.operator === 'between'">
                            {{ inputValue?.start && inputValue?.end ? `${inputValue.start} - ${inputValue.end}` : (inputValue?.start || t('tasks.enterValue', 'Select range...')) }}
                          </template>
                          <template v-else>
                            {{ inputValue || t('tasks.enterValue', 'Enter value...') }}
                          </template>
                        </button>
                      </template>
                    </VDatePicker>
                  </template>
                </div>
              </div>
            </Teleport>
          </div>
        </div>
        <!-- Add Filter Button (Manual) -->
        <DropdownMenu
          :items="filterColumnItems"
          position="left"
          width="14rem"
          contentPosition="before"
          :openUp="true"
          @select="handleAddFilter"
        >
          <template #trigger>
            <button
              type="button"
              class="filter-bar__add-btn ml-1 px-1.5 h-7 hover:bg-gray-100 hover:text-gray-900 border-dashed border-gray-300 flex items-center justify-center"
              :title="t('tasks.addFilter', 'Add Filter')"
            >
              <ListFilter class="w-3.5 h-3.5" />
            </button>
          </template>

          <template #content>
            <div class="filter-bar__search">
              <Search class="w-3.5 h-3.5 text-gray-400" />
              <InputText
                v-model="filterSearchQuery"
                :placeholder="t('tasks.searchFilters', 'Search filters...')"
                class="filter-bar__search-input w-full !text-[13px] !border-0 !bg-transparent !shadow-none !px-0 !py-0 focus:!shadow-none"
                @click.stop
              />
            </div>
            <div v-if="filterColumnItems.length === 0" class="filter-bar__empty">
              {{ t('tasks.noFiltersFound', 'No filters found') }}
            </div>
          </template>
        </DropdownMenu>
      </div>
    </div>

    <!-- Reset button -->
    <button
      type="button"
      class="filter-bar__reset"
      :disabled="activeFilters.length === 0"
      @click="handleResetFilters"
    >
      {{ t('common.reset', 'Reset') }}
      <X class="w-3 h-3" />
    </button>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  min-width: 0;
  width: 100%;
  font-size: 13px;
}

.filter-bar__scroll {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.filter-bar__scroll-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
  padding-bottom: 2px;
}

.filter-bar__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500, #6b7280);
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filter-bar__add-btn:hover {
  color: var(--color-gray-700, #374151);
  border-color: #9ca3af;
  background: #f9fafb;
}

.filter-bar__search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e7eb;
}

.filter-bar__search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--color-gray-700, #374151);
  background: transparent;
  min-width: 0;
}

.filter-bar__search-input::placeholder {
  color: var(--color-gray-400, #9ca3af);
}

.filter-bar__empty {
  padding: 6px 10px 8px;
  font-size: 13px;
  color: var(--color-gray-400, #9ca3af);
}

.filter-bar__pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  position: relative;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  border-color: #9ca3af;
  background: #f3f4f6;
}

.filter-pill--editing {
  border-color: var(--color-primary-400, #60a5fa);
  box-shadow: 0 0 0 1px var(--color-primary-200, #bfdbfe);
}

.filter-pill__body {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 8px;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  color: var(--color-gray-700, #374151);
}

.filter-pill__label {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-600, #4b5563);
}

.filter-pill__operator {
  color: var(--color-gray-400, #9ca3af);
}

.filter-pill__value {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-600, #2563eb);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-gray-400, #9ca3af);
  cursor: pointer;
  border-left: 1px solid #e5e7eb;
  padding: 0 2px;
  border-radius: 0 5px 5px 0;
  transition: all 0.12s ease;
}

.filter-pill__remove:hover {
  background: #fee2e2;
  color: #ef4444;
}

.filter-editor {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  min-width: 200px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 8px;
}

.filter-editor--portal {
  position: fixed;
  bottom: auto;
  left: 0;
  z-index: 10001;
}

.filter-editor__row {
  margin-bottom: 6px;
}

.filter-editor__row:last-child {
  margin-bottom: 0;
}

.filter-editor__input {
  width: 100%;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: var(--color-gray-700, #374151);
  outline: none;
}

.filter-editor__input:focus {
  border-color: var(--color-primary-400, #60a5fa);
}

.filter-editor__options {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-editor__option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 13px;
  color: var(--color-gray-700, #374151);
  cursor: pointer;
  border-radius: 4px;
}

.filter-editor__option:hover {
  background: #f3f4f6;
}

.filter-editor :deep(.p-inputtext),
.filter-editor :deep(.p-select) {
  width: 100%;
  min-height: 30px;
  font-size: 13px;
  border-color: #d1d5db;
  box-shadow: none;
}

.filter-editor :deep(.p-inputtext:enabled:focus),
.filter-editor :deep(.p-select.p-focus) {
  border-color: var(--color-primary-400, #60a5fa);
  box-shadow: none;
}

.filter-editor :deep(.p-select-label) {
  font-size: 13px;
}

.filter-editor :deep(.p-checkbox-box) {
  width: 14px;
  height: 14px;
}

.filter-bar__reset {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-400, #9ca3af);
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease;
  flex: 0 0 auto;
  margin-left: auto;
}

.filter-bar__reset:hover {
  color: #ef4444;
}

.filter-bar__reset:disabled {
  opacity: 0.5;
  cursor: default;
}

.filter-bar__reset:disabled:hover {
  color: var(--color-gray-400, #9ca3af);
}
</style>
