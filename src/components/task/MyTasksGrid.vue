<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import StatusEditorDropdown from '@/components/task/StatusEditorDropdown.vue'
import AssigneeEditorDropdown from '@/components/task/AssigneeEditorDropdown.vue'
import DartboardCell from '@/components/task/DartboardCell.vue'
import TrackingTimeCell from '@/components/task/TrackingTimeCell.vue'
import { useTaskStore, useUIStore } from '@/stores'

const taskStore = useTaskStore()
const uiStore = useUIStore()

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:tasks', 'change'])

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

function findGridRowNodes(pathKey) {
  if (!gridApi.value) return []
  const matches = []
  gridApi.value.forEachNode((node) => {
    if (node.data?.pathKey === pathKey) {
      matches.push(node)
    }
  })
  return matches
}

function deepClone(val) {
  return JSON.parse(JSON.stringify(val))
}

function emitState() {
  const snapshot = deepClone(treeData.value)
  emit('change', snapshot)
  emit('update:tasks', snapshot)
}

function syncTree(source) {
  treeData.value = deepClone(source.length ? source : fallbackTasks)
  rowData.value = flattenTree(treeData.value)
  emitState()
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
            id: `${pathKey}-placeholder-id`,
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

const getRowId = (params) =>
  params.data?.id ||
  params.data?.pathKey ||
  (params.data?.path || []).join(' / ') ||
  params.data?.title ||
  Math.random().toString(36).slice(2)

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

function updateField(pathKey, field, value, { markEdited = true, emit = true } = {}) {
  console.log('updateField', pathKey, field, value)
  if (!pathKey) return
  const node = findNodeByKey(pathKey)
  if (node) {
    node[field] = value
    if (markEdited) node._edited = true
  }
  const row = rowData.value.find((r) => r.pathKey === pathKey)
  if (row) {
    row[field] = value
  }
  const targets = findGridRowNodes(pathKey)
  if (gridApi.value && targets.length) {
    targets.forEach((target) => {
      target.setDataValue?.(field, value)
    })
    gridApi.value.refreshCells({
      rowNodes: targets,
      columns: [field],
      force: true
    })
  }
  if (emit) emitState()
}

function updateTitle(key, title) {
  updateField(key, 'title', title, { markEdited: (title || '').trim() !== '' })
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
  emitState()
}

function handleCommit(key) {
  const node = findNodeByKey(key)
  if (!node) return
  const title = (node.title || '').trim()
  // Persist even empty subtasks so users can nest infinitely without typing
  node.isNew = false
  node.title = title
  if (title !== '') {
    node._edited = true
  }
  rowData.value = flattenTree(treeData.value)
  emitState()
}

function removeEmptyChildren(key) {
  const node = findNodeByKey(key)
  if (!node || !Array.isArray(node.children)) return
  const before = node.children.length
  node.children = node.children.filter((child) => {
    const title = (child.title || '').trim()
    return !(child.isNew && !child._edited && title === '' && (!child.children || child.children.length === 0))
  })
  if (node.children.length !== before) {
    treeData.value = deepClone(treeData.value)
    rowData.value = flattenTree(treeData.value)
    emitState()
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
  node.hasChildren = true
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
  emitState()
  nextTick(() => {
    expandNodeByKey(key, true)
    // Refresh parent row to update hasChildren flag and row class
    if (gridApi.value) {
      // Find and refresh the parent row to update its cell renderers and row class
      gridApi.value.forEachNode((gridNode) => {
        if (gridNode.data?.pathKey === key) {
          // Refresh cells for this specific row to update subtask count icon
          gridApi.value.refreshCells({
            rowNodes: [gridNode],
            force: true
          })
          // Redraw the row to apply updated row class (row-has-children instead of row-leaf)
          gridApi.value.redrawRows({ rowNodes: [gridNode] })
        }
      })
    }
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
    flex: 1,
    editable: true,
    valueSetter: (params) => {
      updateField(params.data?.pathKey, 'dartboard', params.newValue)
      return false
    }
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
    field: 'trackingTime',
    headerName: 'Tracking time',
    flex: 0.9,
    sortable: false,
    filter: false,
    editable: false,
    cellRenderer: 'TrackingTimeCell'
  },
  {
    field: 'tags',
    headerName: 'Tags',
    flex: 1,
    editable: true,
    valueGetter: (params) => {
      const tags = params.data?.tags
      return Array.isArray(tags) ? tags.join(', ') : ''
    },
    valueSetter: (params) => {
      const nextTags = typeof params.newValue === 'string'
        ? params.newValue.split(',').map((tag) => tag.trim()).filter(Boolean)
        : Array.isArray(params.newValue) ? params.newValue : []
      updateField(params.data?.pathKey, 'tags', nextTags)
      return false
    }
  },
  {
    field: 'dueDate',
    headerName: 'Due date',
    flex: 0.8,
    editable: true,
    valueSetter: (params) => {
      updateField(params.data?.pathKey, 'dueDate', params.newValue)
      return false
    }
  }
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
    focusKey,
    updateField
  },
  getRowClass: (params) => {
    if (params.data?.isPlaceholder) return 'row-placeholder'
    const hasChild =
      params.data?.hasChildren ||
      (params.node?.childrenAfterGroup || []).some((child) => !child.data?.isPlaceholder)
    const classes = []
    if (params.data?.isNew) classes.push('row-new')
    classes.push(hasChild ? 'row-has-children' : 'row-leaf')
    return classes.join(' ')
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
    const key = data.pathKey
    if (event.expanded) {
      const firstChild = node.childrenAfterGroup?.[0]
      if (firstChild?.data?.isPlaceholder) {
        addSubtask(key)
        return
      }
      focusOnPathKey(key)
      return
    }
    // No-op on collapse to keep empty subtasks around
  },
  components: {
    StatusEditorDropdown,
    AssigneeEditorDropdown,
    DartboardCell,
    TrackingTimeCell
  }
})

/**
 * Handle opening task detail sidebar when user clicks the detail button
 * @param {Object} taskData - The task data from the grid row
 */
function handleOpenTaskDetail(taskData) {
  if (!taskData) return

  // Transform grid data to task format for the store
  const task = {
    id: taskData.id || taskData.pathKey,
    title: taskData.title,
    description: taskData.description || '',
    status: taskData.status,
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate,
    projectName: taskData.dartboard,
    assignee: taskData.assignee ? { name: taskData.assignee } : null,
    tags: taskData.tags || [],
    children: taskData.children || []
  }

  // Set the current task in the store and open the panel
  taskStore.setCurrentTask(task)
  uiStore.openTaskPanel()
}

function onGridReady(params) {
  gridApi.value = params.api

  // Listen for custom openDartboardSidebar event from DartboardCell
  params.api.addEventListener('openDartboardSidebar', (event) => {
    handleOpenTaskDetail(event.data)
  })
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

/* Ensure caret is always visible for rows with children (not just on hover) */
:deep(.row-has-children .ag-group-contracted .ag-icon-tree-closed),
:deep(.row-has-children .ag-group-expanded .ag-icon-tree-open) {
  opacity: 1 !important;
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

:deep(.row-new) {
  animation: rowPulse 0.8s ease;
}

@keyframes rowPulse {
  0% {
    background-color: #e6f4ff;
  }
  100% {
    background-color: transparent;
  }
}

:deep(.ag-theme-quartz .ag-header-select-all) {
  opacity: 1;
}

/* Ensure caret is always visible for rows with children (not just on hover) show when there is subtask */ 
:deep(.row-has-children .ag-group-contracted .ag-icon-tree-closed),
:deep(.row-has-children .ag-group-expanded .ag-icon-tree-open) {
  opacity: 1 !important;
}
</style>
