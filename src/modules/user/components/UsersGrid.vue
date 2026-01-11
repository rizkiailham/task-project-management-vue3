<script setup>
/**
 * UsersGrid - AG Grid component for displaying users table
 * 
 * Based on MyTasksGrid.vue pattern with customized columns for user management.
 */
import { ref, computed, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { Pencil, Trash2 } from 'lucide-vue-next'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit', 'delete', 'resendInvite'])

const gridApi = ref(null)
const rowData = ref([])

// Transform users data for the grid
watch(
  () => props.users,
  (users) => {
    rowData.value = users.map((user, index) => ({
      ...user,
      rowIndex: index + 1,
      fullName: `${user.firstName} ${user.lastName}`,
      // Compute status from isActive field
      status: user.isActive ? 'Active' : 'Invited',
      projectsDisplay: formatProjects(user.projects)
    }))
  },
  { immediate: true, deep: true }
)

function formatProjects(projects) {
  if (!projects || projects.length === 0) return ''
  if (projects.length <= 2) return projects.join(', ')
  return `${projects.slice(0, 2).join(', ')} +${projects.length - 2}`
}

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
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Column definitions
const columnDefs = [
  {
    field: 'rowIndex',
    headerName: '#',
    width: 60,
    sortable: false,
    filter: false,
    pinned: 'left'
  },
  {
    field: 'fullName',
    headerName: 'Name',
    flex: 2,
    minWidth: 250,
    cellRenderer: 'NameCellRenderer',
    cellRendererParams: {
      onEdit: (user) => emit('edit', user),
      onDelete: (user) => emit('delete', user),
      onResendInvite: (user) => emit('resendInvite', user)
    }
  },
  {
    field: 'status',
    headerName: 'Status',
    flex: 1,
    minWidth: 100,
    cellRenderer: 'StatusCellRenderer'
  },
  {
    field: 'lastActivity',
    headerName: 'Last activity',
    flex: 1,
    minWidth: 120,
    valueFormatter: (params) => formatDate(params.value),
    comparator: (a, b) => new Date(a) - new Date(b)
  },
  {
    field: 'projectsDisplay',
    headerName: 'Project',
    flex: 1.5,
    minWidth: 180,
    cellRenderer: 'ProjectsCellRenderer'
  }
]

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true
}

// Custom theme
const myTheme = themeQuartz.withParams({
  accentColor: '#3b82f6',
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E7EB',
  borderRadius: 2,
  browserColorScheme: 'light',
  cellHorizontalPaddingScale: 0.8,
  chromeBackgroundColor: { ref: 'backgroundColor' },
  columnBorder: false,
  fontFamily: { googleFont: 'Inter' },
  fontSize: 13,
  foregroundColor: '#374151',
  headerBackgroundColor: '#FFFFFF',
  headerFontSize: 13,
  headerFontWeight: 500,
  headerTextColor: '#6B7280',
  rowBorder: true,
  rowVerticalPaddingScale: 0.9,
  sidePanelBorder: true,
  spacing: 6,
  wrapperBorder: false,
  wrapperBorderRadius: 2
})

// Custom cell renderers
const NameCellRenderer = {
  template: `
    <div class="flex items-center gap-3 py-1 group/row w-full">
      <div 
        class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
        :style="{ backgroundColor: params.data.avatarColor || '#6366f1' }"
      >
        {{ getInitial(params.data) }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900 truncate">{{ params.data.fullName }}</div>
        <div class="text-xs text-gray-500 truncate">{{ params.data.email }}</div>
      </div>
      <div class="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button
          v-if="!params.data.isActive"
          @click.stop="onResendInvite"
          class="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200 bg-white"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
          Resend Invite
        </button>
        <button
          @click.stop="onEdit"
          class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200 bg-white"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          Edit
        </button>
        <button
          @click.stop="onDelete"
          class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded border border-gray-200 bg-white"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `,
  methods: {
    getInitial(data) {
      return data.firstName ? data.firstName.charAt(0).toUpperCase() : 'U'
    },
    onEdit() {
      this.params.onEdit(this.params.data)
    },
    onDelete() {
      this.params.onDelete(this.params.data)
    },
    onResendInvite() {
      this.params.onResendInvite(this.params.data)
    }
  }
}

const StatusCellRenderer = {
  template: `
    <div class="flex items-center">
      <span 
        class="px-2 py-0.5 text-xs font-medium rounded"
        :class="statusClass"
      >
        {{ params.value }}
      </span>
    </div>
  `,
  computed: {
    statusClass() {
      const status = this.params.value
      if (status === 'Active') return 'bg-green-50 text-green-700'
      if (status === 'Invited') return 'bg-blue-50 text-blue-700'
      if (status === 'Inactive') return 'bg-gray-100 text-gray-600'
      return 'bg-gray-100 text-gray-600'
    }
  }
}

const ProjectsCellRenderer = {
  template: `
    <div class="flex items-center gap-1 flex-wrap">
      <template v-if="displayProjects.length > 0">
        <span 
          v-for="(project, idx) in displayProjects" 
          :key="idx"
          class="text-sm text-gray-700"
        >
          {{ project }}{{ idx < displayProjects.length - 1 ? ',' : '' }}
        </span>
        <span v-if="extraCount > 0" class="text-sm text-blue-600 font-medium">
          +{{ extraCount }}
        </span>
      </template>
    </div>
  `,
  computed: {
    projects() {
      return this.params.data.projects || []
    },
    displayProjects() {
      return this.projects.slice(0, 2)
    },
    extraCount() {
      return Math.max(0, this.projects.length - 2)
    }
  }
}

const gridOptions = ref({
  columnDefs,
  defaultColDef,
  theme: myTheme,
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: [20, 50, 100, 500],
  rowHeight: 56,
  headerHeight: 44,
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: false,
    checkboxes: false,
    enableSelectionWithoutKeys: false,
    enableClickSelection: false
  },
  suppressRowClickSelection: true,
  components: {
    NameCellRenderer,
    StatusCellRenderer,
    ProjectsCellRenderer
  }
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
      :gridOptions="gridOptions"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :defaultColDef="defaultColDef"
      :getRowId="getRowId"
      domLayout="autoHeight"
      @grid-ready="onGridReady"
    />
  </div>
</template>

<style scoped>
.users-grid {
  min-height: 400px;
}

:deep(.ag-theme-quartz .ag-row-hover) {
  background-color: #f9fafb !important;
}

:deep(.ag-theme-quartz .ag-cell),
:deep(.ag-theme-quartz .ag-cell:focus),
:deep(.ag-theme-quartz .ag-cell:focus-within),
:deep(.ag-theme-quartz .ag-cell-focus) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

:deep(.ag-theme-quartz .ag-header-cell) {
  font-weight: 500;
}

:deep(.ag-theme-quartz .ag-paging-panel) {
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
}
</style>
