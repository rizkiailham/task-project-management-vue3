<script setup>
/**
 * UsersGrid - AG Grid component for displaying users table
 */
import { ref, watch, h, computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { Settings, Users, SlidersHorizontal, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

// Cell renderer components
import NameCell from './cells/NameCell.vue'
import StatusCell from './cells/StatusCell.vue'
import ProjectsCell from './cells/ProjectsCell.vue'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

// Avatar colors palette
const avatarColors = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
]

function getAvatarColor(name) {
  if (!name) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

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

// Filter state
const selectedStatus = ref(null)
const selectedRole = ref(null)

// Filter options
const statusOptions = [
  { id: null, label: 'All Status' },
  { id: true, label: 'Active' },
  { id: false, label: 'Inactive' },
]

function formatRoleLabel(name) {
  if (name === 'super_admin') return 'Super Admin'
  return name
}

const roleOptionItems = computed(() => ([
  { id: null, label: 'All Roles' },
  ...props.roleOptions.map(role => ({
    id: role.id,
    label: formatRoleLabel(role.name || role.label || role.value || role.id)
  }))
]))

// Get status menu items
const statusMenuItems = computed(() => 
  statusOptions.map(opt => ({
    id: opt.id,
    label: opt.label,
    icon: selectedStatus.value === opt.id ? Check : null,
    action: () => {
      selectedStatus.value = opt.id
      applyFilters()
    }
  }))
)

// Get role menu items
const roleMenuItems = computed(() => 
  roleOptionItems.value.map(opt => ({
    id: opt.id,
    label: opt.label,
    icon: selectedRole.value === opt.id ? Check : null,
    action: () => {
      selectedRole.value = opt.id
      applyFilters()
    }
  }))
)

// Apply filters to grid
function applyFilters() {
  emit('filter', { isActive: selectedStatus.value, roleId: selectedRole.value })
}

// Clear all filters
function clearFilters() {
  selectedStatus.value = null
  selectedRole.value = null
  emit('filter', { isActive: null, roleId: null })
}

// Check if any filters are active
const hasActiveFilters = computed(() => 
  selectedStatus.value !== null || selectedRole.value !== null
)

const selectedStatusLabel = computed(() => {
  return statusOptions.find(opt => opt.id === selectedStatus.value)?.label || 'Status'
})

const selectedRoleLabel = computed(() => {
  return roleOptionItems.value.find(opt => opt.id === selectedRole.value)?.label || 'Role'
})

// Pagination state from props (server-side)
const pageSizeOptions = [10, 20, 50, 100]
const pageSize = ref(10)

// Computed from meta props
const currentPage = computed(() => props.meta?.currentPage || 1)
const totalPages = computed(() => props.meta?.totalPages || 1)

// Visible page numbers (max 5)
const visiblePages = computed(() => {
  const maxVisible = 5
  const total = totalPages.value
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  
  if (end > total) {
    end = total
    start = end - maxVisible + 1
  }
  
  return Array.from({ length: maxVisible }, (_, i) => start + i)
})

const isFirstPage = computed(() => currentPage.value <= 1)
const isLastPage = computed(() => currentPage.value >= totalPages.value)

// Emit pagination change for server-side pagination
function emitPaginationChange(page, limit) {
  emit('paginationChange', {
    page,
    limit,
    sortBy: sortBy.value,
    orderBy: orderBy.value
  })
}

// Pagination control functions (server-side)
function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  emitPaginationChange(page, pageSize.value)
}

function goToFirst() {
  if (currentPage.value === 1) return
  emitPaginationChange(1, pageSize.value)
}

function goToLast() {
  if (currentPage.value === totalPages.value) return
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
  // Reset to page 1 when changing page size
  emitPaginationChange(1, newSize)
}

// Handle AG Grid sort change
function onSortChanged() {
  if (!gridApi.value) return
  
  const sortModel = gridApi.value.getColumnState()
    .filter(col => col.sort)
    .map(col => ({ colId: col.colId, sort: col.sort }))
  
  if (sortModel.length > 0) {
    // Map field names to API field names
    const fieldMapping = {
      'fullName': 'first_name',
      'status': 'is_active',
      'updatedAt': 'updated_at',
      'createdAt': 'created_at'
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
  
  // Also emit pagination change to refetch with new sort
  emitPaginationChange(1, pageSize.value)
}

// Sync page size from props
watch(() => props.meta?.itemsPerPage, (newSize) => {
  if (newSize && newSize !== pageSize.value) {
    pageSize.value = newSize
  }
}, { immediate: true })

// Transform users data for the grid
watch(
  [() => props.users, () => props.meta],
  ([users, meta]) => {
    if (!users || users.length === 0) {
      rowData.value = []
      return
    }
    
    // Calculate the starting index based on current page and items per page
    const startIndex = ((meta?.currentPage || 1) - 1) * (meta?.itemsPerPage || 10)
    
    rowData.value = users.map((user, index) => {
      let projectNames = []
      if (user.projects && Array.isArray(user.projects)) {
        projectNames = user.projects.map(p => typeof p === 'string' ? p : p.name).filter(Boolean)
      }
      
      return {
        ...user,
        rowIndex: startIndex + index + 1,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        status: user.isActive ? 'Active' : (user.status || 'Invited'),
        avatarColor: getAvatarColor(`${user.firstName || ''} ${user.lastName || ''}`),
        projects: projectNames,
      }
    })
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
    field: 'rowIndex',
    headerName: '#',
    width: 64,
    sortable: false,
    filter: false,
    suppressMenu: true,
  },
  {
    field: 'fullName',
    headerName: 'Name',
    flex: 2,
    minWidth: 280,
    cellRenderer: NameCell,
    cellRendererParams: {
      onEdit: handleEdit,
      onResendInvite: handleResendInvite,
      onDelete: handleDelete,
    }
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: StatusCell,
  },
  {
    field: 'updatedAt',
    headerName: 'Last activity',
    width: 160,
    valueFormatter: (params) => formatDate(params.value),
  },
  {
    field: 'projects',
    headerName: 'Project',
    flex: 1.5,
    minWidth: 200,
    cellRenderer: ProjectsCell,
  }
])

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true
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
}

const getRowId = (params) => params.data?.id
</script>

<template>
  <div class="users-grid-wrapper">
    <div class="users-grid">
      <ag-grid-vue
        class="ag-theme-quartz w-full h-full"
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :theme="myTheme"
        :getRowId="getRowId"
        :rowHeight="52"
        :headerHeight="40"
        :suppressCellFocus="true"
        :suppressRowClickSelection="true"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
      />
    </div>
    <!-- Fixed Footer - Filter buttons on left, Pagination on right -->
    <div class="footer-bar">
      <!-- Left: Filters -->
      <div class="footer-filters">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">Filter by</span>
          
          <!-- Status Filter Dropdown -->
          <DropdownMenu :items="statusMenuItems" position="left" width="10rem" :openUp="true">
            <template #trigger>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border rounded-md transition-colors',
                  selectedStatus 
                    ? 'text-blue-600 border-blue-300 bg-blue-50' 
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                ]"
              >
                <Settings class="w-4 h-4" :class="selectedStatus ? 'text-blue-500' : 'text-gray-400'" />
                {{ selectedStatusLabel }}
              </button>
            </template>
          </DropdownMenu>
          
          <!-- Role Filter Dropdown -->
          <DropdownMenu :items="roleMenuItems" position="left" width="10rem" :openUp="true">
            <template #trigger>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border rounded-md transition-colors',
                  selectedRole 
                    ? 'text-blue-600 border-blue-300 bg-blue-50' 
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                ]"
              >
                <Users class="w-4 h-4" :class="selectedRole ? 'text-blue-500' : 'text-gray-400'" />
                {{ selectedRoleLabel }}
              </button>
            </template>
          </DropdownMenu>
          
          <!-- Clear Filters Button -->
          <button
            @click="clearFilters"
            :class="[
              'inline-flex items-center p-1.5 border rounded-md transition-colors',
              hasActiveFilters 
                ? 'text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100' 
                : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
            ]"
            :title="hasActiveFilters ? 'Clear filters' : 'More filters'"
          >
            <SlidersHorizontal class="w-4 h-4" :class="hasActiveFilters ? 'text-blue-500' : 'text-gray-400'" />
          </button>
        </div>
      </div>
      
      <!-- Right: Custom Pagination -->
      <div class="footer-pagination">
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
            :class="{ 'pagination-page-active': page === currentPage }"
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
.users-grid-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 108px);
  position: relative;
}

.users-grid {
  width: 100%;
  height: calc(100% - 52px);
  display: flex;
  flex-direction: column;
}

/* Fixed Footer Bar */
.footer-bar {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width, 280px);
  right: 0;
  z-index: 101;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.footer-filters {
  display: flex;
  align-items: center;
}

.footer-pagination {
  display: flex;
  align-items: center;
}

/* Pagination Button Styles */
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

.pagination-page {
  font-size: 13px;
  font-weight: 500;
  min-width: 32px;
}

.pagination-page-active {
  background-color: #f3f4f6;
  color: #6b7280;
  border-color: #d1d5db;
}

/* Page Size Selector */
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

/* Sort icons */
:deep(.ag-theme-quartz .ag-sort-indicator-icon) {
  color: #9ca3af;
}
</style>
