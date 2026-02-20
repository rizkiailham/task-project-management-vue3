<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from 'primevue/checkbox'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import GridFilterBar from '@/components/ui/GridFilterBar.vue'

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
      <component v-if="filter.icon" :is="filter.icon" class="w-3.5 h-3.5 mr-1.5 text-gray-500" />
      <span>{{ filter.label }}</span>
    </template>

    <template #filter-value="{ filter, filterSummary }">
      <template v-if="filter.type === 'text' || filter.type === 'select' || filter.type === 'multiselect'">
        <input
          type="text"
          :value="getCommaSeparatedValue(filter.value)"
          class="filter-pill__input w-full bg-transparent border-0 outline-none text-[13px] text-gray-700 min-w-[80px] px-2 h-full placeholder:text-gray-400"
          :placeholder="t('tasks.enterValue', 'Enter value...')"
          @input="(event) => handleValueChange(filter.id, filter.type === 'text' ? event.target.value : parseCommaSeparatedValues(event.target.value))"
          @click.stop
        />
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
                <component v-if="filter.icon" :is="filter.icon" class="w-3.5 h-3.5 shrink-0 text-primary-500" />
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
    </template>
  </GridFilterBar>
</template>
