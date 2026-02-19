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
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { useProjectStore } from '@/stores'
import { getKanbanColumns } from '@/api/kanbanColumn.api'
import SortHeader from '@/components/ag/SortHeader.vue'
import AssigneeCell from '@/components/task/AssigneeCell.vue'
import DueDateCell from '@/components/task/DueDateCell.vue'
import TagEditorDropdown from '@/components/task/TagEditorDropdown.vue'
import TrackingTimeCell from '@/components/task/TrackingTimeCell.vue'
import DartboardCell from '@/components/task/DartboardCell.vue'
import ProjectCell from '@/components/task/ProjectCell.vue'
import StatusCell from '@/components/task/StatusCell.vue'
import ProjectTasksGridColumnOptionsHeader from '@/components/task/projectTasksGrid/ProjectTasksGridColumnOptionsHeader.vue'
import { useProjectTaskColumns } from '@/components/task/projectTasksGrid/useProjectTaskColumns'
import { useProjectTaskFilters } from '@/components/task/projectTasksGrid/useProjectTaskFilters'
import ProjectTasksGridFilterBar from '@/components/task/projectTasksGrid/ProjectTasksGridFilterBar.vue'
import Pagination from '@/components/ui/Pagination.vue'


const projectStore = useProjectStore()
const { t } = useI18n()

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-115376}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{10 January 2026}____[v3]_[0102]_MTc2ODAwMzIwMDAwMA==565745f66e52728abae508b6680a451e'
)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  meta: {
    type: Object,
    default: () => null
  }
})

const currentPage = ref(1)
const pageSize = ref(10)
const totalRows = ref(0)
const totalPages = ref(1)

watch(
  () => props.meta,
  (newMeta) => {
    if (newMeta) {
      currentPage.value = newMeta.currentPage || 1
      pageSize.value = newMeta.itemsPerPage || newMeta.limit || 10
      totalRows.value = newMeta.totalItems || newMeta.total || 0
      totalPages.value = newMeta.totalPages || 1
    }
  },
  { immediate: true, deep: true }
)

function handlePageChange(page) {
  emit('change-page', page)
}

function handlePageSizeChange(size) {
  emit('update:pageSize', size)
}

function handleToggleColumn(columnId) {
  toggleColumnVisibility(columnId)
  nextTick(() => {
    applyColumnVisibilityToGrid(gridApi.value)
  })
}

function handleRemoveCustomColumn(columnId) {
  removeCustomColumn(columnId)
  nextTick(() => {
    applyColumnVisibilityToGrid(gridApi.value)
  })
}

const emit = defineEmits([
  'task-click',
  'update-assignee',
  'update-due-date',
  'reorder-tasks',
  'create-subtask',
  'update-task-title',
  'update-task-status',
  'change-page',
  'update:pageSize'
])

const gridApi = ref(null)
const focusKey = ref(null)
const pendingTitleUpdates = new Map()
const statusOptions = ref([])
const apiStatusOptions = ref([])
const {
  customColumns,
  columnMenuDefinitions,
  columnMenuItems,
  managedColumnDefs,
  setColumnScope,
  applyColumnVisibilityToGrid,
  toggleColumnVisibility,
  removeCustomColumn,
  mapTaskColumnMeta
} = useProjectTaskColumns(t)

const {
  activeFilters,
  filterableColumns,
  addFilter,
  removeFilter,
  updateFilter,
  resetFilters,
  applyFilters,
  getOperatorsForColumn
} = useProjectTaskFilters(t, {
  columnDefinitions: columnMenuDefinitions
})

const currentSort = ref([])

function handleSortChange({ colId, sort }) {
  if (!gridApi.value) return

  // Update local state
  if (!sort) {
    currentSort.value = currentSort.value.filter(s => s.colId !== colId)
  } else {
    const existing = currentSort.value.find(s => s.colId === colId)
    if (existing) {
      existing.sort = sort
    } else {
      // For single sort behavior (replace this with push for multi-sort if needed)
      currentSort.value = [{ colId, sort }]
    }
  }

  // Apply to grid
  gridApi.value.applyColumnState({
    state: currentSort.value,
    defaultState: { sort: null }
  })
  
  // Emit sort change event for backend filtering/sorting
  emit('sort-change', currentSort.value)
}

function openFilterForColumn(colId) {
  addFilter(colId)
}

// Track which parent IDs should be auto-expanded after subtask creation
const expandedParentIds = ref(new Set())

const STATUS_ICON_OPTIONS = [
  { id: '0', status: 'todo', progress: 0, color: '#9ca3af' },
  { id: '25', status: 'in_progress', progress: 25, color: '#14b8a6' },
  { id: '50', status: 'in_progress', progress: 50, color: '#a855f7' },
  { id: '75', status: 'in_progress', progress: 75, color: '#f97316' },
  { id: '100', status: 'done', progress: 100, color: '#22c55e' }
]

function normalizeStatusIconValue(icon) {
  const raw = String(icon ?? '0')
  const legacyMap = {
    '1': '25',
    '2': '50',
    '3': '75',
    '4': '100',
    '5': '100'
  }
  const mapped = legacyMap[raw] || raw
  return STATUS_ICON_OPTIONS.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveStatusIconProps(icon, fallbackStatus = 'todo') {
  const normalizedIcon = normalizeStatusIconValue(icon)
  const option = STATUS_ICON_OPTIONS.find((item) => item.id === normalizedIcon)
  if (option) {
    return {
      icon: normalizedIcon,
      status: option.status,
      progress: option.progress,
      color: option.color
    }
  }
  if (fallbackStatus === 'done' || fallbackStatus === 'completed') {
    return { ...STATUS_ICON_OPTIONS[4], icon: '100' }
  }
  if (fallbackStatus === 'in_progress') {
    return { ...STATUS_ICON_OPTIONS[2], icon: '50' }
  }
  return { ...STATUS_ICON_OPTIONS[0], icon: '0' }
}

function walkTasks(tasks, visitor) {
  if (!Array.isArray(tasks)) return
  tasks.forEach((task) => {
    if (!task) return
    visitor(task)
    const nested = Array.isArray(task.subTasks)
      ? task.subTasks
      : Array.isArray(task.children)
        ? task.children
        : []
    if (nested.length) walkTasks(nested, visitor)
  })
}

function buildStatusOptionsFromTasks(taskList) {
  const options = new Map()
  walkTasks(taskList, (task) => {
    const columnId = task.kanbanColumnId || task.kanbanColumn?.id
    if (!columnId) return

    const iconProps = resolveStatusIconProps(task.kanbanColumn?.icon, task.status)
    const key = String(columnId)
    const next = {
      id: key,
      label: task.kanbanColumn?.name || task.status || t('taskDetail.status', 'Status'),
      index: Number(task.kanbanColumn?.index) || Number.MAX_SAFE_INTEGER,
      ...iconProps
    }

    if (!options.has(key)) {
      options.set(key, next)
      return
    }

    const prev = options.get(key)
    options.set(key, {
      ...prev,
      label: prev.label || next.label,
      index: Math.min(prev.index, next.index),
      icon: next.icon || prev.icon,
      status: next.status || prev.status,
      progress: Number.isFinite(next.progress) ? next.progress : prev.progress,
      color: next.color || prev.color
    })
  })

  return Array.from(options.values()).sort((a, b) => {
    const indexA = Number.isFinite(a.index) ? a.index : Number.MAX_SAFE_INTEGER
    const indexB = Number.isFinite(b.index) ? b.index : Number.MAX_SAFE_INTEGER
    if (indexA !== indexB) return indexA - indexB
    return String(a.label || '').localeCompare(String(b.label || ''))
  })
}

function mergeStatusOptions(primary = [], secondary = []) {
  const merged = new Map()

  primary.forEach((item) => {
    if (!item?.id) return
    merged.set(String(item.id), item)
  })

  secondary.forEach((item) => {
    if (!item?.id) return
    const key = String(item.id)
    if (!merged.has(key)) {
      merged.set(key, item)
      return
    }
    const prev = merged.get(key)
    merged.set(key, {
      ...prev,
      label: prev.label || item.label,
      icon: prev.icon || item.icon,
      status: prev.status || item.status,
      progress: Number.isFinite(prev.progress) ? prev.progress : item.progress,
      color: prev.color || item.color,
      index: Number.isFinite(prev.index) ? prev.index : item.index
    })
  })

  return Array.from(merged.values()).sort((a, b) => {
    const indexA = Number.isFinite(a.index) ? a.index : Number.MAX_SAFE_INTEGER
    const indexB = Number.isFinite(b.index) ? b.index : Number.MAX_SAFE_INTEGER
    if (indexA !== indexB) return indexA - indexB
    return String(a.label || '').localeCompare(String(b.label || ''))
  })
}

function mapColumnsToStatusOptions(columns = []) {
  const sorted = [...columns].sort((a, b) => (Number(a?.index) || 0) - (Number(b?.index) || 0))
  return sorted.map((column) => {
    const iconProps = resolveStatusIconProps(column?.icon)
    return {
      id: String(column.id),
      label: column?.name || t('taskDetail.status', 'Status'),
      index: Number(column?.index) || 0,
      ...iconProps
    }
  })
}

async function loadApiStatusOptions(projectItemId, projectId) {
  if (!projectItemId && !projectId) {
    apiStatusOptions.value = []
    return
  }

  try {
    // Primary source: Kanban Column API (runtime statuses).
    if (projectItemId) {
      const response = await getKanbanColumns({
        projectItemId,
        limit: 100,
        sortBy: 'index:ASC'
      })
      const columns = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []

      if (columns.length) {
        apiStatusOptions.value = mapColumnsToStatusOptions(columns)
        return
      }
    }

    // Fallback source: Project Columns (default template/status values).
    if (projectId) {
      const fallbackResponse = await projectStore.fetchProjectColumns(projectId)
      const fallbackColumns = Array.isArray(fallbackResponse) ? fallbackResponse : []
      apiStatusOptions.value = mapColumnsToStatusOptions(fallbackColumns)
      return
    }

    apiStatusOptions.value = []
  } catch (error) {
    apiStatusOptions.value = []
  }
}

// Helper to build hierarchy from flat list (supports nested subTasks/children)
function buildTree(flatTasks) {
  const taskMap = new Map()
  const roots = []

  const seen = new Set()
  const flattened = []

  const flatten = (items) => {
    if (!Array.isArray(items)) return
    items.forEach((item) => {
      if (!item || !item.id) return
      const key = String(item.id)
      if (!seen.has(key)) {
        seen.add(key)
        flattened.push(item)
      }
      const nested = Array.isArray(item.subTasks)
        ? item.subTasks
        : Array.isArray(item.children)
          ? item.children
          : []
      if (nested.length) flatten(nested)
    })
  }

  flatten(flatTasks)

  flattened.forEach((task) => {
    taskMap.set(String(task.id), { ...task, children: [] })
  })

  flattened.forEach((task) => {
    const parentId = task.parentId || task.parentTaskId
    const parentIdStr = parentId ? String(parentId) : null
    const node = taskMap.get(String(task.id))
    if (parentIdStr && taskMap.has(parentIdStr)) {
      taskMap.get(parentIdStr).children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// Helper function to flatten tree data with pathKey for AG Grid
function flattenTree(nodes, parentPathIds = []) {
  const result = []
  nodes.forEach((node, index) => {
    const nodeId = node.id || `${parentPathIds.join('-')}-${index}`
    const pathIds = [...parentPathIds, String(nodeId)]
    const pathKey = String(nodeId)
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    
    result.push({
      id: node.id,
      title: node.title,
      path: pathIds,
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
      ...mapTaskColumnMeta(node),
      kanbanColumnId: node.kanbanColumnId,
      kanbanColumnName: node.kanbanColumn?.name || '',
      kanbanColumnIcon: node.kanbanColumn?.icon || null,
      kanbanColumn: node.kanbanColumn || null,
      projectItemId: node.projectItemId || node.projectId || null,
      projectId: node.projectId,
      children: node.children || [],
      _raw: node
    })
    
    // Recursively flatten children
    if (hasChildren) {
      result.push(...flattenTree(node.children, pathIds))
    }
  })
  return result
}

// Local row data for manual drag and drop management
const rowData = ref([])

// Filtered row data — applies active filters before AG Grid receives data
const filteredRowData = computed(() => {
  return applyFilters(rowData.value)
})

// Sync with tasks prop and restore expansion state
watch(
  () => props.tasks,
  (newTasks) => {
    // Only update if not currently dragging
    if (!gridApi.value?.getDragStatus?.()) {
      // Build tree first, then flatten
      const tree = buildTree(newTasks)
      rowData.value = flattenTree(tree)
      pendingTitleUpdates.clear()
      
      // Restore expansion for tracked parents after data refresh
      // Use setTimeout to ensure AG Grid has processed the new transaction/data
      setTimeout(() => {
        if (expandedParentIds.value.size > 0 && gridApi.value) {
          gridApi.value.forEachNode((node) => {
            const nodeId = node.data?.id ? String(node.data.id) : null
            if (nodeId && expandedParentIds.value.has(nodeId)) {
              node.setExpanded(true)
            }
          })
        }
      }, 50)
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => [projectStore.activeProjectItemId, projectStore.currentProjectId],
  ([projectItemId, projectId]) => {
    setColumnScope(projectItemId, projectId)
    loadApiStatusOptions(projectItemId, projectId)
    nextTick(() => {
      applyColumnVisibilityToGrid(gridApi.value)
    })
  },
  { immediate: true }
)

watch(
  [managedColumnDefs, customColumns],
  () => {
    nextTick(() => {
      applyColumnVisibilityToGrid(gridApi.value)
    })
  },
  { deep: true }
)

watch(
  [() => props.tasks, apiStatusOptions],
  ([tasksList, remoteOptions]) => {
    const fromTasks = buildStatusOptionsFromTasks(tasksList)
    statusOptions.value = mergeStatusOptions(remoteOptions, fromTasks)
  },
  { immediate: true, deep: true }
)

// Get data path for tree structure
const getDataPath = (data) => data.path || [data.id || data.title]

// Get row ID
const getRowId = (params) => params.data?.id || params.data?.pathKey || params.data?.title

function updateField(pathKey, field, value) {
  const resolvedKey = String(pathKey || '')
  const task = findTaskInTreeById(props.tasks, resolvedKey)
  if (task) {
    if (field === 'assignee') {
      emit('update-assignee', { taskId: task.id, user: value })
    }
  }
}

function findTaskInTreeById(taskList, taskId) {
  if (!Array.isArray(taskList) || !taskId) return null
  const lookupId = String(taskId)
  for (const task of taskList) {
    if (!task) continue
    if (String(task.id) === lookupId) return task
    const nested = Array.isArray(task.subTasks)
      ? task.subTasks
      : Array.isArray(task.children)
        ? task.children
        : []
    const nestedMatch = findTaskInTreeById(nested, lookupId)
    if (nestedMatch) return nestedMatch
  }
  return null
}

function findNodeByPathKey(pathKey) {
  if (!gridApi.value || !pathKey) return null
  const lookupKey = String(pathKey)

  const byId = gridApi.value.getRowNode(lookupKey)
  if (byId?.data) return byId

  let matched = null
  gridApi.value.forEachNode((node) => {
    if (matched || !node?.data) return
    const nodePathKey = node.data.pathKey ? String(node.data.pathKey) : ''
    const nodeId = node.data.id ? String(node.data.id) : ''
    if (nodePathKey === lookupKey || nodeId === lookupKey) {
      matched = node
    }
  })
  return matched
}

async function addSubtask(pathKey, options = {}) {
  const node = gridApi.value?.getRowNode(pathKey)
  if (!node) return

  const taskId = node.data?.id
  const parentKanbanColumnId = node.data?.kanbanColumnId || node.data?._raw?.kanbanColumnId || null
  const parentProjectItemId =
    node.data?.projectItemId ||
    node.data?.projectId ||
    node.data?._raw?.projectItemId ||
    node.data?._raw?.projectId ||
    null
  if (!taskId) return

  const { ensureEmpty = false, forceCreate = false } = options || {}

  // Check if parent already has children - if so, just expand
  // User Requirement: "for each parent only can make the subtask only one on this" (grid)
  // Grid should strictly prevent creating multiple subtasks on the same parent
  const existingChildren = props.tasks.filter((task) => {
    const parentId = task.parentId || task.parentTaskId
    return parentId && String(parentId) === String(taskId)
  })
  
  const hasKnownChildren =
    existingChildren.length > 0 ||
    node.data?.hasChildren ||
    (Array.isArray(node.data?.children) && node.data.children.length > 0) ||
    (Number.isFinite(node.data?.subtaskCount) && node.data.subtaskCount > 0)

  // Unless forceCreate is explicit (e.g. from context menu if supported later), deny creation
  if (hasKnownChildren && !forceCreate) {
    node.setExpanded(true)
    expandedParentIds.value.add(String(taskId))
    return
  }

  // Mark parent for auto-expansion (persists across data refreshes)
  expandedParentIds.value.add(String(taskId))
  
  // Expand parent immediately
  node.setExpanded(true)
  
  // Emit to parent to create subtask via API
  emit('create-subtask', {
    parentId: taskId,
    kanbanColumnId: parentKanbanColumnId,
    projectItemId: parentProjectItemId
  })

  // Optimistic update: Add placeholder child immediately for instant UI feedback
  if (!gridApi.value?.getDragStatus?.()) {
    const optimisticTask = {
      id: `temp-${Date.now()}`,
      parentId: taskId,
      title: 'New Task',
      status: 'incompleted',
      kanbanColumnId: parentKanbanColumnId,
      children: [],
      subTasks: [],
      dartboard: node.data.dartboard || 'Project',
      isOptimistic: true
    }
    
    // Create new list including optimistic task
    const currentTasks = [...props.tasks, optimisticTask]
    const tree = buildTree(currentTasks)
    rowData.value = flattenTree(tree)

    // Set focus to the new task
    const optimisticRow = rowData.value.find((row) => String(row.id) === String(optimisticTask.id))
    focusKey.value = optimisticRow?.pathKey || optimisticTask.id

    // Re-expand parent to show new child - use delay to allow grid to update
    setTimeout(() => {
      gridApi.value?.forEachNode((gridNode) => {
        const nodeId = gridNode.data?.id ? String(gridNode.data.id) : null
        if (nodeId && expandedParentIds.value.has(nodeId)) {
          gridNode.setExpanded(true)
        }
      })
      gridApi.value?.refreshClientSideRowModel?.('group')
    }, 50)
  }
}

function updateTitle(pathKey, title) {
  const node = findNodeByPathKey(pathKey)
  const resolvedTitle = title ?? ''

  if (node?.data) {
    // Keep typing updates local without forcing grid refresh.
    // A refresh here can blur the input and trigger unwanted commit/API calls per character.
    node.data.title = resolvedTitle
  }
}

function handleCommit(pathKey) {
  const node = findNodeByPathKey(pathKey)
  if (!node?.data?.id) return

  const taskId = String(node.data.id)
  if (taskId.startsWith('temp-')) return

  const nextTitle = String(node.data.title ?? '').trim()
  if (!nextTitle) return

  const sourceTask = findTaskInTreeById(props.tasks, taskId)
  const sourceTitle = String(sourceTask?.title ?? node.data?._raw?.title ?? '').trim()
  if (sourceTitle === nextTitle) return

  const pendingTitle = pendingTitleUpdates.get(taskId)
  if (pendingTitle === nextTitle) return

  pendingTitleUpdates.set(taskId, nextTitle)
  setTimeout(() => {
    if (pendingTitleUpdates.get(taskId) === nextTitle) {
      pendingTitleUpdates.delete(taskId)
    }
  }, 3000)

  if (node.data._raw) {
    node.data._raw.title = nextTitle
  }

  emit('update-task-title', { taskId: node.data.id, title: nextTitle })
}

function updateStatus(payload = {}) {
  const taskId = payload?.taskId ? String(payload.taskId) : ''
  const kanbanColumnId = payload?.kanbanColumnId ? String(payload.kanbanColumnId) : ''
  if (!taskId || !kanbanColumnId) return

  const node = findNodeByPathKey(taskId)
  const selectedOption = statusOptions.value.find((item) => String(item.id) === kanbanColumnId)
  const currentColumnId = payload?.previousKanbanColumnId
    ? String(payload.previousKanbanColumnId)
    : node?.data?.kanbanColumnId
      ? String(node.data.kanbanColumnId)
      : ''
  if (currentColumnId && currentColumnId === kanbanColumnId) return

  // Important FE/BE mapping note:
  // This "status" interaction is actually Kanban Column movement.
  // We intentionally update `kanbanColumnId`/`kanbanColumn` only, not `status`.
  if (node?.data) {
    node.data.kanbanColumnId = kanbanColumnId
    if (selectedOption?.label) {
      node.data.kanbanColumnName = selectedOption.label
    }
    if (node.data._raw) {
      node.data._raw.kanbanColumnId = kanbanColumnId
      node.data._raw.kanbanColumn = {
        ...(node.data._raw.kanbanColumn || {}),
        id: kanbanColumnId,
        name: selectedOption?.label || node.data._raw.kanbanColumn?.name
      }
    }
    // Keep AG Grid cell visually synced immediately before API resolves.
    gridApi.value?.refreshCells?.({
      rowNodes: [node],
      columns: ['status'],
      force: true
    })
  } else {
    // Fallback for cases where row node is not resolved yet.
    const rowIndex = rowData.value.findIndex((row) => String(row.id) === taskId)
    if (rowIndex !== -1) {
      const nextRow = { ...rowData.value[rowIndex] }
      nextRow.kanbanColumnId = kanbanColumnId
      if (selectedOption?.label) {
        nextRow.kanbanColumnName = selectedOption.label
      }
      if (nextRow._raw) {
        nextRow._raw = {
          ...nextRow._raw,
          kanbanColumnId,
          kanbanColumn: {
            ...(nextRow._raw.kanbanColumn || {}),
            id: kanbanColumnId,
            name: selectedOption?.label || nextRow._raw.kanbanColumn?.name
          }
        }
      }
      rowData.value.splice(rowIndex, 1, nextRow)
      rowData.value = [...rowData.value]
    }
  }

  emit('update-task-status', {
    taskId,
    kanbanColumnId,
    projectItemId: payload?.projectItemId || node?.data?.projectItemId || node?.data?._raw?.projectItemId || node?.data?._raw?.projectId || null
  })
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
  
  // Wrap in setTimeout to avoid "middle of drawing rows" error #252
  // But we need to be careful not to flood the event loop, so maybe use a small debounce if needed.
  // For now, strict setTimeout(..., 0) as recommended by AG Grid error.
  setTimeout(() => {
    // Re-validate to ensure we don't have stale closures if rapid drags happen? 
    // Actually, onRowDragMove happens rapidly. 
    // Basic protection against race conditions might be needed but let's trust the event order for now.
    rowData.value = updated
  }, 0)
}

async function handleRowDragEnd(event) {
  // Emit state based on current rowData order
  const allRowIds = rowData.value
    .map(row => row.id)
    .filter(Boolean)
  
  emit('reorder-tasks', allRowIds)
}

const baseColumnDefs = [
  {
    colId: 'projectName',
    field: 'projectName',
    headerName: t('tasks.project', 'Project'),
    flex: 1,
    minWidth: 140,
    cellClass: 'flex items-center justify-center p-0',
    cellRenderer: 'ProjectCell',
    rowDragText: (params) => {
      return params.rowNode?.data?.title || 'Unknown Task'
    }
  },
  {
    colId: 'status',
    field: 'status',
    headerName: t('taskDetail.status', 'Status'),
    width: 100,
    minWidth: 80,
    headerComponent: 'SortHeader',
    cellRenderer: 'StatusCell',
    cellClass: 'flex items-center justify-center p-0',
    rowDragText: (params) => {
      return params.rowNode?.data?.title || 'Unknown Task'
    }
  },
  {
    colId: 'assignee',
    field: 'assignee',
    headerName: t('taskDetail.assignee', 'Assignee'),
    width: 120,
    minWidth: 80,
    headerComponent: 'SortHeader',
    cellRenderer: 'AssigneeCell',
    cellClass: 'flex items-center justify-center p-0',
    rowDragText: (params) => {
      return params.rowNode?.data?.title || 'Unknown Task'
    }
  },
  {
    colId: 'dueDate',
    field: 'dueDate',
    headerName: t('taskDetail.dueDate', 'Due date'),
    flex: 0.8,
    minWidth: 120,
    cellRenderer: 'DueDateCell',
    rowDragText: (params) => {
      return params.rowNode?.data?.title || 'Unknown Task'
    }
  },
  {
    colId: 'tags',
    field: 'tags',
    headerName: t('taskDetail.tags', 'Tags'),
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
    },
    rowDragText: (params) => {
      return params.rowNode?.data?.title || 'Unknown Task'
    }
  }
]

const optionsColumnDef = {
  colId: 'columnOptions',
  field: 'columnOptions',
  headerName: '',
  width: 44,
  minWidth: 44,
  maxWidth: 44,
  sortable: false,
  filter: false,
  resizable: false,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerClass: 'ag-header-cell-center',
  cellClass: 'column-options-cell p-0',
  cellRenderer: () => '',
  headerComponent: 'ProjectTasksGridColumnOptionsHeader'
}

const columnDefs = computed(() => [...baseColumnDefs, ...managedColumnDefs.value, optionsColumnDef])

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader',
  rowDragText: (params, dragItemCount) => {
    // Return title directly to override default count
    const data = params.rowNode?.data;
    return data?.title || 'Unknown Task';
  }
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
  headerTextColor: '#374151',
  rowBorder: true,
  rowVerticalPaddingScale: 0.8,
  sidePanelBorder: true,
  spacing: 6,
  wrapperBorder: false,
  wrapperBorderRadius: 2
})

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const autoGroupColumnDef = {
  colId: 'title',
  headerName: '',
  minWidth: 280,
  flex: 1.5,
  suppressHeaderMenuButton: true,
  suppressHeaderFilterButton: true,
  headerComponent: 'SortHeader',
  sortable: false, // Disable sorting to remove icon
  // rowDrag: true, // Enable drag and drop custom implementation instead
  rowDragText: (params, dragItemCount) => {
    // Return title directly to override default count
    const data = params.rowNode?.data;
    return data?.title || 'Unknown Task';
  },
  cellRendererParams: {
    suppressCount: true,
    suppressDoubleClickExpand: true,
    suppressEnterExpand: true,
    suppressPadding: true,
    innerRenderer: 'DartboardCell'
  },
  cellRenderer: 'agGroupCellRenderer',
  cellClass: 'no-padding-cell',
  valueGetter: (params) => params.data?.title // Ensure title is shown, not path key
}

const getTaskRowDragText = (params) => params?.rowNode?.data?.title || params?.defaultTextValue || ''



const gridOptions = ref({
  defaultColDef,
  animateRows: true,
  theme: myTheme,
  rowDragEntireRow: true,
  rowDragManaged: true, // Let grid manage the drag UI/ghost
  suppressMoveWhenRowDragging: true, // Prevent default move behavior to keep control
  rowDragText: (params) => getTaskRowDragText(params),
  pagination: false,

  components: {
    SortHeader,
    AssigneeCell,
    DueDateCell,
    TagEditorDropdown,
    TrackingTimeCell,
    DartboardCell,
    ProjectCell,
    StatusCell,
    ProjectTasksGridColumnOptionsHeader
  },




  context: {
    updateField,
    tagOptions: ref([]),
    statusOptions,
    columnMenuItems,
    customColumns,
    toggleColumnOption: handleToggleColumn,
    removeCustomColumnOption: handleRemoveCustomColumn,
    openFilterForColumn,
    updateStatus,
    addSubtask,
    updateTitle,
    handleCommit,
    focusKey
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: false,
    checkboxes: true,
    enableSelectionWithoutKeys: true,
    enableClickSelection: false
  },
  selectionColumnDef: {
    width: 25,
    minWidth: 25,
    maxWidth: 25,
    resizable: false,
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true
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



function handleOpenTaskDetail(task) {
  if (!task) return
  emit('task-click', task)
}

function onGridReady(params) {
  gridApi.value = params.api
  applyColumnVisibilityToGrid(gridApi.value)

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
      :rowData="filteredRowData"
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
      :pagination="true"
      :paginationPageSize="pageSize"
      :suppressPaginationPanel="true"
      domLayout="autoHeight"
      @grid-ready="onGridReady"
    />

    <!-- Fixed Footer -->
    <Pagination
      v-model:currentPage="currentPage"
      :totalPages="totalPages"
      :pageSize="pageSize"
      @update:pageSize="handlePageSizeChange"
      @change-page="handlePageChange"
      :totalItems="totalRows"
    >
      <template #filters>
        <ProjectTasksGridFilterBar
          :activeFilters="activeFilters"
          :filterableColumns="filterableColumns"
          :statusOptions="statusOptions"
          :sortModel="currentSort"
          :getOperatorsForColumn="getOperatorsForColumn"
          @add-filter="addFilter"
          @remove-filter="removeFilter"
          @update-filter="(id, updates) => updateFilter(id, updates)"
          @reset-filters="resetFilters"
          @update-sort="handleSortChange"
        />
      </template>
    </Pagination>



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

:deep(.ag-theme-quartz .ag-cell.column-options-cell .ag-cell-value) {
  width: 100%;
}

:deep(.ag-theme-quartz .ag-header-select-all) {
  opacity: 1;
}

:deep(.ag-theme-quartz .ag-cell[col-id="ag-Grid-SelectionColumn"]),
:deep(.ag-theme-quartz .ag-header-cell[col-id="ag-Grid-SelectionColumn"]),
:deep(.ag-theme-quartz .ag-cell[col-id="ag-Grid-ControlsColumn"]),
:deep(.ag-theme-quartz .ag-header-cell[col-id="ag-Grid-ControlsColumn"]) {
  padding-right: 0 !important;
  padding-left: 6px !important;
}

:deep(.ag-theme-quartz .ag-cell[col-id="ag-Grid-SelectionColumn"] .ag-selection-checkbox),
:deep(.ag-theme-quartz .ag-header-cell[col-id="ag-Grid-SelectionColumn"] .ag-selection-checkbox),
:deep(.ag-theme-quartz .ag-cell[col-id="ag-Grid-ControlsColumn"] .ag-selection-checkbox),
:deep(.ag-theme-quartz .ag-header-cell[col-id="ag-Grid-ControlsColumn"] .ag-selection-checkbox) {
  margin-right: 0 !important;
  margin-left: 0 !important;
}

:deep(.ag-theme-quartz .ag-header-cell::after) {
  display: none !important;
}

:deep(.ag-theme-quartz .ag-group-value) {
  display: flex;
  align-items: center;
  gap: 0 !important;
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

/* Keep assignee tooltip visible above AG Grid row/cell clipping contexts */
:deep(.ag-theme-quartz .ag-cell[col-id="assignee"]),
:deep(.ag-theme-quartz .ag-cell[col-id="assignee"] .ag-cell-wrapper),
:deep(.ag-theme-quartz .ag-cell[col-id="assignee"] .ag-cell-value) {
  overflow: visible !important;
}

:deep(.row-placeholder) {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
}

/* Row drag handle visibility */
/* Row drag handle visibility */
:deep(.ag-theme-quartz .ag-row-drag) {
  display: none !important;
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

:deep(.ag-header-cell-center .ag-header-cell-comp-wrapper),
:deep(.ag-header-cell-center .sort-header) {
  justify-content: center !important;
}

:deep(.ag-header-cell-center .sort-header__label) {
  flex: 0 0 auto !important;
}

/* Ensure inner renderer fills full cell width for hover detection */
:deep(.ag-cell-wrapper) {
  width: 100%;
}

:deep(.ag-group-value) {
  width: 100%;
  flex: 1;
}

:deep(.ag-row-group-leaf-indent) {
  margin-left: 0 !important;
}

:deep(.no-padding-cell) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>

<style>
/* Global overrides for AG Grid dynamic elements */
.ag-theme-quartz .ag-header-cell[col-id="ag-Grid-SelectionColumn"] {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.ag-theme-quartz .ag-header-select-all {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.ag-theme-quartz .no-padding-cell {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* Hide resize handles by default; reveal on header hover/resize interaction */
.ag-theme-quartz .ag-header-cell .ag-header-cell-resize {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}

.ag-theme-quartz .ag-header-cell:hover .ag-header-cell-resize,
.ag-theme-quartz .ag-header-cell.ag-header-active .ag-header-cell-resize,
.ag-theme-quartz .ag-header-cell.ag-header-cell-moving .ag-header-cell-resize,
.ag-theme-quartz.ag-column-resizing .ag-header-cell .ag-header-cell-resize {
  opacity: 1;
  pointer-events: auto;
}
</style>
