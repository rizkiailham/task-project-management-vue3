<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const sortState = ref(props.params?.column?.getSort?.() || null)
const isSortable = computed(() => !!props.params?.column?.isSortable?.())

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
</script>

<template>
  <div class="sort-header" @click="handleHeaderClick">
    <span class="sort-header__label">{{ params.displayName }}</span>
    <span v-if="isSortable" class="sort-header__icons">
      <ChevronUp :class="['sort-header__icon', { 'sort-header__icon--active': isAsc }]" />
      <ChevronDown :class="['sort-header__icon', { 'sort-header__icon--active': isDesc }]" />
    </span>
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
</style>


