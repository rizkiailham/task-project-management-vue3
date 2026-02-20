<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ListFilter,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown
} from 'lucide-vue-next'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'

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
      key: col.id,
      icon: col.icon || null
    }))
})

// Build sort menu items
const sortColumnItems = computed(() => {
  return props.filterableColumns.map((col) => ({
    type: 'item',
    label: col.label,
    key: col.id,
    icon: col.icon || null,
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
}

function handleResetFilters() {
  emit('reset-filters')
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

  if (type === 'user') {
    // value is expected to be a user object { id, name, ... }
    return value.name || '...'
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
                  <ArrowUpDown class="w-3.5 h-3.5" />
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
          >
            <!-- Label segment -->
            <div class="filter-pill__segment filter-pill__segment--label bg-white">
              <component v-if="filter.icon" :is="filter.icon" class="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              <span>{{ filter.label }}</span>
            </div>

            <!-- Separator -->
            <div class="filter-pill__separator"></div>

            <!-- Operator segment -->
            <DropdownMenu
              class="h-full inline-flex items-center"
              :items="getOperatorsForColumn(filter.column).map(op => ({ id: op.id, label: op.label, action: () => handleOperatorChange(filter.id, op.id) }))"
              position="left"
              contentPosition="before"
              :openUp="true"
            >
              <template #trigger>
                <button
                  type="button"
                  class="filter-pill__segment filter-pill__segment--action text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none flex items-center justify-center h-full"
                >
                  {{ getOperatorLabel(filter) }}
                </button>
              </template>
            </DropdownMenu>

            <!-- Separator -->
            <div class="filter-pill__separator"></div>

            <!-- Value segment based on type -->
            <div class="filter-pill__segment filter-pill__segment--value flex items-center h-full">
              <!-- Text input -->
              <template v-if="filter.type === 'text' || filter.type === 'select' || filter.type === 'multiselect'">
                <input
                  type="text"
                  :value="getCommaSeparatedValue(filter.value)"
                  class="filter-pill__input bg-transparent border-0 outline-none text-[13px] text-gray-700 min-w-[80px] px-2 h-full placeholder:text-gray-400"
                  :placeholder="t('tasks.enterValue', 'Enter value...')"
                  @input="(e) => handleValueChange(filter.id, filter.type === 'text' ? e.target.value : parseCommaSeparatedValues(e.target.value))"
                  @click.stop
                />
              </template>

              <!-- Status multi-select -->
              <template v-else-if="filter.column === 'status'">
                <DropdownMenu
                  class="h-full inline-flex items-center"
                  position="left"
                  contentPosition="before"
                  :openUp="true"
                  :closeOnSelect="false"
                >
                  <template #trigger>
                    <button class="filter-pill__input flex items-center justify-center gap-1.5 px-2.5 h-full whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors">
                      <span class="text-primary-600 font-medium">{{ getFilterSummary(filter) !== '...' ? getFilterSummary(filter) : t('tasks.selectStatus', 'Select status...') }}</span>
                    </button>
                  </template>
                  <template #content>
                    <div class="p-1 min-w-[140px] max-h-[200px] overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
                      <label 
                        v-for="status in statusOptions" 
                        :key="getStatusOptionValue(status)" 
                        class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-[13px] text-gray-700 m-0"
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
                </DropdownMenu>
              </template>

              <!-- User selection -->
              <template v-else-if="filter.type === 'user'">
                <UserSearchDropdown
                  class="h-full inline-flex items-center"
                  :model-value="filter.value"
                  :show-unassigned="true"
                  :openUp="true"
                  @update:model-value="(value) => handleValueChange(filter.id, value)"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="filter-pill__input flex items-center justify-center gap-1.5 px-2.5 h-full whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors"
                    >
                      <template v-if="filter.value?.name">
                        <component v-if="filter.icon" :is="filter.icon" class="w-3.5 h-3.5 shrink-0 text-primary-500" />
                        <span class="truncate text-primary-600 font-medium">{{ filter.value.name }}</span>
                      </template>
                      <span v-else class="text-gray-500 truncate">{{ t('tasks.selectUser', 'Select user...') }}</span>
                    </button>
                  </template>
                </UserSearchDropdown>
              </template>

              <!-- Date picker -->
              <template v-else-if="filter.type === 'date'">
                <VDatePicker
                  class="h-full inline-flex items-center"
                  :model-value="getDateModel(filter.value)"
                  :mode="filter.operator === 'between' ? 'date' : 'date'"
                  :is-range="filter.operator === 'between'"
                  :popover="{ visibility: 'click', placement: 'top' }"
                  @update:model-value="(value) => handleDateChange(filter.id, value, filter.operator)"
                >
                  <template #default="{ togglePopover }">
                    <button
                      type="button"
                      class="filter-pill__input flex items-center justify-center px-2.5 h-full text-left text-[13px] whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors"
                      @click="togglePopover"
                    >
                      <span :class="getFilterSummary(filter) !== '...' ? 'text-primary-600 font-medium' : 'text-gray-500'">
                        {{ getFilterSummary(filter) !== '...' ? getFilterSummary(filter) : t('tasks.enterValue', 'Select date...') }}
                      </span>
                    </button>
                  </template>
                </VDatePicker>
              </template>
            </div>

            <!-- Separator -->
            <div class="filter-pill__separator bg-white"></div>

            <!-- Remove button segment -->
            <button
              type="button"
              class="filter-pill__segment filter-pill__segment--remove text-gray-400 bg-white hover:bg-gray-50 hover:text-red-500 transition-colors focus:bg-gray-50 focus:outline-none"
              @click.stop="handleRemoveFilter(filter.id)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
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
  flex-wrap: wrap; /* Support wrapping */
  gap: 8px;
  min-height: 28px;
  min-width: 0;
  width: 100%;
  font-size: 13px;
}

.filter-bar__scroll {
  flex: 1 1 auto;
  min-width: 0;
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
  flex-wrap: wrap; /* Wrap pills instead of scrolling horizontal */
}

.filter-pill {
  display: inline-flex;
  align-items: stretch;
  position: relative;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  height: 28px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-pill > :first-child {
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}

.filter-pill > :last-child {
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
}

.filter-pill:focus-within {
  border-color: var(--color-primary-400, #60a5fa);
  box-shadow: 0 0 0 1px var(--color-primary-200, #bfdbfe);
}

.filter-pill__separator {
  width: 1px;
  background-color: #e5e7eb;
}

.filter-pill__segment {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  white-space: nowrap;
  border: none;
  background: transparent;
}

.filter-pill__segment--label {
  padding: 0 8px;
  color: var(--color-gray-600, #4b5563);
}

.filter-pill__segment--action {
  padding: 0 8px;
  cursor: pointer;
  height: 100%;
}

.filter-pill__segment--value {
  padding: 0;
  background: #f3f4f6;
  min-width: 60px; /* Base width */
}

.filter-pill__input {
  width: 100%;
  background: transparent;
  border: none;
}

.filter-pill__segment--remove {
  padding: 0 8px;
  cursor: pointer;
  height: 100%;
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
