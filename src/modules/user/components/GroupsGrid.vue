<script setup>
/**
 * GroupsGrid - AG Grid component for displaying groups table
 */
import { computed, ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import SortHeader from '@/components/ag/SortHeader.vue'

import GroupNameCell from './cells/GroupNameCell.vue'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const props = defineProps({
  groups: { type: Array, default: () => [] },
  meta: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      totalItems: 0
    })
  }
})

const emit = defineEmits(['edit', 'delete', 'paginationChange'])

const rowData = ref([])
const pageSizeOptions = [10, 20, 50]
const pageSize = ref(10)
const currentPage = ref(1)
const totalPages = ref(1)

const showPagination = computed(() => {
  const totalItems = props.meta?.totalItems || 0
  const itemsPerPage = props.meta?.itemsPerPage || pageSize.value
  return (props.meta?.totalPages || 1) > 1 || totalItems > itemsPerPage
})

watch(
  () => props.groups,
  (groups) => {
    if (!groups || groups.length === 0) {
      rowData.value = []
      return
    }

    rowData.value = groups.map((group) => ({
      ...group,
      count:
        group.totalMembers ??
        group.userCount ??
        group.count ??
        group.membersCount ??
        group.users?.length ??
        group.members?.length ??
        0
    }))
  },
  { immediate: true, deep: true }
)

watch(
  () => props.meta,
  (meta) => {
    currentPage.value = meta?.currentPage || 1
    totalPages.value = meta?.totalPages || 1
    if (meta?.itemsPerPage && meta.itemsPerPage !== pageSize.value) {
      pageSize.value = meta.itemsPerPage
    }
  },
  { immediate: true, deep: true }
)

function emitPaginationChange(page, limit) {
  emit('paginationChange', { page, limit })
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  emitPaginationChange(page, pageSize.value)
}

function goToFirst() {
  if (currentPage.value <= 1) return
  emitPaginationChange(1, pageSize.value)
}

function goToLast() {
  if (currentPage.value >= totalPages.value) return
  emitPaginationChange(totalPages.value, pageSize.value)
}

function goToPrev() {
  if (currentPage.value <= 1) return
  emitPaginationChange(currentPage.value - 1, pageSize.value)
}

function goToNext() {
  if (currentPage.value >= totalPages.value) return
  emitPaginationChange(currentPage.value + 1, pageSize.value)
}

function changePageSize(newSize) {
  pageSize.value = newSize
  emitPaginationChange(1, newSize)
}
function handleEdit(group) {
  emit('edit', group)
}

function handleDelete(group) {
  emit('delete', group)
}

const columnDefs = ref([
  {
    field: 'name',
    headerName: 'Name',
    flex: 1.5,
    minWidth: 260,
    cellRenderer: GroupNameCell,
    cellRendererParams: {
      onEdit: handleEdit,
      onDelete: handleDelete
    }
  },
  {
    field: 'count',
    headerName: 'Count',
    width: 120,
    sortable: true,
    filter: 'agNumberColumnFilter'
  },
  {
    field: 'description',
    headerName: 'Description',
    flex: 2,
    minWidth: 300
  }
])

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  suppressMenu: true,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader'
}

const myTheme = themeQuartz.withParams({
  accentColor: '#3b82f6',
  backgroundColor: '#FFFFFF',
  borderColor: '#e5e7eb',
  borderRadius: 0,
  browserColorScheme: 'light',
  cellHorizontalPaddingScale: 1,
  chromeBackgroundColor: '#FFFFFF',
  columnBorder: false,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 13,
  foregroundColor: '#374151',
  headerBackgroundColor: '#f9fafb',
  headerFontSize: 12,
  headerFontWeight: 600,
  headerTextColor: '#6B7280',
  rowBorder: true,
  rowVerticalPaddingScale: 1,
  spacing: 8,
  wrapperBorder: false,
  wrapperBorderRadius: 0
})

const getRowId = (params) => params.data?.id

const gridComponents = {
  SortHeader
}
</script>

<template>
  <div class="groups-grid-wrapper">
    <div class="groups-grid">
      <ag-grid-vue
        class="ag-theme-quartz w-full h-full"
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :theme="myTheme"
        :components="gridComponents"
        :getRowId="getRowId"
        :rowHeight="52"
        :headerHeight="40"
        :suppressCellFocus="true"
        :suppressRowClickSelection="true"
      />
    </div>
    <div v-if="showPagination" class="footer-bar">
      <div class="footer-pagination">
        <div class="flex items-center gap-1">
          <button
            @click="goToFirst"
            :disabled="currentPage <= 1"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': currentPage <= 1 }"
            title="First page"
          >
            <ChevronsLeft class="w-4 h-4" />
          </button>
          <button
            @click="goToPrev"
            :disabled="currentPage <= 1"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': currentPage <= 1 }"
            title="Previous page"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-xs text-gray-500 px-2">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            @click="goToNext"
            :disabled="currentPage >= totalPages"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': currentPage >= totalPages }"
            title="Next page"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
          <button
            @click="goToLast"
            :disabled="currentPage >= totalPages"
            class="pagination-btn"
            :class="{ 'pagination-btn-disabled': currentPage >= totalPages }"
            title="Last page"
          >
            <ChevronsRight class="w-4 h-4" />
          </button>
          <div class="page-size-selector ml-2">
            <select
              :value="pageSize"
              @change="changePageSize(Number($event.target.value))"
              class="page-size-select"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
            <ChevronDown class="w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups-grid-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 108px);
  position: relative;
}

.groups-grid {
  width: 100%;
  height: calc(100% - 52px);
  display: flex;
  flex-direction: column;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width, 280px);
  right: 0;
  z-index: 101;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 52px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.footer-pagination {
  display: flex;
  align-items: center;
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
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.pagination-btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: #f9fafb;
}

.page-size-selector {
  position: relative;
  display: flex;
  align-items: center;
}

.page-size-select {
  appearance: none;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 28px 6px 10px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  height: 32px;
  transition: all 0.15s ease;
}

.page-size-select:hover {
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.page-size-selector .w-3 {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

:deep(.ag-theme-quartz) {
  --ag-row-hover-color: #fefce8;
  --ag-header-height: 44px;
  --ag-borders: none;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.ag-theme-quartz .ag-root-wrapper) {
  border: none;
  border-radius: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Sticky Header */
:deep(.ag-theme-quartz .ag-header) {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

:deep(.ag-theme-quartz .ag-header-row) {
  font-weight: 500;
  font-size: 13px;
}

:deep(.ag-theme-quartz .ag-header-cell) {
  padding-left: 16px;
  padding-right: 16px;
}

:deep(.ag-theme-quartz .ag-header-cell-text) {
  color: #374151;
}

:deep(.ag-theme-quartz .ag-header-icon) {
  color: #9ca3af;
}

/* Body viewport - scrollable area */
:deep(.ag-theme-quartz .ag-body-viewport) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

:deep(.ag-theme-quartz .ag-row) {
  border-bottom: 1px solid #f3f4f6;
}

:deep(.ag-theme-quartz .ag-row-hover) {
  background-color: #fefce8 !important;
}

:deep(.ag-theme-quartz .ag-cell) {
  padding-left: 16px;
  padding-right: 16px;
  display: flex;
  align-items: center;
  border: none !important;
}

:deep(.ag-theme-quartz .ag-cell:focus),
:deep(.ag-theme-quartz .ag-cell-focus) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Hide the menu button until hover */
:deep(.ag-theme-quartz .ag-header-cell-menu-button) {
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(.ag-theme-quartz .ag-header-cell:hover .ag-header-cell-menu-button) {
  opacity: 1;
}

/* Sort icons */
:deep(.ag-theme-quartz .ag-sort-indicator-icon) {
  color: #9ca3af;
}
</style>
