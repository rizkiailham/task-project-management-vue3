<script setup>
/**
 * GroupsGrid - AG Grid component for displaying groups table
 */
import { computed, ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { ChevronDown } from 'lucide-vue-next'
import Pagination from '@/components/ui/Pagination.vue'
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
  gridApi.value.setGridOption('paginationPageSize', newSize)
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
    <Pagination
      :currentPage="currentPage"
      :totalPages="totalPages"
      :pageSize="pageSize"
      @update:pageSize="changePageSize"
      @change-page="goToPage"
      :totalItems="props.meta?.total || props.meta?.totalItems || 0"
    />
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



:deep(.ag-theme-quartz) {
  --ag-row-hover-color: #f3f4f6;
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



:deep(.ag-theme-quartz .ag-header-cell) {
  padding-left: 16px;
  padding-right: 16px;
}

:deep(.ag-theme-quartz .ag-header-cell-text) {
}

:deep(.ag-theme-quartz .ag-header-icon) {
  color: var(--color-gray-400);
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
  background-color: #f3f4f6 !important;
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
  color: var(--color-gray-400);
}
</style>




