<script setup>
/**
 * UsersGrid - AG Grid component for displaying users table
 */
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import Pagination from '@/components/ui/Pagination.vue'
import GridFilterBar from '@/components/ui/GridFilterBar.vue'
import SortHeader from '@/components/ag/SortHeader.vue'
import { getAvatarColor } from '@/utils/avatarColor'

// Cell renderer components
import NameCell from './cells/NameCell.vue'
import StatusCell from './cells/StatusCell.vue'
import ProjectsCell from './cells/ProjectsCell.vue'

const { t } = useI18n()

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const props = defineProps({
  users: { type: Array, default: () => [] },
  meta: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      totalItems: 0
    })
  },
  roleOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit', 'delete', 'resendInvite', 'filter', 'paginationChange', 'sortChange'])

const gridApi = ref(null)
const rowData = ref([])

// Sort state
const sortBy = ref('createdAt')
const orderBy = ref('DESC')
const currentSort = ref([])

// Filter state
const activeFilters = ref([])
let filterSequence = 0

const TEXT_OPERATORS = [
  { id: 'contains', label: 'contains' },
  { id: 'not_contains', label: 'does not contain' },
  { id: 'is', label: 'is' },
  { id: 'is_not', label: 'is not' }
]

const SELECT_OPERATORS = [
  { id: 'is', label: 'is' }
]

const statusOptions = computed(() => ([
  { id: null, label: `${t('common.all', 'All')} ${t('taskDetail.status', 'Status')}` },
  { id: true, label: t('users.fields.active', 'Active') },
  { id: false, label: 'Inactive' }
]))

function formatRoleLabel(name) {
  if (name === 'super_admin') return 'Super Admin'
  return name
}

const roleOptionItems = computed(() => ([
  { id: null, label: `${t('common.all', 'All')} ${t('users.fields.role', 'Role')}` },
  ...props.roleOptions.map((role) => ({
    id: role.id,
    label: formatRoleLabel(role.name || role.label || role.value || role.id)
  }))
]))

const filterableColumns = computed(() => ([
  { id: 'fullName', label: 'Name', type: 'text' },
  { id: 'status', label: t('taskDetail.status', 'Status'), type: 'select' },
  { id: 'updatedAt', label: 'Last activity', type: 'text' },
  { id: 'projects', label: 'Project', type: 'text' },
  { id: 'role', label: t('users.fields.role', 'Role'), type: 'select' }
]))

const sortableColumns = computed(() =>
  columnDefs.value
    .filter((column) => column.sortable !== false)
    .map((column) => ({
      id: column.field,
      label: column.headerName
    }))
)

const activeSort = computed(() => {
  return currentSort.value.length > 0 ? currentSort.value[0] : null
})

const sortColumnItems = computed(() => {
  return sortableColumns.value.map((column) => ({
    type: 'item',
    label: column.label,
    key: column.id,
    items: [
      {
        type: 'item',
        label: t('common.ascending', 'Ascending'),
        key: `${column.id}:asc`,
        active: isSortActive(column.id, 'asc')
      },
      {
        type: 'item',
        label: t('common.descending', 'Descending'),
        key: `${column.id}:desc`,
        active: isSortActive(column.id, 'desc')
      }
    ]
  }))
})

function isSortActive(colId, direction) {
  const sort = currentSort.value.find((state) => state.colId === colId)
  return sort ? sort.sort === direction : false
}

function getColumnConfig(columnId) {
  return filterableColumns.value.find((column) => column.id === columnId) || null
}

function getOperatorsForColumn(columnId) {
  const column = getColumnConfig(columnId)
  return column?.type === 'select' ? SELECT_OPERATORS : TEXT_OPERATORS
}

function getOperatorLabel(filter) {
  const operator = getOperatorsForColumn(filter.column).find((item) => item.id === filter.operator)
  return operator?.label || filter.operator
}

function addFilter(columnId) {
  const column = getColumnConfig(columnId)
  if (!column) return null

  const existing = activeFilters.value.find((filter) => filter.column === columnId)
  if (existing) {
    return existing.id
  }

  const operators = getOperatorsForColumn(columnId)
  const nextFilter = {
    id: `filter-${++filterSequence}`,
    column: columnId,
    type: column.type,
    operator: operators[0]?.id || 'is',
    value: column.type === 'select' ? null : '',
    label: column.label
  }

  activeFilters.value = [...activeFilters.value, nextFilter]
  return nextFilter.id
}

function handleAddFilter(columnId) {
  addFilter(columnId)
}

function isServerFilterColumn(columnId) {
  return columnId === 'status' || columnId === 'role'
}

function emitServerFilters() {
  const statusFilter = activeFilters.value.find((filter) => filter.column === 'status')
  const roleFilter = activeFilters.value.find((filter) => filter.column === 'role')

  emit('filter', {
    isActive: statusFilter?.value ?? null,
    roleId: roleFilter?.value ?? null
  })
}

function removeFilter(filterId) {
  const target = activeFilters.value.find((filter) => filter.id === filterId)
  if (!target) return

  activeFilters.value = activeFilters.value.filter((filter) => filter.id !== filterId)
  if (isServerFilterColumn(target.column)) {
    emitServerFilters()
  }
}

function updateFilter(filterId, updates) {
  const target = activeFilters.value.find((filter) => filter.id === filterId)
  if (!target) return

  activeFilters.value = activeFilters.value.map((filter) => {
    if (filter.id !== filterId) return filter
    return { ...filter, ...updates }
  })

  if (isServerFilterColumn(target.column) && Object.prototype.hasOwnProperty.call(updates, 'value')) {
    emitServerFilters()
  }
}

function clearFilters() {
  if (!activeFilters.value.length) return
  const hadServerFilter = activeFilters.value.some((filter) => isServerFilterColumn(filter.column))
  activeFilters.value = []
  if (hadServerFilter) {
    emitServerFilters()
  }
}

function getStatusLabel(statusId) {
  return statusOptions.value.find((option) => option.id === statusId)?.label || t('taskDetail.status', 'Status')
}

function getRoleLabel(roleId) {
  return roleOptionItems.value.find((option) => String(option.id) === String(roleId))?.label || t('users.fields.role', 'Role')
}

function getFilterSummary(filter) {
  if (filter.type === 'text') {
    return filter.value ? String(filter.value) : '...'
  }

  if (filter.column === 'status') {
    return getStatusLabel(filter.value)
  }

  if (filter.column === 'role') {
    return getRoleLabel(filter.value)
  }

  return filter.value ? String(filter.value) : '...'
}

function getStatusMenuItems(filter) {
  return statusOptions.value.map((option) => ({
    key: `status-${String(option.id)}`,
    label: option.label,
    action: () => updateFilter(filter.id, { value: option.id })
  }))
}

function getRoleMenuItems(filter) {
  return roleOptionItems.value.map((option) => ({
    key: `role-${String(option.id)}`,
    label: option.label,
    action: () => updateFilter(filter.id, { value: option.id })
  }))
}

function getSelectMenuItems(filter) {
  if (filter?.column === 'status') return getStatusMenuItems(filter)
  if (filter?.column === 'role') return getRoleMenuItems(filter)
  return []
}

function getSelectPlaceholder(filter) {
  if (filter?.column === 'status') return t('tasks.selectStatus', 'Select status...')
  if (filter?.column === 'role') return t('users.placeholders.role', 'Select role')
  return t('tasks.enterValue', 'Enter value...')
}

function handleFilterUpdate(payload) {
  if (!payload?.id || !payload?.updates) return
  updateFilter(payload.id, payload.updates)
}

function getFilterCellValue(row, column) {
  if (!row) return ''

  switch (column) {
    case 'fullName':
      return row.fullName || ''
    case 'status':
      return row.isActive
    case 'updatedAt':
      return formatDate(row.updatedAt)
    case 'projects':
      return Array.isArray(row.projects) ? row.projects.join(', ') : ''
    case 'role':
      return row.roleId ?? ''
    default:
      return row[column] || ''
  }
}

function matchTextFilter(cellValue, operator, value) {
  const search = String(value || '').toLowerCase().trim()
  if (!search) return true

  const content = String(cellValue || '').toLowerCase()
  switch (operator) {
    case 'contains':
      return content.includes(search)
    case 'not_contains':
      return !content.includes(search)
    case 'is':
      return content === search
    case 'is_not':
      return content !== search
    default:
      return true
  }
}

function matchSelectFilter(cellValue, value) {
  if (value === null || value === undefined || value === '') return true
  return String(cellValue) === String(value)
}

function matchesFilter(row, filter) {
  if (!filter) return true

  if (filter.type === 'text' && !String(filter.value || '').trim()) {
    return true
  }

  if (filter.type === 'select' && (filter.value === null || filter.value === undefined || filter.value === '')) {
    return true
  }

  const cellValue = getFilterCellValue(row, filter.column)
  if (filter.type === 'select') {
    return matchSelectFilter(cellValue, filter.value)
  }
  return matchTextFilter(cellValue, filter.operator, filter.value)
}

const filteredRowData = computed(() => {
  if (!activeFilters.value.length) return rowData.value
  return rowData.value.filter((row) => activeFilters.value.every((filter) => matchesFilter(row, filter)))
})

function openFilterForColumn(columnId) {
  addFilter(columnId)
}

const gridContext = {
  openFilterForColumn
}

function handleSortSelect(item) {
  if (!item?.key || !gridApi.value) return

  const [colId, direction] = item.key.split(':')
  if (!colId || !direction) return

  gridApi.value.applyColumnState({
    state: [{ colId, sort: direction }],
    defaultState: { sort: null }
  })
}

function toggleSortDirection(sortState) {
  if (!gridApi.value || !sortState?.colId) return
  const nextSort = sortState.sort === 'asc' ? 'desc' : 'asc'
  gridApi.value.applyColumnState({
    state: [{ colId: sortState.colId, sort: nextSort }],
    defaultState: { sort: null }
  })
}

function getColumnLabel(colId) {
  const column = sortableColumns.value.find((item) => item.id === colId)
  return column ? column.label : colId
}

// Pagination state from props (server-side)
const pageSize = ref(10)
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)

function updatePagination() {
  if (!gridApi.value) return
  currentPage.value = gridApi.value.paginationGetCurrentPage() + 1
  totalItems.value = gridApi.value.paginationGetRowCount()
}

watch(() => props.meta?.totalPages, (newTotalPages) => {
  if (newTotalPages) {
    totalPages.value = newTotalPages
  }
}, { immediate: true })

function handlePageChange(page) {
  if (!gridApi.value) return
  gridApi.value.paginationGoToPage(page - 1)
  emit('paginationChange', {
    page,
    limit: pageSize.value,
    sortBy: sortBy.value,
    orderBy: orderBy.value
  })
}

function handlePageSizeChange(newSize) {
  pageSize.value = newSize
  if (gridApi.value) {
    gridApi.value.setGridOption('paginationPageSize', newSize)
    emit('paginationChange', {
      page: 1,
      limit: newSize,
      sortBy: sortBy.value,
      orderBy: orderBy.value
    })
  }
}

// Handle AG Grid sort change
function onSortChanged() {
  if (!gridApi.value) return

  const sortModel = gridApi.value.getColumnState()
    .filter((col) => col.sort)
    .map((col) => ({ colId: col.colId, sort: col.sort }))

  currentSort.value = sortModel.slice(0, 1)

  if (sortModel.length > 0) {
    const fieldMapping = {
      fullName: 'first_name',
      status: 'is_active',
      updatedAt: 'updated_at',
      createdAt: 'created_at'
    }

    sortBy.value = fieldMapping[sortModel[0].colId] || sortModel[0].colId
    orderBy.value = sortModel[0].sort.toUpperCase()
  } else {
    sortBy.value = 'createdAt'
    orderBy.value = 'DESC'
  }

  emit('sortChange', {
    sortBy: sortBy.value,
    orderBy: orderBy.value
  })

  emit('paginationChange', {
    page: currentPage.value,
    limit: pageSize.value,
    sortBy: sortBy.value,
    orderBy: orderBy.value
  })
}

// Sync page size from props
watch(() => props.meta?.itemsPerPage, (newSize) => {
  if (newSize && newSize !== pageSize.value) {
    pageSize.value = newSize
    if (gridApi.value) {
      gridApi.value.setGridOption('paginationPageSize', newSize)
    }
  }
}, { immediate: true })

// Sync current page from props
watch(() => props.meta?.currentPage, (newPage) => {
  if (newPage && newPage !== currentPage.value) {
    currentPage.value = newPage
    if (gridApi.value) {
      gridApi.value.paginationGoToPage(newPage - 1)
    }
  }
}, { immediate: true })

// Transform users data for the grid
watch(
  [() => props.users, () => props.meta],
  ([users]) => {
    if (!users || users.length === 0) {
      rowData.value = []
      return
    }

    rowData.value = users.map((user) => {
      let projectNames = []
      if (user.projects && Array.isArray(user.projects)) {
        projectNames = user.projects.map((project) => typeof project === 'string' ? project : project.name).filter(Boolean)
      }

      return {
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        status: user.isActive ? 'Active' : (user.status || 'Invited'),
        avatarColor: getAvatarColor(`${user.firstName || ''} ${user.lastName || ''}`),
        avatar: user.avatar,
        projects: projectNames,
        roleId: user.roleId ?? user.role?.id ?? null
      }
    })

    if (gridApi.value) {
      gridApi.value.setGridOption('paginationPageSize', pageSize.value)
      gridApi.value.setGridOption('paginationTotalRowCount', props.meta?.totalItems || 0)
      updatePagination()
    }
  },
  { immediate: true, deep: true }
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) return 'Today'
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Handlers for cell actions
function handleEdit(user) {
  emit('edit', user)
}

function handleResendInvite(user) {
  emit('resendInvite', user)
}

function handleDelete(user) {
  emit('delete', user)
}

// Column definitions
const columnDefs = ref([
  {
    field: 'fullName',
    headerName: 'Name',
    flex: 2,
    minWidth: 280,
    cellRenderer: NameCell,
    cellRendererParams: {
      onEdit: handleEdit,
      onResendInvite: handleResendInvite,
      onDelete: handleDelete
    }
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: StatusCell
  },
  {
    field: 'updatedAt',
    headerName: 'Last activity',
    width: 160,
    valueFormatter: (params) => formatDate(params.value)
  },
  {
    field: 'projects',
    headerName: 'Project',
    flex: 1.5,
    minWidth: 200,
    cellRenderer: ProjectsCell
  }
])

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader'
}

// Custom theme
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
  gridApi.value.setGridOption('pagination', true)
  gridApi.value.setGridOption('paginationPageSize', pageSize.value)
  gridApi.value.setGridOption('paginationTotalRowCount', props.meta?.totalItems || 0)
  updatePagination()
}

const getRowId = (params) => params.data?.id

const gridComponents = {
  SortHeader
}
</script>

<template>
  <div class="users-grid-wrapper">
    <div class="users-grid">
      <ag-grid-vue
        class="ag-theme-quartz w-full h-full"
        :rowData="filteredRowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :theme="myTheme"
        :components="gridComponents"
        :context="gridContext"
        :getRowId="getRowId"
        :rowHeight="52"
        :headerHeight="40"
        :suppressCellFocus="true"
        :suppressRowClickSelection="true"
        :suppressPaginationPanel="true"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
        @pagination-changed="updatePagination"
      />
    </div>
    <!-- Fixed Footer - Filter buttons on left, Pagination on right -->
    <Pagination
      v-model:currentPage="currentPage"
      :totalPages="totalPages"
      :pageSize="pageSize"
      @update:pageSize="handlePageSizeChange"
      @change-page="handlePageChange"
      :totalItems="props.meta?.total || props.meta?.totalItems || 0"
      :fixed="false"
    >
      <template #filters>
        <GridFilterBar
          :activeSort="activeSort"
          :sortColumnItems="sortColumnItems"
          :getColumnLabel="getColumnLabel"
          :activeFilters="activeFilters"
          :filterableColumns="filterableColumns"
          :getOperatorsForColumn="getOperatorsForColumn"
          :getOperatorLabel="getOperatorLabel"
          :getFilterSummary="getFilterSummary"
          :getSelectMenuItems="getSelectMenuItems"
          :getSelectPlaceholder="getSelectPlaceholder"
          @sort-select="handleSortSelect"
          @toggle-sort-direction="toggleSortDirection"
          @add-filter="handleAddFilter"
          @update-filter="handleFilterUpdate"
          @remove-filter="removeFilter"
          @reset="clearFilters"
        />
      </template>
    </Pagination>
  </div>
</template>

<style scoped>
.users-grid-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
}

.users-grid {
  width: 100%;
  flex: 1;
  min-height: 0;
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
  outline: none !important;
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

.ag-theme-quartz .ag-sort-indicator-icon {
  color: var(--color-gray-400);
}

</style>




