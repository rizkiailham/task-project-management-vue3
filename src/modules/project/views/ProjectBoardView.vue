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
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import ProjectTasksGrid from '@/components/task/ProjectTasksGrid.vue'
import KanbanBoard from '@/components/task/KanbanBoard.vue'
import { LayoutGrid, List, Calendar, Map } from 'lucide-vue-next'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const kanbanColumnStore = useKanbanColumnStore()
const uiStore = useUIStore()
const userStore = useUserStore()
const { t } = useI18n()

// View switcher state
const currentView = ref('board') // 'board', 'list', 'calendar', 'roadmap'

// Delete confirmation modal state
const deleteConfirmVisible = ref(false)
const deleteConfirmLoading = ref(false)
const deleteTargetColumn = ref(null)

// Computed properties
const boardTaskCount = computed(() => taskStore.taskCount)
const isLoading = computed(() => taskStore.isLoading || kanbanColumnStore.isLoading)
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
  deleteTargetColumn.value = column
  deleteConfirmVisible.value = true
}

async function confirmDeleteColumn() {
  if (!deleteTargetColumn.value || deleteConfirmLoading.value) return
  deleteConfirmLoading.value = true
  try {
    await kanbanColumnStore.deleteColumn(deleteTargetColumn.value.id)
    deleteConfirmVisible.value = false
    deleteTargetColumn.value = null
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    deleteConfirmLoading.value = false
  }
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
  if (!parentId) return
  try {
    const response = await taskStore.createNewTask({
      title: 'New Task',
      parentId,
      ...(kanbanColumnId ? { kanbanColumnId } : {})
    })
    
    // Refetch tasks to get updated parent with subTasks array
    if (response?.task?.id || response?.data?.id || response?.id) {
      await taskStore.fetchTasks()
    }
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
  
  // Clear previous state to prevent stale data
  taskStore.clearState()
  kanbanColumnStore.clearState()
  
  await Promise.all([
    kanbanColumnStore.fetchColumns(),
    taskStore.fetchTasks()
  ])
}



// Sync route itemId with store (only if different)
watch(
  () => route.params.itemId,
  (itemId) => {
    if (itemId && String(itemId) !== String(projectStore.activeProjectItemId)) {
      projectStore.selectProjectItem(itemId)
    }
  },
  { immediate: true }
)

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
    <!-- Header -->
    <div class="flex-none px-6 pt-6 pb-2 mb-2 flex items-center justify-between">
      <div>
        <h1 class="text-base font-bold text-gray-900 dark-edit:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-[10px] text-gray-500 dark-edit:text-gray-400">
          {{ t('projects.tasksCount', { count: boardTaskCount }) }}
        </p>
      </div>

      <!-- View Switcher -->
      <div class="flex items-center gap-px rounded-lg border border-gray-200 bg-white p-0.5 dark-edit:border-gray-700 dark-edit:bg-gray-800">
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            currentView === 'list'
              ? 'bg-gray-100 text-gray-900 dark-edit:bg-gray-700 dark-edit:text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark-edit:text-gray-400 dark-edit:hover:bg-gray-700'
          ]"
          @click="currentView = 'list'"
        >
          <List class="h-4 w-4" />
          <span>List</span>
        </button>
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            currentView === 'board'
              ? 'bg-gray-100 text-gray-900 dark-edit:bg-gray-700 dark-edit:text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark-edit:text-gray-400 dark-edit:hover:bg-gray-700'
          ]"
          @click="currentView = 'board'"
        >
          <LayoutGrid class="h-4 w-4" />
          <span>Board</span>
        </button>
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            currentView === 'calendar'
              ? 'bg-gray-100 text-gray-900 dark-edit:bg-gray-700 dark-edit:text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark-edit:text-gray-400 dark-edit:hover:bg-gray-700'
          ]"
          @click="currentView = 'calendar'"
        >
          <Calendar class="h-4 w-4" />
          <span>Calendar</span>
        </button>
        <!-- <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            currentView === 'roadmap'
              ? 'bg-gray-100 text-gray-900 dark-edit:bg-gray-700 dark-edit:text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark-edit:text-gray-400 dark-edit:hover:bg-gray-700'
          ]"
          @click="currentView = 'roadmap'"
        >
          <Map class="h-4 w-4" />
          <span>Roadmap</span>
        </button> -->
      </div>
    </div>

    <!-- List View -->
    <div v-if="currentView === 'list'" class="flex-1 overflow-auto px-6 pb-6">
      <ProjectTasksGrid 
        :tasks="taskStore.tasks" 
        @task-click="openTaskPanel" 
        @reorder-tasks="handleReorderTasks" 
        @create-subtask="handleCreateSubtask"
        @update-task-title="handleUpdateTaskTitle"
      />
    </div>

    <!-- Calendar View Placeholder -->
    <div v-else-if="currentView === 'calendar'" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Calendar class="h-12 w-12 mx-auto text-gray-300 dark-edit:text-gray-600" />
        <h3 class="mt-4 text-lg font-medium text-gray-900 dark-edit:text-white">Calendar View</h3>
        <p class="mt-1 text-sm text-gray-500 dark-edit:text-gray-400">Coming soon</p>
      </div>
    </div>

    <!-- Roadmap View Placeholder -->
    <!-- <div v-else-if="currentView === 'roadmap'" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Map class="h-12 w-12 mx-auto text-gray-300 dark-edit:text-gray-600" />
        <h3 class="mt-4 text-lg font-medium text-gray-900 dark-edit:text-white">Roadmap View</h3>
        <p class="mt-1 text-sm text-gray-500 dark-edit:text-gray-400">Coming soon</p>
      </div>
    </div> -->

    <!-- Board View (Kanban) -->
    <KanbanBoard
      v-else
      :columns="columns"
      :tasks-by-column="tasksByColumn"
      :is-loading="isLoading"
      :has-loaded-columns="hasLoadedColumns"
      @open-task="openTaskPanel"
      @delete-column="handleDeleteColumn"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      v-model:visible="deleteConfirmVisible"
      :loading="deleteConfirmLoading"
      :title="t('projects.kanban.columns.deleteConfirm.title')"
      :message="t('projects.kanban.columns.deleteConfirm.message', { name: deleteTargetColumn?.label })"
      @confirm="confirmDeleteColumn"
    />
  </div>
</template>

<style scoped>
.kanban-board {
  height: 100%;
}
</style>
