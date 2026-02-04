<script setup>
/**
 * BulletinGrid - AG Grid component for displaying bulletins table
 */
import { computed, ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { ChevronDown } from 'lucide-vue-next'
import Pagination from '@/components/ui/Pagination.vue'
import SortHeader from '@/components/ag/SortHeader.vue'

import BulletinThumbnailCell from './cells/BulletinThumbnailCell.vue'
import BulletinTitleCell from './cells/BulletinTitleCell.vue'
import BulletinStatusCell from './cells/BulletinStatusCell.vue'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const props = defineProps({
  bulletins: { type: Array, default: () => [] },
  meta: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      totalItems: 0
    })
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'content', 'delete', 'paginationChange'])

const gridApi = ref(null)
const rowData = ref([])

const sortBy = ref('updatedAt')
const orderBy = ref('DESC')

watch(
  () => props.bulletins,
  (items) => {
    if (!items || items.length === 0) {
      rowData.value = []
      return
    }

    rowData.value = items.map((item) => ({
      ...item,
      categoryName: item.category?.name || item.categoryName || '-'
    }))
  },
  { immediate: true, deep: true }
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${day} ${month}, ${date.getFullYear()}`
}

function handleEdit(item) {
  emit('edit', item)
}

function handleContent(item) {
  emit('content', item)
}

function handleDelete(item) {
  emit('delete', item)
}

const columnDefs = ref([
  {
    headerName: '',
    field: 'thumbnail',
    width: 70,
    sortable: false,
    filter: false,
    suppressMenu: true,
    cellRenderer: BulletinThumbnailCell
  },
  {
    field: 'title',
    headerName: 'Title',
    flex: 2.4,
    minWidth: 360,
    cellRenderer: BulletinTitleCell,
    cellRendererParams: {
      onEdit: handleEdit,
      onContent: handleContent,
      onDelete: handleDelete
    }
  },
  {
    field: 'categoryName',
    headerName: 'Category',
    width: 180
  },
  {
    field: 'isPublished',
    headerName: 'Status',
    width: 120,
    cellRenderer: BulletinStatusCell
  },
  {
    field: 'updatedAt',
    headerName: 'Last modified',
    width: 160,
    valueFormatter: (params) => formatDate(params.value)
  },
  {
    headerName: '',
    field: 'actions',
    width: 80,
    sortable: false,
    filter: false,
    suppressMenu: true,
    hide: true
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

const pageSizeOptions = [10, 20, 50]
const pageSize = ref(10)

watch(
  () => props.meta?.itemsPerPage,
  (newSize) => {
    if (newSize && newSize !== pageSize.value) {
      pageSize.value = newSize
    }
  },
  { immediate: true }
)

function emitPaginationChange(page, limit) {
  emit('paginationChange', {
    page,
    limit,
    sortBy: sortBy.value,
    orderBy: orderBy.value
  })
}

const currentPage = ref(1)
const totalPages = ref(1)
const showPagination = computed(() => {
  const totalItems = props.meta?.totalItems || 0
  const itemsPerPage = props.meta?.itemsPerPage || pageSize.value
  return (props.meta?.totalPages || 1) > 1 || totalItems > itemsPerPage
})

watch(
  () => props.meta,
  (meta) => {
    currentPage.value = meta?.currentPage || 1
    totalPages.value = meta?.totalPages || 1
  },
  { immediate: true, deep: true }
)

const isFirstPage = ref(false)
const isLastPage = ref(false)

watch([currentPage, totalPages], () => {
  isFirstPage.value = currentPage.value <= 1
  isLastPage.value = currentPage.value >= totalPages.value
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  emitPaginationChange(page, pageSize.value)
}

function goToFirst() {
  if (isFirstPage.value) return
  emitPaginationChange(1, pageSize.value)
}

function goToLast() {
  if (isLastPage.value) return
  emitPaginationChange(totalPages.value, pageSize.value)
}

function goToPrev() {
  if (isFirstPage.value) return
  emitPaginationChange(currentPage.value - 1, pageSize.value)
}

function goToNext() {
  if (isLastPage.value) return
  emitPaginationChange(currentPage.value + 1, pageSize.value)
}

function changePageSize(newSize) {
  pageSize.value = newSize
  if (gridApi.value) {
    gridApi.value.setGridOption('paginationPageSize', newSize)
  }
  emitPaginationChange(1, newSize)
}

function onSortChanged() {
  if (!gridApi.value) return
  const sortModel = gridApi.value.getColumnState()
    .filter((col) => col.sort)
    .map((col) => ({ colId: col.colId, sort: col.sort }))

  if (sortModel.length > 0) {
    sortBy.value = sortModel[0].colId
    orderBy.value = sortModel[0].sort.toUpperCase()
  } else {
    sortBy.value = 'updatedAt'
    orderBy.value = 'DESC'
  }

  emitPaginationChange(1, pageSize.value)
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

function onGridReady(params) {
  gridApi.value = params.api
}

const getRowId = (params) => params.data?.id

const gridComponents = {
  SortHeader
}
</script>

<template>
  <div class="bulletin-grid-wrapper">
    <div class="bulletin-grid">
      <ag-grid-vue
        class="ag-theme-quartz w-full h-full"
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :theme="myTheme"
        :components="gridComponents"
        :getRowId="getRowId"
        :rowHeight="56"
        :headerHeight="40"
        :suppressCellFocus="true"
        :suppressRowClickSelection="true"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
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
.bulletin-grid-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 108px);
  position: relative;
}

.bulletin-grid {
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



:deep(.ag-theme-quartz .ag-header-icon) {
  color: #9ca3af;
}

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

:deep(.ag-theme-quartz .ag-header-cell-menu-button) {
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(.ag-theme-quartz .ag-header-cell:hover .ag-header-cell-menu-button) {
  opacity: 1;
}

:deep(.ag-theme-quartz .ag-sort-indicator-icon) {
  color: #9ca3af;
}
</style>


