<script setup>
/**
 * ProjectBoardView - Main project board view with view switcher
 * 
 * This is the parent component that handles:
 * - View switching between Board, List, Calendar, Roadmap
 * - Project header display
 * - Delete confirmation modal
 * - Data fetching and passing to child components
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useKanbanColumnStore, useUIStore, useUserStore } from '@/stores'
import { reorderTasks } from '@/api/task.api'
import KanbanBoard from '@/components/task/KanbanBoard.vue'
import { useConfirm } from 'primevue/useconfirm'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const kanbanColumnStore = useKanbanColumnStore()
const uiStore = useUIStore()
const userStore = useUserStore()
const { t } = useI18n()
const confirm = useConfirm()

// Immediate sync of route param to store to ensure data loading uses correct ID
if (route.params.itemId) {
  projectStore.selectProjectItem(route.params.itemId)
}

const viewLoading = ref(false)

// Computed properties
const boardTaskCount = computed(() => taskStore.taskCount)
const isLoading = computed(() => viewLoading.value || taskStore.isLoading || kanbanColumnStore.isLoading)
const hasLoadedColumns = computed(() => kanbanColumnStore.hasLoaded)

const columns = computed(() => {
  const hasApiColumns = kanbanColumnStore.columnCount > 0
  const hasTaskColumns = taskStore.hasKanbanColumns
  
  const colorPalette = [
    'bg-gray-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500',
    'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500'
  ]
  
  function getColumnColor(index) {
    return colorPalette[index % colorPalette.length]
  }
  
  if (hasApiColumns) {
    return kanbanColumnStore.sortedColumns.map((column, index) => ({
      id: column.id,
      label: column.name || t('tasks.statusOptions.todo'),
      color: getColumnColor(index)
    }))
  }
  if (hasTaskColumns) {
    return taskStore.kanbanColumns.map((column, index) => ({
      id: column.id,
      label: column.name || t('tasks.statusOptions.todo'),
      color: getColumnColor(index)
    }))
  }
  return []
})

const tasksByColumn = computed(() => {
  const grouped = { ...taskStore.tasksByKanbanColumn }
  const unassigned = grouped.unassigned || []
  if (unassigned.length > 0 && columns.value.length > 0) {
    const firstColumnId = columns.value[0].id
    grouped[firstColumnId] = [...unassigned, ...(grouped[firstColumnId] || [])]
    delete grouped.unassigned
  }
  return grouped
})

// Event handlers
function handleDeleteColumn(column) {
  if (!column?.id) return
  confirm.require({
    dialogType: 'delete',
    header: t('projects.kanban.columns.deleteConfirm.title'),
    message: t('projects.kanban.columns.deleteConfirm.message', { name: column.label }),
    accept: async () => {
      try {
        await kanbanColumnStore.deleteColumn(column.id)
      } catch (error) {
        uiStore.showApiError(error)
      }
    }
  })
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

async function handleReorderTasks(taskIds) {
  const projectId = projectStore.activeProjectItemId
  if (!projectId || !taskIds.length) return
  
  try {
    await reorderTasks({
      projectItemId: projectId,
      taskIds
    })
    console.log('Tasks reordered successfully')
  } catch (error) {
    console.error('Failed to reorder tasks:', error)
  }
}

async function handleCreateSubtask(payload) {
  const parentId = typeof payload === 'object' ? payload.parentId : payload
  const kanbanColumnId = typeof payload === 'object' ? payload.kanbanColumnId : null
  const projectItemId = typeof payload === 'object' ? payload.projectItemId : null
  if (!parentId) return
  try {
    await taskStore.createNewTask({
      title: 'New Task',
      parentId,
      ...(projectItemId ? { projectItemId } : {}),
      ...(kanbanColumnId ? { kanbanColumnId } : {})
    })
  } catch (e) {
    console.error(e)
  }
}

async function handleUpdateTaskTitle({ taskId, title }) {
  try {
    await taskStore.updateTask(taskId, { title })
  } catch (e) {
    console.error(e)
  }
}

// Fetch data on mount and when item changes
async function loadBoardData() {
  if (!projectStore.activeProjectItemId) return
  
  viewLoading.value = true
  try {
    // Clear previous state to prevent stale data
    taskStore.clearState()
    kanbanColumnStore.clearState()
    
    await Promise.all([
      kanbanColumnStore.fetchColumns(),
      taskStore.fetchTasks()
    ])
  } finally {
    viewLoading.value = false
  }
}



// (Watcher for itemId removed - handled by ProjectView)

// Watch for item changes and load data
watch(
  () => projectStore.activeProjectItemId,
  (newId, oldId) => {
    // Only load if itemId actually changed
    if (newId && String(newId) !== String(oldId)) {
      loadBoardData()
    }
  },
  { immediate: true }
)

userStore.fetchUsers({ limit: 100 })
</script>

<template>
  <div class="kanban-board flex flex-col text-xs h-full">


    <!-- Board View (Kanban) -->
    <KanbanBoard
      class="flex-1"
      :columns="columns"
      :tasks-by-column="tasksByColumn"
      :is-loading="isLoading"
      :has-loaded-columns="hasLoadedColumns"
      @open-task="openTaskPanel"
      @delete-column="handleDeleteColumn"
    />
  </div>
</template>

<style scoped>
.kanban-board {
  height: 100%;
}
</style>
