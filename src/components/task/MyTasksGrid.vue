<script setup>
import { computed, ref } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import StatusEditorDropdown from '@/components/task/StatusEditorDropdown.vue'
import AssigneeEditorDropdown from '@/components/task/AssigneeEditorDropdown.vue'
import DartboardCell from '@/components/task/DartboardCell.vue'

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const fallbackTasks = [
  {
    title: 'Draft Desidia core frontend journey',
    dartboard: 'Product',
    status: 'Doing',
    assignee: 'Hari W',
    tags: ['Product'],
    dueDate: '2025-12-17',
    children: [
      {
        title: 'Ideate key screens',
        dartboard: 'Design',
        status: 'To-do',
        assignee: 'Dart AI',
        tags: ['Design'],
        dueDate: '',
        children: [
          {
            title: 'Login & onboarding',
            dartboard: 'Design',
            status: 'To-do',
            assignee: 'Dart AI',
            tags: ['Design'],
            dueDate: '',
            children: [
              {
                title: 'Edge cases audit',
                dartboard: 'Product',
                status: 'Bug',
                assignee: 'TestTask',
                tags: ['Product'],
                dueDate: ''
              }
            ]
          }
        ]
      }
    ]
  },
  {
    title: 'Create initial Desidia UI library',
    dartboard: 'Design',
    status: 'Done',
    assignee: 'studio@lomedia.no',
    tags: ['Design', 'Engineering'],
    dueDate: '2025-12-21',
    children: [
      {
        title: 'Buttons',
        dartboard: 'Engineering',
        status: 'Doing',
        assignee: 'Erik Olsvik',
        tags: ['Engineering'],
        dueDate: '',
        children: [
          {
            title: 'States & interactions',
            dartboard: 'Engineering',
            status: 'To-do',
            assignee: 'Hari W',
            tags: ['Engineering'],
            dueDate: '',
            children: [
              {
                title: 'Accessibility sweep',
                dartboard: 'Engineering',
                status: 'To-do',
                assignee: 'Dart AI',
                tags: ['Engineering'],
                dueDate: ''
              }
            ]
          }
        ]
      }
    ]
  }
]

function flattenTree(nodes, parentPath = []) {
  return nodes.flatMap((node) => {
    const { children = [], ...rest } = node
    const path = [...parentPath, node.title]
    const current = { ...rest, path }
    const nested = flattenTree(children, path)
    return [current, ...nested]
  })
}

// Generates path arrays so ag-Grid can show infinite nesting
const rowData = computed(() => {
  const source = props.tasks.length ? props.tasks : fallbackTasks
  return flattenTree(source)
})

const getRowId = (params) => (params.data?.path || []).join(' / ') || params.data?.id || params.data?.title || Math.random().toString(36).slice(2)

const getDataPath = (data) => data.path || []

const columnDefs = [
  {
    field: 'dartboard',
    headerName: 'Dartboard',
    flex: 1
  },
  {
    field: 'status',
    headerName: 'Status',
    flex: 1,
    cellRenderer: 'StatusEditorDropdown'
  },
  {
    field: 'assignee',
    headerName: 'Assignee',
    flex: 1,
    cellRenderer: 'AssigneeEditorDropdown'
  },
  {
    field: 'tags',
    headerName: 'Tags',
    flex: 1,
    valueGetter: (params) => params.data.tags.join(', ')
  },
  { field: 'dueDate', headerName: 'Due date', flex: 0.8 }
]

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true
}

const myTheme = themeQuartz.withParams({
  accentColor: '#087AD1',
  backgroundColor: '#FFFFFF',
  borderColor: '#D7E2E6',
  borderRadius: 2,
  browserColorScheme: 'light',
  cellHorizontalPaddingScale: 0.7,
  chromeBackgroundColor: {
    ref: 'backgroundColor'
  },
  columnBorder: false,
  fontFamily: {
    googleFont: 'Inter'
  },
  fontSize: 13,
  foregroundColor: '#555B62',
  headerBackgroundColor: '#FFFFFF',
  headerFontSize: 13,
  headerFontWeight: 400,
  headerTextColor: '#84868B',
  rowBorder: true,
  rowVerticalPaddingScale: 0.8,
  sidePanelBorder: true,
  spacing: 6,
  wrapperBorder: false,
  wrapperBorderRadius: 2
})

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const autoGroupColumnDef = {
  headerName: 'Title',
  minWidth: 320,
  cellRendererParams: {
    suppressCount: true,
    innerRenderer: 'DartboardCell'
  }
}

const gridOptions = ref({
  columnDefs,
  defaultColDef,
  animateRows: true,
  theme: myTheme,
  deltaRowDataMode: true,
  rowSelection: {
    mode: 'multiRow',
    multiSelectWithClick: true,
    checkboxes: true,
    headerCheckbox: true,
    suppressRowClickSelection: true
  },
  components: {
    StatusEditorDropdown,
    AssigneeEditorDropdown,
    DartboardCell
  }
})
</script>

<template>
  <div class="my-tasks-grid rounded-lg border border-dashed border-gray-200 bg-white p-0 shadow-sm">
    <ag-grid-vue
      class="ag-theme-quartz w-full"
      :gridOptions="gridOptions"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :autoGroupColumnDef="autoGroupColumnDef"
      :treeData="true"
      :getDataPath="getDataPath"
      :getRowId="getRowId"
      :groupDefaultExpanded="0"
      groupDisplayType="singleColumn"
      rowModelType="clientSide"
      :defaultColDef="defaultColDef"
      :animateRows="true"
      :rowHeight="48"
      :domLayout="'autoHeight'"
    />
  </div>
</template>

<style scoped>
.my-tasks-grid {
  min-height: 460px;
}

:deep(.task-level-dot) {
  display: inline-flex;
  width: 14px;
  justify-content: center;
  color: #9ca3af;
  font-size: 14px;
}

:deep(.ag-theme-quartz .ag-group-expanded .ag-icon-tree-open),
:deep(.ag-theme-quartz .ag-group-contracted .ag-icon-tree-closed) {
  color: #4b5563;
  opacity: 0.9;
}

:deep(.ag-theme-quartz .ag-group-value) {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  line-height: 1;
}

:deep(.ag-theme-quartz .ag-group-value .dartboard-cell) {
  height: 100%;
  align-items: center;
  line-height: 1;
}

:deep(.ag-theme-quartz .ag-cell .ag-cell-wrapper) {
  align-items: center;
}

:deep(.ag-theme-quartz .ag-group-leaf-indent),
:deep(.ag-theme-quartz .ag-group-child-indent) {
  width: 12px;
}

:deep(.ag-theme-quartz .ag-row-hover) {
  background-color: #f3f4f6 !important;
  opacity: 1!important;
}

:deep(.ag-theme-quartz .ag-cell),
:deep(.ag-theme-quartz .ag-cell:focus),
:deep(.ag-theme-quartz .ag-cell:focus-within),
:deep(.ag-theme-quartz .ag-cell-focus) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
