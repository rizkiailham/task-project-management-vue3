<script setup>
/**
 * GroupsGrid - AG Grid component for displaying groups table
 */
import { ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'

import RoleActionsCell from './cells/RoleActionsCell.vue'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const props = defineProps({
  groups: { type: Array, default: () => [] }
})

const emit = defineEmits(['edit', 'delete'])

const rowData = ref([])

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
    flex: 1,
    minWidth: 200
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
  },
  {
    field: 'actions',
    headerName: '',
    width: 120,
    sortable: false,
    filter: false,
    suppressMenu: true,
    cellRenderer: RoleActionsCell,
    cellRendererParams: {
      onEdit: handleEdit,
      onDelete: handleDelete
    }
  }
])

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true
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
  headerBackgroundColor: '#ffffff',
  headerFontSize: 13,
  headerFontWeight: 500,
  headerTextColor: '#374151',
  rowBorder: true,
  rowVerticalPaddingScale: 1,
  spacing: 8,
  wrapperBorder: false,
  wrapperBorderRadius: 0
})

const getRowId = (params) => params.data?.id
</script>

<template>
  <div class="groups-grid">
    <ag-grid-vue
      class="ag-theme-quartz w-full"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :defaultColDef="defaultColDef"
      :theme="myTheme"
      :getRowId="getRowId"
      :rowHeight="52"
      :headerHeight="44"
      :suppressCellFocus="true"
      :suppressRowClickSelection="true"
      domLayout="autoHeight"
    />
  </div>
</template>

<style scoped>
.groups-grid {
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

:deep(.ag-theme-quartz .ag-header-cell) {
  padding-left: 16px;
  padding-right: 16px;
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
</style>
