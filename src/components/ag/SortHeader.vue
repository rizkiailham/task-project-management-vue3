<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { ChevronDown, ChevronUp, Check, ArrowUp, ArrowDown } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const sortState = ref(props.params?.column?.getSort?.() || null)
const isSortable = computed(() => !!props.params?.column?.isSortable?.())
const showContextMenu = ref(false)
const contextMenuStyle = ref({})

function syncSortState() {
  sortState.value = props.params?.column?.getSort?.() || null
}

onMounted(() => {
  props.params?.column?.addEventListener?.('sortChanged', syncSortState)
})

onBeforeUnmount(() => {
  props.params?.column?.removeEventListener?.('sortChanged', syncSortState)
})

const isAsc = computed(() => sortState.value === 'asc')
const isDesc = computed(() => sortState.value === 'desc')

const colId = computed(() => props.params?.column?.getColId?.() || '')
const canFilter = computed(() => {
  const context = props.params?.context
  return typeof context?.openFilterForColumn === 'function'
})
const canHide = computed(() => {
  const context = props.params?.context
  return typeof context?.toggleColumnOption === 'function'
})

function applySort(nextSort) {
  if (typeof props.params?.setSort === 'function') {
    props.params.setSort(nextSort)
    return
  }
  if (typeof props.params?.column?.setSort === 'function') {
    props.params.column.setSort(nextSort)
  }
}

const menuItems = computed(() => {
  const items = []

  if (canFilter.value) {
    items.push({
      type: 'item',
      label: 'Filter',
      action: handleMenuFilter
    })
    
    // Add separator after Filter as per image
    items.push({ type: 'divider' })
  }

  if (isSortable.value) {
    items.push({
      type: 'item',
      label: 'Sort ascending',
      action: () => applySort('asc'),
      active: isAsc.value
    })
    items.push({
      type: 'item',
      label: 'Sort descending',
      action: () => applySort('desc'),
      active: isDesc.value
    })
    items.push({ type: 'divider' })
  }

  if (canHide.value) {
    // Check if the last item was already a divider to avoid duplicates
    const lastItem = items[items.length - 1]
    if ((canFilter.value || isSortable.value) && lastItem?.type !== 'divider') {
       items.push({ type: 'divider' }) 
    }
    items.push({
      type: 'item',
      label: 'Hide column',
      action: handleMenuHide
    })
  }

  return items
})

function handleMenuFilter() {
  const context = props.params?.context
  if (typeof context?.openFilterForColumn === 'function') {
    context.openFilterForColumn(colId.value)
  }
}

function handleMenuHide() {
  const context = props.params?.context
  if (typeof context?.toggleColumnOption === 'function') {
    context.toggleColumnOption(colId.value)
  }
}
const dropdownRef = ref(null)

function handleContextMenu(event) {
  // Prevent default browser/grid context menu
  // and open our custom dropdown instead
  dropdownRef.value?.open?.()
}
</script>

<template>
  <DropdownMenu
    ref="dropdownRef"
    :items="menuItems"
    position="left"
    width="max-content"
    :openUp="false"
    :style="{ minWidth: '160px' }"
  >
    <template #trigger>
      <div 
        class="sort-header"
        @contextmenu.prevent.stop="handleContextMenu"
      >
        <span class="sort-header__label">{{ params.displayName }}</span>
        <span v-if="isSortable" class="sort-header__icons">
          <ChevronUp :class="['sort-header__icon', { 'sort-header__icon--active': isAsc }]" />
          <ChevronDown :class="['sort-header__icon', { 'sort-header__icon--active': isDesc }]" />
        </span>
      </div>
    </template>
    
    <!-- Custom item template to show checkmark -->
    <template #item="{ item }">
      <div class="flex items-center gap-3">
        <span>{{ item.label }}</span>
      </div>
      <div class="w-4 h-4 flex items-center justify-center shrink-0">
        <Check v-if="item.active" class="w-3.5 h-3.5 text-blue-600" />
      </div>
    </template>
  </DropdownMenu>
</template>

<style>
/* Fix AG Grid header cell wrapper to allow horizontal layout */
.ag-header-cell-comp-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  width: 100% !important;
  overflow: hidden !important;
}

.sort-header {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  height: 100%;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
}

.sort-header__label {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-header__icons {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 12px;
  height: 14px;
}

.sort-header__icon {
  width: 12px;
  height: 12px;
  color: var(--color-gray-400);
  flex-shrink: 0;
  margin: -3px 0;
}

.sort-header__icon--active {
  color: var(--color-gray-700);
}
</style>
