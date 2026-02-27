<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from 'primevue/checkbox'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import GridFilterBar from '@/components/ui/GridFilterBar.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'

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

const activeSort = computed(() => {
  return props.sortModel.length > 0 ? props.sortModel[0] : null
})

function isRenderableIcon(icon) {
  return typeof icon === 'object' || typeof icon === 'function'
}

function isSortActive(colId, direction) {
  const sort = props.sortModel.find((item) => item.colId === colId)
  return sort ? sort.sort === direction : false
}

function handleSortSelect(item) {
  if (!item?.key) return

  const parts = item.key.split(':')
  if (parts.length === 2) {
    const [colId, direction] = parts
    emit('update-sort', { colId, sort: direction })
    return
  }

  const currentSort = props.sortModel.find((state) => state.colId === item.key)
  let nextSort = 'asc'

  if (currentSort) {
    if (currentSort.sort === 'asc') nextSort = 'desc'
    else nextSort = null
  }

  emit('update-sort', { colId: item.key, sort: nextSort })
}

function toggleSortDirection(sortItem) {
  if (!sortItem?.colId) return
  const next = sortItem.sort === 'asc' ? 'desc' : 'asc'
  emit('update-sort', { colId: sortItem.colId, sort: next })
}

function getColumnLabel(colId) {
  const col = props.filterableColumns.find((item) => item.id === colId)
  return col ? col.label : colId
}

function handleAddFilter(colId) {
  if (!colId) return
  emit('add-filter', colId)
}

function handleRemoveFilter(filterId) {
  emit('remove-filter', filterId)
}

function handleResetFilters() {
  emit('reset-filters')
}

function handleGridFilterUpdate(payload) {
  if (!payload?.id || !payload?.updates) return
  emit('update-filter', payload.id, payload.updates)
}

function handleValueChange(filterId, value) {
  emit('update-filter', filterId, { value })
}

function parseCommaSeparatedValues(rawValue) {
  const list = String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return [...new Set(list)]
}

function getCommaSeparatedValue(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function handleSelectToggle(filterId, currentValue, optionValue) {
  const current = (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [])
    .map((value) => String(value))
  const target = String(optionValue)
  const idx = current.indexOf(target)
  let next
  if (idx >= 0) {
    next = current.filter((value) => value !== target)
  } else {
    next = [...current, target]
  }
  emit('update-filter', filterId, { value: next })
}

function normalizePropertyOption(option, index = 0) {
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option)
    return {
      id: value || `opt-${index}`,
      label: value || `Option ${index + 1}`,
      value
    }
  }

  if (!option || typeof option !== 'object') return null

  const value = option.value ?? option.label ?? option.name ?? option.id ?? ''
  const label = String(option.label ?? option.value ?? option.name ?? option.id ?? '').trim() || String(value || '')
  const id = String(option.id ?? value ?? `opt-${index}`)

  return {
    id,
    label: label || id,
    value
  }
}

function getFilterOptions(filter) {
  if (!filter) return []
  const column = props.filterableColumns.find((item) => String(item.id) === String(filter.column))
  const source = Array.isArray(column?.propertyOptions)
    ? column.propertyOptions
    : Array.isArray(filter.propertyOptions)
      ? filter.propertyOptions
      : []
  return source.map((option, index) => normalizePropertyOption(option, index)).filter(Boolean)
}

function isPropertyOptionSelected(currentValue, optionValue) {
  const selectedValues = Array.isArray(currentValue)
    ? currentValue
    : currentValue !== null && currentValue !== undefined && currentValue !== ''
      ? [currentValue]
      : []
  return selectedValues.map((item) => String(item)).includes(String(optionValue))
}

function handlePropertySelectFilterToggle(filter, optionValue) {
  if (!filter) return
  if (filter.type === 'multiselect') {
    handleSelectToggle(filter.id, filter.value, optionValue)
    return
  }

  const selected = isPropertyOptionSelected(filter.value, optionValue)
  emit('update-filter', filter.id, { value: selected ? '' : String(optionValue) })
}

function getFilterSummary(filter) {
  const { value, type, column, operator } = filter
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return '...'
  }

  if (operator === 'between' && type === 'date') {
    if (!Array.isArray(value) || value.length < 2) return '...'
    const start = formatDateDisplay(value[0])
    const end = formatDateDisplay(value[1])
    return `${start} - ${end}`
  }

  if (type === 'user') {
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

  if (type === 'number') {
    return String(value)
  }

  if (type === 'boolean' || type === 'checkbox') {
    return operator === 'is_checked'
      ? t('tasks.filters.checked', 'Checked')
      : t('tasks.filters.unchecked', 'Unchecked')
  }

  return String(value)
}

function formatDateDisplay(value) {
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  } catch {
    // no-op
  }
  return String(value)
}

function getOperatorLabel(filter) {
  const operators = props.getOperatorsForColumn(filter.column)
  const op = operators.find((item) => item.id === filter.operator)
  return op?.label || filter.operator
}

function getStatusLabel(statusId) {
  const target = String(statusId)
  const option = props.statusOptions.find((item) => {
    const keys = [item?.id, item?.value, item?.key, item?.kanbanColumnId].filter(
      (value) => value !== undefined && value !== null
    )
    return keys.some((key) => String(key) === target)
  })
  return option?.label || option?.name || statusId
}

function getStatusOptionValue(status) {
  return String(status?.id ?? status?.value ?? status?.key ?? status?.kanbanColumnId ?? '')
}

function getStatusOptionLabel(status) {
  return status?.label || status?.name || getStatusOptionValue(status)
}

const STATUS_ICON_OPTIONS = [
  { id: '0', status: 'todo', progress: 0, color: '#9ca3af' },
  { id: '25', status: 'in_progress', progress: 25, color: '#14b8a6' },
  { id: '50', status: 'in_progress', progress: 50, color: '#a855f7' },
  { id: '75', status: 'in_progress', progress: 75, color: '#f97316' },
  { id: '100', status: 'done', progress: 100, color: '#22c55e' }
]

function normalizeStatusIconValue(icon) {
  const raw = String(icon ?? '0')
  const legacyMap = {
    '1': '25',
    '2': '50',
    '3': '75',
    '4': '100',
    '5': '100'
  }
  const mapped = legacyMap[raw] || raw
  return STATUS_ICON_OPTIONS.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveStatusIconFromProgress(progress) {
  const value = Number(progress ?? 0)
  if (value >= 100) return '100'
  if (value >= 75) return '75'
  if (value >= 50) return '50'
  if (value >= 25) return '25'
  return '0'
}

function getStatusVisual(status) {
  const icon = normalizeStatusIconValue(status?.icon ?? resolveStatusIconFromProgress(status?.progress))
  const canonical = STATUS_ICON_OPTIONS.find((item) => item.id === icon) || STATUS_ICON_OPTIONS[0]
  return {
    status: status?.status || canonical.status,
    progress: Number.isFinite(Number(status?.progress)) ? Number(status.progress) : canonical.progress,
    color: status?.color || canonical.color
  }
}

function isStatusSelected(currentValue, optionValue) {
  const current = (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [])
    .map((value) => String(value))
  return current.includes(String(optionValue))
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
</script>

<template>
  <GridFilterBar
    :activeSort="activeSort"
    :sortColumnItems="sortColumnItems"
    :getColumnLabel="getColumnLabel"
    :activeFilters="activeFilters"
    :filterableColumns="filterableColumns"
    :getOperatorsForColumn="getOperatorsForColumn"
    :getOperatorLabel="getOperatorLabel"
    :getFilterSummary="getFilterSummary"
    @sort-select="handleSortSelect"
    @toggle-sort-direction="toggleSortDirection"
    @add-filter="handleAddFilter"
    @update-filter="handleGridFilterUpdate"
    @remove-filter="handleRemoveFilter"
    @reset="handleResetFilters"
  >
    <template #filter-label="{ filter }">
      <TaskProgressIcon
        v-if="filter.column === 'status'"
        status="todo"
        :progress="0"
        color="#9ca3af"
        size="sm"
        class="mr-1.5 shrink-0"
      />
      <component v-else-if="isRenderableIcon(filter.icon)" :is="filter.icon" class="w-3.5 h-3.5 mr-1.5 text-gray-500" />
      <span>{{ filter.label }}</span>
    </template>

    <template #filter-value="{ filter, filterSummary }">
      <template v-if="filter.type === 'text'">
        <input
          type="text"
          :value="getCommaSeparatedValue(filter.value)"
          class="filter-pill__input w-full bg-transparent border-0 outline-none text-[13px] text-gray-700 min-w-[80px] px-2 h-full placeholder:text-gray-400"
          :placeholder="t('tasks.enterValue', 'Enter value...')"
          @input="(event) => handleValueChange(filter.id, event.target.value)"
          @click.stop
        />
      </template>

      <template v-else-if="(filter.type === 'select' || filter.type === 'multiselect') && filter.column !== 'status'">
        <DropdownMenu
          class="h-full inline-flex items-center"
          position="left"
          contentPosition="before"
          :openUp="true"
          :closeOnSelect="false"
        >
          <template #trigger>
            <button
              type="button"
              class="filter-pill__input flex items-center justify-center gap-1.5 px-2.5 h-full whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors"
            >
              <span :class="filterSummary !== '...' ? 'text-primary-600 font-medium' : 'text-gray-500'">
                {{ filterSummary !== '...' ? filterSummary : t('tasks.enterValue', 'Select value...') }}
              </span>
            </button>
          </template>
          <template #content>
            <div class="p-1 min-w-[140px] max-h-[220px] overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
              <label
                v-for="option in getFilterOptions(filter)"
                :key="option.id"
                class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-[13px] text-gray-700 m-0"
              >
                <Checkbox
                  :modelValue="isPropertyOptionSelected(filter.value, option.value)"
                  :binary="true"
                  @update:modelValue="() => handlePropertySelectFilterToggle(filter, option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
              <div v-if="getFilterOptions(filter).length === 0" class="px-2 py-2 text-xs text-gray-400">
                {{ t('tasks.noOptionsFound', 'No options') }}
              </div>
            </div>
          </template>
        </DropdownMenu>
      </template>

      <template v-else-if="filter.column === 'status'">
        <DropdownMenu
          class="h-full inline-flex items-center"
          position="left"
          contentPosition="before"
          :openUp="true"
          :closeOnSelect="false"
        >
          <template #trigger>
            <button
              type="button"
              class="filter-pill__input flex items-center justify-center gap-1.5 px-2.5 h-full whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors"
            >
              <span class="text-primary-600 font-medium">
                {{ filterSummary !== '...' ? filterSummary : t('tasks.selectStatus', 'Select status...') }}
              </span>
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
                <TaskProgressIcon
                  :status="getStatusVisual(status).status"
                  :progress="getStatusVisual(status).progress"
                  :color="getStatusVisual(status).color"
                  size="sm"
                  class="shrink-0"
                />
                <span>{{ getStatusOptionLabel(status) }}</span>
              </label>
            </div>
          </template>
        </DropdownMenu>
      </template>

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
                <component v-if="isRenderableIcon(filter.icon)" :is="filter.icon" class="w-3.5 h-3.5 shrink-0 text-primary-500" />
                <span class="truncate text-primary-600 font-medium">{{ filter.value.name }}</span>
              </template>
              <span v-else class="text-gray-500 truncate">{{ t('tasks.selectUser', 'Select user...') }}</span>
            </button>
          </template>
        </UserSearchDropdown>
      </template>

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
              <span :class="filterSummary !== '...' ? 'text-primary-600 font-medium' : 'text-gray-500'">
                {{ filterSummary !== '...' ? filterSummary : t('tasks.enterValue', 'Select date...') }}
              </span>
            </button>
          </template>
        </VDatePicker>
      </template>

      <template v-else-if="filter.type === 'number'">
        <input
          type="number"
          step="any"
          :value="filter.value"
          class="filter-pill__input w-full bg-transparent border-0 outline-none text-[13px] text-gray-700 min-w-[80px] px-2 h-full placeholder:text-gray-400"
          :placeholder="t('tasks.enterNumber', 'Enter number...')"
          @input="(event) => handleValueChange(filter.id, event.target.value)"
          @click.stop
        />
      </template>

      <template v-else-if="filter.type === 'boolean' || filter.type === 'checkbox'">
        <div class="flex items-center h-full px-2 gap-1.5">
          <button
            type="button"
            class="filter-bool-btn"
            :class="{ 'is-active': filter.operator === 'is_checked' }"
            @click.stop="emit('update-filter', filter.id, { operator: 'is_checked', value: true })"
          >
            <i class="pi pi-check text-[11px]"></i>
          </button>
          <button
            type="button"
            class="filter-bool-btn"
            :class="{ 'is-active': filter.operator === 'is_unchecked' }"
            @click.stop="emit('update-filter', filter.id, { operator: 'is_unchecked', value: false })"
          >
            <i class="pi pi-times text-[11px]"></i>
          </button>
        </div>
      </template>
    </template>
  </GridFilterBar>
</template>

<style scoped>
.filter-bool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-bool-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.filter-bool-btn.is-active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
}
</style>

