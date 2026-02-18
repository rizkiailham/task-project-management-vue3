<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

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
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  props.params?.column?.removeEventListener?.('sortChanged', syncSortState)
  document.removeEventListener('click', handleDocumentClick)
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

function applySort(nextSort, event) {
  if (typeof props.params?.setSort === 'function') {
    props.params.setSort(nextSort, event?.shiftKey)
    return
  }
  if (typeof props.params?.column?.setSort === 'function') {
    props.params.column.setSort(nextSort, event?.shiftKey)
  }
}

function handleSortAsc(event) {
  if (!isSortable.value || isDesc.value) return
  applySort(isAsc.value ? null : 'asc', event)
}

function handleSortDesc(event) {
  if (!isSortable.value || isAsc.value) return
  applySort(isDesc.value ? null : 'desc', event)
}

function handleHeaderClick(event) {
  if (!isSortable.value) return
  // Cycle through: null -> asc -> desc -> null
  if (sortState.value === null) {
    applySort('asc', event)
  } else if (sortState.value === 'asc') {
    applySort('desc', event)
  } else {
    applySort(null, event)
  }
}

function handleContextMenu(event) {
  event.preventDefault()
  event.stopPropagation()

  // Position the context menu near the cursor
  const headerEl = event.currentTarget
  const rect = headerEl.getBoundingClientRect()
  contextMenuStyle.value = {
    top: `${rect.bottom + 2}px`,
    left: `${Math.min(event.clientX, window.innerWidth - 200)}px`
  }
  showContextMenu.value = true
}

function handleDocumentClick() {
  if (showContextMenu.value) {
    showContextMenu.value = false
  }
}

function handleMenuFilter() {
  showContextMenu.value = false
  const context = props.params?.context
  if (typeof context?.openFilterForColumn === 'function') {
    context.openFilterForColumn(colId.value)
  }
}

function handleMenuSortAsc() {
  showContextMenu.value = false
  applySort('asc')
}

function handleMenuSortDesc() {
  showContextMenu.value = false
  applySort('desc')
}

function handleMenuHide() {
  showContextMenu.value = false
  const context = props.params?.context
  if (typeof context?.toggleColumnOption === 'function') {
    context.toggleColumnOption(colId.value)
  }
}
</script>

<template>
  <div class="sort-header" @click="handleHeaderClick" @contextmenu="handleContextMenu">
    <span class="sort-header__label">{{ params.displayName }}</span>
    <span v-if="isSortable" class="sort-header__icons">
      <ChevronUp :class="['sort-header__icon', { 'sort-header__icon--active': isAsc }]" />
      <ChevronDown :class="['sort-header__icon', { 'sort-header__icon--active': isDesc }]" />
    </span>

    <!-- Context menu (teleported to body to avoid AG Grid clipping) -->
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="sort-header-context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <button
          v-if="canFilter"
          type="button"
          class="sort-header-context-menu__item"
          @click="handleMenuFilter"
        >
          Filter
        </button>

        <div v-if="canFilter && isSortable" class="sort-header-context-menu__divider" />

        <button
          v-if="isSortable"
          type="button"
          class="sort-header-context-menu__item"
          @click="handleMenuSortAsc"
        >
          Sort ascending
        </button>
        <button
          v-if="isSortable"
          type="button"
          class="sort-header-context-menu__item"
          @click="handleMenuSortDesc"
        >
          Sort descending
        </button>

        <div v-if="canHide" class="sort-header-context-menu__divider" />

        <button
          v-if="canHide"
          type="button"
          class="sort-header-context-menu__item"
          @click="handleMenuHide"
        >
          Hide column
        </button>
      </div>
    </Teleport>
  </div>
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
  gap: 4px;
  width: 100%;
  height: 100%;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
}

.sort-header__label {
  flex: 1 1 0;
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

/* Context menu styles */
.sort-header-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 170px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
}

.sort-header-context-menu__item {
  display: block;
  width: 100%;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
}

.sort-header-context-menu__item:hover {
  background: #f3f4f6;
}

.sort-header-context-menu__divider {
  height: 1px;
  margin: 4px 0;
  background: #e5e7eb;
}
</style>
