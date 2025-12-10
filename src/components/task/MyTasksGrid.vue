<script setup>
import { computed, ref } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import StatusEditorDropdown from '@/components/task/StatusEditorDropdown.vue'
import AssigneeEditorDropdown from '@/components/task/AssigneeEditorDropdown.vue'

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

const columnDefs = [
  { field: 'dartboard', headerName: 'Dartboard', flex: 1 },
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

ModuleRegistry.registerModules([AllCommunityModule])

const autoGroupColumnDef = {
  headerName: 'Title',
  minWidth: 320,
  cellRendererParams: {
    suppressCount: true,
    innerRenderer: (params) => {
      const wrapper = document.createElement('span')
      wrapper.className = 'flex items-center gap-2'

      const dot = document.createElement('span')
      dot.className = 'task-level-dot'
      dot.textContent = '•'
      dot.style.opacity = params.node.hasChildren() ? '0.9' : '0.6'

      const text = document.createElement('span')
      text.textContent = params.data?.title || params.value
      text.style.fontWeight = params.node.hasChildren() ? '600' : '500'

      wrapper.appendChild(dot)
      wrapper.appendChild(text)
      return wrapper
    }
  }
}

const gridOptions = ref({
  columnDefs,
  defaultColDef,
  animateRows: true,
  theme: myTheme,
  rowSelection: {
    mode: 'multiRow',
    multiSelectWithClick: true,
    checkboxes: true,
    headerCheckbox: true,
    suppressRowClickSelection: true
  },
  components: {
    StatusEditorDropdown,
    AssigneeEditorDropdown
  }
})
</script>

<template>
  <div class="my-tasks-grid rounded-lg border border-dashed border-gray-200 bg-white p-0 shadow-sm">
    <ag-grid-vue
      class="ag-theme-quartz w-full h-[460px]"
      :gridOptions="gridOptions"
      :rowData="rowData"
      :columnDefs="columnDefs"
      :autoGroupColumnDef="autoGroupColumnDef"
      :treeData="true"
      :getDataPath="getDataPath"
      :groupDefaultExpanded="0"
      groupDisplayType="singleColumn"
      rowModelType="clientSide"
      :defaultColDef="defaultColDef"
      :animateRows="true"
      :rowHeight="48"
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
}

:deep(.ag-theme-quartz .ag-group-leaf-indent),
:deep(.ag-theme-quartz .ag-group-child-indent) {
  width: 12px;
}
</style>
