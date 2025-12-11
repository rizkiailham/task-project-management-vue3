<script setup>
import { computed, ref, watch, nextTick } from 'vue'
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

const createNodeId = (prefix = 'node') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

const addIdsToTree = (nodes, prefix = 'node') =>
  nodes.map((node) => ({
    ...node,
    id: node.id || createNodeId(prefix),
    children: node.children ? addIdsToTree(node.children, prefix) : []
  }))

const fallbackTasks = addIdsToTree([
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
])

const treeData = ref([])
const rowData = ref([])
const focusKey = ref(null)
const gridApi = ref(null)

function deepClone(val) {
  return JSON.parse(JSON.stringify(val))
}

function syncTree(source) {
  treeData.value = deepClone(source.length ? source : fallbackTasks)
  rowData.value = flattenTree(treeData.value)
}

watch(
  () => props.tasks,
  (val) => syncTree(val),
  { immediate: true, deep: true }
)

function flattenTree(nodes, parentPath = [], parentIdx = []) {
  return nodes.flatMap((node, index) => {
    const { children = [], ...rest } = node
    const path = [...parentPath, node.title]
    const pathKeyParts = [...parentIdx, index]
    const pathKey = pathKeyParts.join('-')
    const hasChildren = (children || []).length > 0
    const current = { ...rest, path, pathKey, hasChildren }
    const nested = flattenTree(children, path, pathKeyParts)
    const placeholder = !hasChildren
      ? [
          {
            title: '',
            path: [...path, '__placeholder__'],
            pathKey: `${pathKey}-placeholder`,
            isPlaceholder: true,
            hasChildren: false
          }
        ]
      : []
    return [current, ...nested, ...placeholder]
  })
}

const getRowId = (params) => params.data?.id || params.data?.pathKey || (params.data?.path || []).join(' / ') || params.data?.title || Math.random().toString(36).slice(2)

const getDataPath = (data) => data.path || []

function findNodeByKey(key, nodes = treeData.value) {
  if (!key) return null
  const keyParts = Array.isArray(key) ? key : key.split('-')
  const [head, ...rest] = keyParts
  const idx = Number(head)
  const node = nodes[idx]
  if (!node) return null
  if (rest.length === 0) return node
  return findNodeByKey(rest, node.children || [])
}

function updateTitle(key, title) {
  const node = findNodeByKey(key)
  if (node) node.title = title
  const row = rowData.value.find(r => r.pathKey === key)
  if (row) row.title = title
}

function removeEmptyNode(key) {
  const parts = key.split('-').map((p) => Number(p))
  const last = parts.pop()
  let cursor = treeData.value
  for (const idx of parts) {
    if (!cursor[idx] || !cursor[idx].children) return
    cursor = cursor[idx].children
  }
  cursor.splice(last, 1)
  rowData.value = flattenTree(treeData.value)
}

function handleCommit(key) {
  const node = findNodeByKey(key)
  if (!node) return
  const title = (node.title || '').trim()
  if (node.isNew && title === '' && (!node.children || node.children.length === 0)) {
    removeEmptyNode(key)
  } else if (title !== '') {
    node.isNew = false
  }
}

function expandNodeByKey(key, expanded = true) {
  if (!gridApi.value) return
  gridApi.value.forEachNode((node) => {
    if (node.data?.pathKey === key) {
      node.setExpanded(expanded)
    }
  })
}

function focusOnPathKey(key) {
  // Clear first so re-focusing the same key still triggers watchers in the cell
  focusKey.value = null
  nextTick(() => {
    focusKey.value = key
  })
  nextTick(() => {
    if (!gridApi.value) return
    const findInput = () => {
      const escapedKey =
        typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
      const selector = `#dartboard-input-${escapedKey}`
      // Prefer scoped search inside the cell renderer to avoid missing elements during virtualisation
      const node = findNode()
      if (gridApi.value && node) {
        const renderers = gridApi.value.getCellRendererInstances({ rowNodes: [node] }) || []
        for (const renderer of renderers) {
          const gui = renderer?.getGui?.() || renderer?.eGui
          if (gui) {
            const found = gui.querySelector(selector) || gui.querySelector('.dartboard-input')
            if (found) return found
          }
        }
      }
      return document.querySelector(selector) || document.getElementById(`dartboard-input-${key}`)
    }
    const findNode = () => {
      let targetNode = null
      gridApi.value.forEachNode((node) => {
        if (node.data?.pathKey === key) {
          targetNode = node
        }
      })
      return targetNode
    }
    let targetNode = findNode()
    if (targetNode) {
      gridApi.value.ensureNodeVisible(targetNode)
      targetNode.setSelected(true, true)
    }
    // Retry focusing the input a few times to catch async row renders
    let attempts = 0
    const attemptFocus = () => {
      targetNode = targetNode || findNode()
      if (targetNode) {
        targetNode.setSelected(true, true)
        gridApi.value.ensureNodeVisible(targetNode)
      }
      const input = findInput()
      if (input) {
        input.focus()
        input.select?.()
        return
      }
      attempts += 1
      if (attempts < 40) {
        // Slightly longer delay to outlast expand animation/render
        setTimeout(attemptFocus, 40)
      }

      console.log('Attempts:', attempts, input)
    }
    // Run attempts across multiple frames to catch async renders
    setTimeout(attemptFocus, 0)
    setTimeout(attemptFocus, 120)
    setTimeout(attemptFocus, 260)
    setTimeout(attemptFocus, 420)
  })
}

function addSubtask(key) {
  const node = findNodeByKey(key)
  if (!node) return
  if (!node.children) node.children = []
  const nextIndex = node.children.length
  const newKey = `${key}-${nextIndex}`
  node.children.push({
    id: createNodeId('subtask'),
    title: '',
    isNew: true,
    checked: true,
    dartboard: node.dartboard || 'Product',
    status: node.status || 'To Do',
    assignee: node.assignee || 'Unassigned',
    tags: node.tags || [],
    dueDate: '',
    children: []
  })
  // Force reactivity for tree and rowData so grid sees new child immediately
  treeData.value = deepClone(treeData.value)
  rowData.value = flattenTree(treeData.value)
  nextTick(() => {
    expandNodeByKey(key, true)
    gridApi.value?.refreshClientSideRowModel?.('expandPivots')
    // After expand/refresh, focus the new subtask title input
    nextTick(() => {
      focusOnPathKey(newKey)
    })
  })
}

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
    valueGetter: (params) => {
      const tags = params.data?.tags
      return Array.isArray(tags) ? tags.join(', ') : ''
    }
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
  suppressHeaderMenuButton: true,
  cellRendererParams: {
    suppressCount: true,
    suppressDoubleClickExpand: true,
    suppressEnterExpand: true,
    innerRenderer: 'DartboardCell'
  },
  cellRenderer: 'agGroupCellRenderer'
}

const gridOptions = ref({
  columnDefs,
  defaultColDef,
  animateRows: true,
  theme: myTheme,
  context: {
    addSubtask,
    updateTitle,
    handleCommit,
    focusKey
  },
  getRowClass: (params) => {
    if (params.data?.isPlaceholder) return 'row-placeholder'
    if (params.data?.hasChildren) return 'row-has-children'
    return 'row-leaf'
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    checkboxes: true,
    enableSelectionWithoutKeys: true,
    enableClickSelection: false
  },
  onRowClicked: (params) => {
    if (!params?.node || params.data?.isPlaceholder) return
    const currentlySelected = params.node.isSelected?.()
    params.node.setSelected?.(!currentlySelected, true)
  },
  onRowGroupOpened: (event) => {
    const node = event.node
    const data = node?.data
    if (!data) return
    const firstChild = node.childrenAfterGroup?.[0]
    if (firstChild?.data?.isPlaceholder) {
      addSubtask(data.pathKey)
    }
  },
  components: {
    StatusEditorDropdown,
    AssigneeEditorDropdown,
    DartboardCell
  }
})

function onGridReady(params) {
  gridApi.value = params.api
}
</script>

<template>
  <div class="">
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
      :rowHeight="36"
      domLayout="autoHeight"
      @row-clicked="gridOptions.onRowClicked"
      @grid-ready="onGridReady"
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

:deep(.ag-theme-quartz .ag-group-contracted) {
  color: #4b5563;
  opacity: 0.9;
}

:deep(.row-placeholder) {
  display: none !important;
}

:deep(.row-leaf .ag-group-contracted .ag-icon-tree-closed) {
  opacity: 0;
  transition: opacity 0.12s ease;
}

:deep(.row-leaf:hover .ag-group-contracted .ag-icon-tree-closed) {
  opacity: 1;
}

:deep(.row-placeholder) {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
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

:deep(.ag-theme-quartz .ag-selection-checkbox) {
  opacity: 0;
  transition: opacity 0.12s ease;
}

:deep(.ag-theme-quartz .ag-row-hover .ag-selection-checkbox),
:deep(.ag-theme-quartz .ag-row-selected .ag-selection-checkbox) {
  opacity: 1;
}

:deep(.ag-theme-quartz .ag-header-select-all) {
  opacity: 1;
}
</style>
