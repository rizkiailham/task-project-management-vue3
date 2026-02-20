<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ListFilter,
  ChevronDown,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-vue-next'
import InputText from 'primevue/inputtext'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  activeSort: {
    type: Object,
    default: null
  },
  sortColumnItems: {
    type: Array,
    default: () => []
  },
  getColumnLabel: {
    type: Function,
    default: (colId) => colId
  },
  activeFilters: {
    type: Array,
    default: () => []
  },
  filterableColumns: {
    type: Array,
    default: () => []
  },
  getOperatorsForColumn: {
    type: Function,
    default: () => []
  },
  getOperatorLabel: {
    type: Function,
    default: (filter) => filter?.operator || ''
  },
  getFilterSummary: {
    type: Function,
    default: () => '...'
  },
  getSelectMenuItems: {
    type: Function,
    default: () => []
  },
  getSelectPlaceholder: {
    type: Function,
    default: () => ''
  }
})

const emit = defineEmits([
  'sort-select',
  'toggle-sort-direction',
  'add-filter',
  'update-filter',
  'remove-filter',
  'reset'
])

const { t } = useI18n()
const filterSearchQuery = ref('')
const sortDropdownRef = ref(null)

const activeColumnSet = computed(() => new Set(props.activeFilters.map((filter) => filter.column)))

const filterColumnItems = computed(() => {
  const query = filterSearchQuery.value.trim().toLowerCase()
  return props.filterableColumns
    .filter((column) => {
      if (activeColumnSet.value.has(column.id)) return false
      if (!query) return true
      return String(column.label || '').toLowerCase().includes(query)
    })
    .map((column) => ({
      type: 'item',
      key: column.id,
      label: column.label,
      icon: column.icon || null
    }))
})

function handleSortSelect(item) {
  sortDropdownRef.value?.close?.()
  emit('sort-select', item)
}

function handleAddFilter(item) {
  if (!item?.key) return
  emit('add-filter', item.key)
  filterSearchQuery.value = ''
}

function updateFilter(filterId, updates) {
  emit('update-filter', { id: filterId, updates })
}

function removeFilter(filterId) {
  emit('remove-filter', filterId)
}

function resetFilters() {
  emit('reset')
}
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar__scroll">
      <div class="filter-bar__scroll-inner">
        <div class="flex items-center gap-1.5">
          <template v-if="activeSort">
            <div class="flex items-center gap-1">
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

              <button
                type="button"
                class="flex items-center justify-center w-7 h-7 text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
                @click="emit('toggle-sort-direction', activeSort)"
                :title="activeSort.sort === 'asc' ? t('common.ascending', 'Ascending') : t('common.descending', 'Descending')"
              >
                <component :is="activeSort.sort === 'asc' ? ArrowUp : ArrowDown" class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>

          <template v-else>
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

        <div v-if="activeFilters.length > 0" class="filter-bar__pills">
          <div
            v-for="filter in activeFilters"
            :key="filter.id"
            class="filter-pill"
          >
            <div class="filter-pill__segment filter-pill__segment--label bg-white">
              <slot name="filter-label" :filter="filter">
                <span>{{ filter.label }}</span>
              </slot>
            </div>

            <div class="filter-pill__separator"></div>

            <DropdownMenu
              class="h-full inline-flex items-center"
              :items="getOperatorsForColumn(filter.column).map((op) => ({ id: op.id, label: op.label, action: () => updateFilter(filter.id, { operator: op.id }) }))"
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

            <div class="filter-pill__separator"></div>

            <div class="filter-pill__segment filter-pill__segment--value flex items-center h-full">
              <slot
                name="filter-value"
                v-bind="{
                  filter,
                  filterSummary: getFilterSummary(filter),
                  updateFilter
                }"
              >
                <template v-if="filter.type === 'text'">
                  <input
                    type="text"
                    :value="filter.value"
                    class="filter-pill__input bg-transparent border-0 outline-none text-[13px] text-gray-700 min-w-[80px] px-2 h-full placeholder:text-gray-400"
                    :placeholder="t('tasks.enterValue', 'Enter value...')"
                    @input="(event) => updateFilter(filter.id, { value: event.target.value })"
                    @click.stop
                  />
                </template>

                <template v-else-if="filter.type === 'select'">
                  <DropdownMenu
                    class="h-full inline-flex items-center"
                    :items="getSelectMenuItems(filter)"
                    position="left"
                    contentPosition="before"
                    :openUp="true"
                  >
                    <template #trigger>
                      <button
                        type="button"
                        class="filter-pill__input flex items-center justify-center gap-1.5 px-2.5 h-full whitespace-nowrap focus:outline-none hover:bg-gray-200 transition-colors"
                      >
                        <span :class="filter.value !== null && filter.value !== undefined && filter.value !== '' ? 'text-primary-600 font-medium' : 'text-gray-500'">
                          {{ getFilterSummary(filter) !== '...' ? getFilterSummary(filter) : getSelectPlaceholder(filter) }}
                        </span>
                      </button>
                    </template>
                  </DropdownMenu>
                </template>
              </slot>
            </div>

            <div class="filter-pill__separator bg-white"></div>

            <button
              type="button"
              class="filter-pill__segment filter-pill__segment--remove text-gray-400 bg-white hover:bg-gray-50 hover:text-red-500 transition-colors focus:bg-gray-50 focus:outline-none"
              @click.stop="removeFilter(filter.id)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

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
              :title="t('tasks.addFilter', 'Add filter')"
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

    <button
      type="button"
      class="filter-bar__reset"
      :disabled="activeFilters.length === 0"
      @click="resetFilters"
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
  flex-wrap: wrap;
  gap: 4px;
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  padding-bottom: 0;
}

.filter-bar__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500, #6b7280);
  border: 1px solid #d1d5db;
  border-radius: 4px;
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
  gap: 4px;
  padding: 4px 8px;
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
  gap: 4px;
  flex-wrap: wrap;
}

.filter-pill {
  display: inline-flex;
  align-items: stretch;
  position: relative;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  height: 26px;
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
  padding: 0 6px;
  color: var(--color-gray-600, #4b5563);
}

.filter-pill__segment--action {
  padding: 0 6px;
  cursor: pointer;
  height: 100%;
}

.filter-pill__segment--value {
  padding: 0;
  background: #f3f4f6;
  min-width: 60px;
}

.filter-pill__input {
  width: 100%;
  background: transparent;
  border: none;
}

.filter-pill__segment--remove {
  padding: 0 6px;
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
