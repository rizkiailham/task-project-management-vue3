<script setup>
/**
 * UsersGrid - AG Grid component for displaying users table
 */
import { ref, watch, h } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'

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
  users: { type: Array, default: () => [] }
})

const emit = defineEmits(['edit', 'delete', 'resendInvite'])

const gridApi = ref(null)
const rowData = ref([])

// Transform users data for the grid
watch(
  () => props.users,
  (users) => {
    if (!users || users.length === 0) {
      rowData.value = []
      return
    }
    
    rowData.value = users.map((user, index) => {
      let projectNames = []
      if (user.projects && Array.isArray(user.projects)) {
        projectNames = user.projects.map(p => typeof p === 'string' ? p : p.name).filter(Boolean)
      }
      
      return {
        ...user,
        rowIndex: index + 1,
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

function handleDelete(user) {
  emit('delete', user)
}

// Column definitions
const columnDefs = ref([
  {
    field: 'rowIndex',
    headerName: '#',
    width: 60,
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
  <div class="users-grid">
    <ag-grid-vue
      class="ag-theme-quartz w-full"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :defaultColDef="defaultColDef"
      :theme="myTheme"
      :getRowId="getRowId"
      :rowHeight="52"
      :headerHeight="40"
      :suppressCellFocus="true"
      :suppressRowClickSelection="true"
      domLayout="autoHeight"
      @grid-ready="onGridReady"
    />
  </div>
</template>

<style scoped>
.users-grid {
  width: 100%;
}

:deep(.ag-theme-quartz) {
  --ag-row-hover-color: #fefce8;
  --ag-header-height: 44px;
  --ag-borders: none;
}

:deep(.ag-theme-quartz .ag-root-wrapper) {
  border: none;
  border-radius: 0;
}

:deep(.ag-theme-quartz .ag-header) {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
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
