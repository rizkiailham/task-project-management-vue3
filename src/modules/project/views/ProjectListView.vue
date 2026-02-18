<script setup>
/**
 * ProjectListView - List view for project tasks
 */
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore } from '@/stores'
import ProjectTasksGrid from '@/components/task/ProjectTasksGrid.vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t } = useI18n()

const tasks = computed(() => taskStore.tasks)
const isLoading = computed(() => taskStore.isLoading)

async function loadData() {
  if (projectStore.currentProjectId) {
    // Clear state before fetching to avoid stale data
    taskStore.clearState()
    await taskStore.fetchTasks()
  }
}

// Watch for item changes
watch(
  () => projectStore.activeProjectItemId,
  (newId, oldId) => {
    if (newId && String(newId) !== String(oldId)) {
      loadData()
    }
  },
  { immediate: true }
)

async function handleTaskClick(task) {
  if (!task?.id) return
  try {
    await taskStore.fetchTask(task.id)
    uiStore.openTaskPanel()
  } catch (error) {
    uiStore.showApiError(error, 'Failed to open task details')
  }
}

async function handleUpdateTaskTitle({ taskId, title }) {
  try {
    await taskStore.updateTask(taskId, { title }, { silent: true })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to update task title')
  }
}

async function handleUpdateTaskStatus({ taskId, kanbanColumnId, projectItemId } = {}) {
  if (!taskId || !kanbanColumnId) return
  try {
    await taskStore.updateTask(
      taskId,
      {
        kanbanColumnId,
        ...(projectItemId ? { projectItemId } : {})
      },
      { silent: true }
    )
  } catch (error) {
    uiStore.showApiError(error, 'Failed to update task status')
  }
}

async function handlePageChange(page) {
  try {
    await taskStore.fetchTasks({ page })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to change page')
  }
}

async function handlePageSizeChange(limit) {
  try {
    await taskStore.fetchTasks({ page: 1, limit })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to change page size')
  }
}

async function handleCreateSubtask({ parentId, projectItemId, kanbanColumnId } = {}) {
  if (!parentId) return
  try {
    await taskStore.createNewTask({
      parentId,
      ...(projectItemId ? { projectItemId } : {}),
      ...(kanbanColumnId ? { kanbanColumnId } : {}),
      title: 'New Task'
    })
  } catch (error) {
    uiStore.showApiError(error, 'Failed to create subtask')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Content -->
    <div class="flex-1 overflow-hidden p-6">
      <div v-if="isLoading" class="space-y-2">
        <Skeleton v-for="i in 5" :key="i" height="50px" />
      </div>
      
      <div v-else class="h-full">
        <ProjectTasksGrid 
          :tasks="tasks" 
          :meta="taskStore.pagination"
          @task-click="handleTaskClick"
          @create-subtask="handleCreateSubtask"
          @update-task-title="handleUpdateTaskTitle"
          @update-task-status="handleUpdateTaskStatus"
          @change-page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>
