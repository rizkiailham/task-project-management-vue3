<script setup>
import { computed, useSlots } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown
} from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { useUIStore } from '@/stores'

const slots = useSlots()
const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  pageSize: {
    type: Number,
    default: 10
  },
  pageSizeOptions: {
    type: Array,
    default: () => [10, 20, 40, 80, 100]
  },
  totalItems: {
    type: Number,
    default: undefined
  },
  // If true, the footer will be sticky at the bottom with dynamic left offset
  fixed: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'change-page'])

const uiStore = useUIStore()

const visiblePages = computed(() => {
  const maxVisible = 5
  const total = props.totalPages
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  
  if (end > total) {
    end = total
    start = end - maxVisible + 1
  }
  
  return Array.from({ length: maxVisible }, (_, i) => start + i)
})

const isFirstPage = computed(() => props.currentPage <= 1)
const isLastPage = computed(() => props.currentPage >= props.totalPages)
const showPagination = computed(() => {
  // If totalItems is provided, use it to decide visibility.
  // Otherwise rely on totalPages > 1.
  // The user requirement: "make sure to always hide if the total items is not meet the requirmenet to show the pagination."
  // If totalItems is <= pageSize, we generally don't need pagination.
  if (props.totalItems !== undefined) {
    return props.totalItems > props.pageSize
  }
  return props.totalPages > 1
})

const hasFilters = computed(() => !!slots.filters)

const pageSizeItems = computed(() => props.pageSizeOptions.map((limit) => ({
  id: `limit-${limit}`,
  label: String(limit),
  action: () => changePageSize(limit)
})))

function goToPage(page) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return
  emit('update:currentPage', page)
  emit('change-page', page)
}

function goToFirst() {
  goToPage(1)
}

function goToLast() {
  goToPage(props.totalPages)
}

function goToPrev() {
  goToPage(props.currentPage - 1)
}

function goToNext() {
  goToPage(props.currentPage + 1)
}

function changePageSize(size) {
  emit('update:pageSize', size)
}
</script>

<template>
  <div 
    v-if="showPagination || hasFilters" 
    class="footer-bar"
    :class="{ 'footer-fixed': fixed }"
    :style="fixed ? { left: uiStore.sidebarWidth } : {}"
  >
    <!-- Left: Filters or custom content -->
    <div class="footer-filters">
        <slot name="filters"></slot>
    </div>

    <!-- Right: Pagination Controls -->
    <div v-if="showPagination" class="footer-pagination">
      <div class="flex items-center gap-1">
        <!-- First Page -->
        <button
          @click="goToFirst"
          :disabled="isFirstPage"
          class="pagination-btn"
          :class="{ 'pagination-btn-disabled': isFirstPage }"
          title="First page"
        >
          <ChevronsLeft class="w-4 h-4" />
        </button>
        
        <!-- Previous Page -->
        <button
          @click="goToPrev"
          :disabled="isFirstPage"
          class="pagination-btn"
          :class="{ 'pagination-btn-disabled': isFirstPage }"
          title="Previous page"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        
        <!-- Page Numbers -->
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="pagination-btn pagination-page"
          :class="{ 'pagination-page-active': page === props.currentPage }"
        >
          {{ page }}
        </button>
        
        <!-- Next Page -->
        <button
          @click="goToNext"
          :disabled="isLastPage"
          class="pagination-btn"
          :class="{ 'pagination-btn-disabled': isLastPage }"
          title="Next page"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        
        <!-- Last Page -->
        <button
          @click="goToLast"
          :disabled="isLastPage"
          class="pagination-btn"
          :class="{ 'pagination-btn-disabled': isLastPage }"
          title="Last page"
        >
          <ChevronsRight class="w-4 h-4" />
        </button>
        
        <!-- Page Size Selector -->
        <div class="page-size-selector ml-2">
           <DropdownMenu :items="pageSizeItems" position="right" width="6rem" :openUp="true">
             <template #trigger>
               <button class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                 {{ pageSize }}
                 <ChevronDown class="w-3 h-3 text-gray-400" />
               </button>
             </template>
           </DropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 0 16px;
  width: 100%;
}

.footer-fixed {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 101;
  /* left is set dynamically */
  transition: left 0.3s ease;
  width: auto; /* Fix for cutoff on right edge when left offset is present */
}

.footer-filters {
  display: flex;
  align-items: center;
}

.footer-pagination {
  display: flex;
  align-items: center;
  margin-left: auto; /* Push to right if not using justify-between logic on parent, but parent uses justify-between */
}

.pagination-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #ffffff;
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

.pagination-btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: #f9fafb;
}

.pagination-page {
  min-width: 32px;
  font-size: 0.75rem;
  font-weight: var(--font-weight-medium);
}

.pagination-page-active {
  background-color: #f3f4f6;
  color: var(--color-gray-500);
  border-color: #d1d5db;
}
</style>




