<script setup>
/**
 * ProjectTasksGrid - AG Grid component for displaying project tasks in list view
 * 
 * Features:
 * - Flat list display of tasks matching MyTasksGrid design
 * - Columns: Title, Dartboard, Assignee, Tracking time, Tags
 * - Clickable Assignee and Due Date cells
 * - Same theme as MyTasksGrid
 */
import { computed, ref, watch, h, nextTick } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { useTaskStore, useUIStore, useProjectStore } from '@/stores'
import SortHeader from '@/components/ag/SortHeader.vue'
import AssigneeCell from '@/components/task/AssigneeCell.vue'
import DueDateCell from '@/components/task/DueDateCell.vue'
import TagEditorDropdown from '@/components/task/TagEditorDropdown.vue'
import TrackingTimeCell from '@/components/task/TrackingTimeCell.vue'
import DartboardCell from '@/components/task/DartboardCell.vue'
import ProjectCell from '@/components/task/ProjectCell.vue'


const taskStore = useTaskStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['task-click', 'update-assignee', 'update-due-date', 'reorder-tasks', 'create-subtask', 'update-task-title'])

const gridApi = ref(null)
const focusKey = ref(null)

// Helper to build hierarchy from flat list
// Helper to build hierarchy from flat list
function buildTree(flatTasks) {
  const taskMap = new Map()
  const roots = []
  
  // Clone tasks and normalize children from subTasks if present
  const tasks = flatTasks.map(t => ({ 
    ...t, 
    children: t.subTasks ? [...t.subTasks] : (t.children ? [...t.children] : [])
  }))
  
  tasks.forEach(task => {
    if (task.id) taskMap.set(String(task.id), task)
  })
  
  tasks.forEach(task => {
    const parentId = task.parentId || task.parentTaskId
    const parentIdStr = parentId ? String(parentId) : null
    
    // Check if parent exists in our map
    if (parentIdStr && taskMap.has(parentIdStr)) {
      const parent = taskMap.get(parentIdStr)
      // Avoid duplicates if already populated via subTasks
      if (!parent.children.some(c => String(c.id) === String(task.id))) {
        parent.children.push(task)
      }
    } else {
      // If no parent found, it's a root (or parent is missing from current view)
      roots.push(task)
    }
  })
  
  return roots
}

// Helper function to flatten tree data with pathKey for AG Grid
function flattenTree(nodes, parentPath = '') {
  const result = []
  nodes.forEach((node, index) => {
    const pathKey = parentPath ? `${parentPath}-${index}` : `${index}`
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    
    result.push({
      id: node.id,
      title: node.title,
      pathKey,
      dartboard: node.projectName || projectStore.currentProjectName || 'Project',
      status: node.status,
      priority: node.priority,
      assignee: node.assignee?.name || node.assignee?.firstName || 'Unassigned',
      assigneeData: node.assignee,
      dueDate: node.dueDate,
      tags: node.tags || [],
      hasChildren,
      subtaskCount: node.subtaskCount || (node.children?.length || 0),
      completedSubtaskCount: node.completedSubtaskCount || 0,
      trackingTime: node.trackingTime || null,
      kanbanColumnId: node.kanbanColumnId,
      projectId: node.projectId,
      children: node.children || [],
      _raw: node
    })
    
    // Recursively flatten children
    if (hasChildren) {
      result.push(...flattenTree(node.children, pathKey))
    }
  })
  return result
}

// Local row data for manual drag and drop management
const rowData = ref([])

// Sync with tasks prop
// Sync with tasks prop
watch(
  () => props.tasks,
  (newTasks) => {
    // Only update if not currently dragging
    if (!gridApi.value?.getDragStatus?.()) {
      // Build tree first, then flatten
      const tree = buildTree(newTasks)
      rowData.value = flattenTree(tree)
    }
  },
  { immediate: true, deep: true }
)

// Get data path for tree structure
const getDataPath = (data) => {
  if (!data.pathKey) return [data.id || data.title]
  return data.pathKey.split('-').map((_, i, arr) => arr.slice(0, i + 1).join('-'))
}

// Get row ID
const getRowId = (params) => params.data?.pathKey || params.data?.id || params.data?.title

function updateField(pathKey, field, value) {
  // Find task and update
  const task = props.tasks.find(t => t.id === pathKey)
  if (task) {
    if (field === 'assignee') {
      emit('update-assignee', { taskId: pathKey, user: value })
    }
  }
}

function addSubtask(pathKey) {
  const node = gridApi.value?.getRowNode(pathKey)
  if (node) {
    node.setExpanded(true)
    const taskId = node.data?.id
    if (taskId) {
      emit('create-subtask', taskId)
      
      // Optimistic update: Add placeholder child immediately
      if (!gridApi.value?.getDragStatus?.()) {
        const optimisticTask = {
          id: `temp-${Date.now()}`,
          parentId: taskId,
          title: 'New task',
          status: 'incompleted',
          children: [],
          dartboard: node.data.dartboard || 'Project',
          isPlaceholder: false // It's a real (optimistic) task
        }
        
        // Create new list including optimistic task
        const currentTasks = [...props.tasks, optimisticTask]
        const tree = buildTree(currentTasks)
        rowData.value = flattenTree(tree)
        
        // Set focus to the new task
        focusKey.value = optimisticTask.id

        // Re-expand parent to show new child
        nextTick(() => {
          const freshNode = gridApi.value?.getRowNode(pathKey)
          if (freshNode) freshNode.setExpanded(true)
        })
      }
    }
  }
}

function updateTitle(pathKey, title) {
  const node = gridApi.value?.getRowNode(pathKey)
  if (node && node.data) {
    node.data.title = title
  }
}

function handleCommit(pathKey) {
  const node = gridApi.value?.getRowNode(pathKey)
  if (node && node.data && node.data.id) {
    emit('update-task-title', { taskId: node.data.id, title: node.data.title })
  }
}

// Manual row drag move for live preview
function onRowDragMove(event) {
  const movingNode = event.node
  const overNode = event.overNode

  if (!overNode || movingNode === overNode) return

  const movingData = movingNode.data
  const overData = overNode.data
  
  // Only allow reordering siblings (same parent path level) for safety if desired,
  // but for flat lists or visual reordering, we can just move in the flat array.
  // For tree data, moving under different parent is complex, so let's check level.
  // Assuming top-level reorder for now as per previous context.
  
  const fromIndex = rowData.value.findIndex(r => r.id === movingData.id)
  const toIndex = rowData.value.findIndex(r => r.id === overData.id)
  
  if (fromIndex === -1 || toIndex === -1) return
  if (fromIndex === toIndex) return

  // Optimistic update
  const updated = [...rowData.value]
  updated.splice(fromIndex, 1)
  updated.splice(toIndex, 0, movingData)
  
  rowData.value = updated
  
  // Important: tell AG Grid the data changed but keep the node expanded/state
  // gridApi.value.applyTransaction({ update: updated }) // applyTransaction might be too heavy?
  // Just replacing ref triggers reactivity. AG Grid handles diff.
}

async function handleRowDragEnd(event) {
  // Emit state based on current rowData order
  const allRowIds = rowData.value
    .map(row => row.id)
    .filter(Boolean)
  
  emit('reorder-tasks', allRowIds)
}

const columnDefs = [
  {
    field: 'dartboard',
    headerName: 'Project',

    flex: 1,
    minWidth: 140,
    cellRenderer: 'ProjectCell'
  },


  {
    field: 'assignee',
    headerName: 'Assignee',
    flex: 1,
    minWidth: 160,
    cellRenderer: 'AssigneeCell'
  },
  {
    field: 'dueDate',
    headerName: 'Due Date',
    flex: 0.8,
    minWidth: 120,
    cellRenderer: 'DueDateCell'
  },
  {
    field: 'trackingTime',
    headerName: 'Tracking time',
    flex: 0.9,
    minWidth: 120,
    sortable: false,
    filter: false,
    editable: false,
    cellRenderer: 'TrackingTimeCell'
  },
  {
    field: 'tags',
    headerName: 'Tags',
    flex: 1,
    minWidth: 200,
    cellRenderer: 'TagEditorDropdown',
    valueGetter: (params) => {
      const tags = params.data?.tags
      if (!Array.isArray(tags)) return ''
      return tags
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label || tag?.value || tag?.id || ''))
        .filter(Boolean)
        .join(', ')
    }
  }
]

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  suppressMenu: true,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader'
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
  minWidth: 280,
  flex: 1.5,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader',
  rowDrag: true, // Enable drag and drop
  cellRendererParams: {
    suppressCount: true,
    suppressDoubleClickExpand: true,
    suppressEnterExpand: true,
    suppressPadding: true, // Remove AG Grid's built-in padding (we use our own indentation)
    innerRenderer: 'DartboardCell'
  },
  cellRenderer: 'agGroupCellRenderer',
  valueGetter: (params) => params.data?.title // Ensure title is shown, not path key
}



const gridOptions = ref({
  columnDefs,
  defaultColDef,
  animateRows: true,
  theme: myTheme,

  components: {
    SortHeader,
    AssigneeCell,
    DueDateCell,
    TagEditorDropdown,
    TrackingTimeCell,
    DartboardCell,
    ProjectCell
  },




  context: {
    updateField,
    tagOptions: ref([]),
    addSubtask,
    updateTitle,
    handleCommit,
    focusKey
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    checkboxes: true,
    enableSelectionWithoutKeys: true,
    enableClickSelection: false
  },
  getRowClass: (params) => {
    if (params.data?.isPlaceholder) return 'row-placeholder'
    return ''
  },
  onRowClicked: (params) => {
    if (!params?.data) return
    
    // Prevent opening sidebar when clicking on input fields (e.g., editing title)
    const target = params.event?.target
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
      return
    }
    // Also check if clicking inside a cell that has input focus
    if (target?.closest('.dartboard-input') || target?.closest('input')) {
      return
    }
    
    handleOpenTaskDetail(params.data._raw || params.data)
  },

  onRowDragEnd: (event) => {
    handleRowDragEnd(event)
  },
  onRowDragMove: (event) => {
    onRowDragMove(event)
  }
})

const paginationPageSize = computed(() => gridOptions.value.paginationPageSize || 50)
const totalRows = computed(() => rowData.value.length)
const showPagination = computed(() => totalRows.value > paginationPageSize.value)

function handleOpenTaskDetail(task) {
  if (!task) return
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
  emit('task-click', task)
}

function onGridReady(params) {
  gridApi.value = params.api

  // Listen for custom openDartboardSidebar event from DartboardCell
  params.api.addEventListener('openDartboardSidebar', (event) => {
    handleOpenTaskDetail(event.data?._raw || event.data)
  })
}
</script>

<template>
  <div class="project-tasks-grid">
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
      @grid-ready="onGridReady"
    />



  </div>
</template>

<style scoped>
.project-tasks-grid {
  min-height: 300px;
}

:deep(.ag-theme-quartz .ag-row-hover) {
  background-color: #f3f4f6 !important;
  cursor: pointer;
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

:deep(.row-placeholder) {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
}

/* Row drag handle visibility */
:deep(.ag-theme-quartz .ag-row-drag) {
  cursor: grab;
  opacity: 1 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
}

:deep(.ag-theme-quartz .ag-row-drag:active) {
  cursor: grabbing;
}

:deep(.ag-theme-quartz .ag-drag-handle) {
  display: flex !important;
  align-items: center;
  justify-content: center;
}

:deep(.ag-theme-quartz .ag-row-drag .ag-icon-grip) {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

:deep(.ag-theme-quartz .ag-row:hover .ag-row-drag .ag-icon-grip) {
  opacity: 1;
}

:deep(.ag-row-drag-cell) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Hide default AG Grid expand/collapse icons */
:deep(.ag-group-contracted),
:deep(.ag-group-expanded) {
  display: none !important;
}
</style>


