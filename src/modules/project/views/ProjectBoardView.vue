<script setup>
/**
 * ProjectBoardView - Kanban board view for project tasks
 */
import { computed, ref, watch, reactive, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useKanbanColumnStore, useUIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { Plus, MoreHorizontal, Pencil, ArrowLeft, ArrowRight, EyeOff, Trash2 } from 'lucide-vue-next'

// PrimeVue
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { VueDraggableNext as Draggable } from 'vue-draggable-next'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const kanbanColumnStore = useKanbanColumnStore()
const uiStore = useUIStore()
const { t, locale } = useI18n()

// State
const draggedTask = ref(null)
const isDragging = ref(false)
const columnTasks = reactive({})
const newColumnName = ref('')
const isCreatingColumn = ref(false)
const showAddColumnInput = ref(false)
const pendingInsertIndex = ref(null)
const hideEmptyColumns = ref(false)
const deleteConfirmVisible = ref(false)
const deleteConfirmLoading = ref(false)
const deleteTargetColumn = ref(null)
const creatingTaskColumnId = ref(null)
const newTaskTitle = ref('')
const isCreatingTask = ref(false)
const newTaskInputRefs = ref({})
const addColumnInputRef = ref(null)
const columnCommitLock = ref(false)
const taskCommitLock = ref(false)
const editingColumnId = ref(null)
const editingColumnName = ref('')
const columnTitleInputRefs = ref({})

// Kanban columns configuration
const colorPalette = [
  'bg-gray-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500'
]

function getColumnBackground(colorClass) {
  if (!colorClass) return 'bg-gray-50 dark-edit:bg-gray-900'
  return colorClass.replace('500', '50') + ' dark-edit:bg-opacity-10 dark-edit:bg-gray-800'
}


function getColumnColor(index) {
  return colorPalette[index % colorPalette.length]
}

const tasksByStatus = computed(() => taskStore.tasksByStatus)
const tasksByKanbanColumn = computed(() => taskStore.tasksByKanbanColumn)
const hasTaskColumns = computed(() => taskStore.hasKanbanColumns)
const hasApiColumns = computed(() => kanbanColumnStore.columnCount > 0)

const isLoading = computed(() => taskStore.isLoading || kanbanColumnStore.isLoading)
const hasLoadedColumns = computed(() => kanbanColumnStore.hasLoaded)
const isInitialLoading = computed(() => isLoading.value && !hasApiColumns.value && !hasTaskColumns.value)
const boardTaskCount = computed(() => taskStore.taskCount)
const tasksByColumn = computed(() => {
  if (!hasApiColumns.value && !hasTaskColumns.value) return {}
  const grouped = { ...tasksByKanbanColumn.value }
  const unassigned = grouped.unassigned || []
  if (unassigned.length > 0 && columns.value.length > 0) {
    const firstColumnId = columns.value[0].id
    grouped[firstColumnId] = [...unassigned, ...(grouped[firstColumnId] || [])]
    delete grouped.unassigned
  }
  return grouped
})

const columns = computed(() => {
  if (hasApiColumns.value) {
    return kanbanColumnStore.sortedColumns.map((column, index) => ({
      id: column.id,
      label: column.name || t('tasks.statusOptions.todo'),
      color: getColumnColor(index)
    }))
  }
  if (hasTaskColumns.value) {
    return taskStore.kanbanColumns.map((column, index) => ({
      id: column.id,
      label: column.name || t('tasks.statusOptions.todo'),
      color: getColumnColor(index)
    }))
  }
  return []
})

const visibleColumns = computed(() => {
  if (!hideEmptyColumns.value) return columns.value
  return columns.value.filter((column) => (getColumnTasks(column.id) || []).length > 0)
})

const displayColumns = computed(() => {
  const base = [...visibleColumns.value]
  if (!showAddColumnInput.value) return base
  const insertIndex = pendingInsertIndex.value ?? base.length
  const safeIndex = Math.min(Math.max(insertIndex, 0), base.length)
  base.splice(safeIndex, 0, { id: 'add-column-input', isAddInput: true })
  return base
})

const isDragEnabled = computed(() => !isInitialLoading.value && columns.value.length > 0)

// Methods
function getColumnTasks(status) {
  return columnTasks[status] || []
}

function ensureColumnTasks(status) {
  if (!columnTasks[status]) {
    columnTasks[status] = []
  }
  return columnTasks[status]
}

function onDragStart() {
  isDragging.value = true
}

function onDragEnd() {
  draggedTask.value = null
  isDragging.value = false
  // Removed manual syncColumnTasks here to avoid race conditions with API updates
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

async function createColumn() {
  const name = newColumnName.value.trim()
  if (!name) return

  isCreatingColumn.value = true
  try {
    const response = await kanbanColumnStore.createColumn({ name })
    uiStore.showApiSuccess(response)
    const created = response?.column || response?.data || response
    if (pendingInsertIndex.value !== null && created?.id) {
      const orderedIds = columns.value
        .map((column) => column.id)
        .filter((id) => id !== created.id)
      const safeIndex = Math.min(Math.max(pendingInsertIndex.value, 0), orderedIds.length)
      orderedIds.splice(safeIndex, 0, created.id)
      await kanbanColumnStore.reorderColumns(orderedIds)
    }
    newColumnName.value = ''
    showAddColumnInput.value = false
    pendingInsertIndex.value = null
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isCreatingColumn.value = false
  }
}

function startAddColumn(insertIndex = null) {
  showAddColumnInput.value = true
  pendingInsertIndex.value = insertIndex
  newColumnName.value = ''
  nextTick(() => {
    addColumnInputRef.value?.focus?.()
  })
}

function cancelAddColumn() {
  showAddColumnInput.value = false
  pendingInsertIndex.value = null
  newColumnName.value = ''
}

async function handleColumnInputCommit() {
  if (columnCommitLock.value || isCreatingColumn.value) return
  const name = newColumnName.value.trim()
  if (!name) {
    cancelAddColumn()
    return
  }
  columnCommitLock.value = true
  try {
    await createColumn()
  } finally {
    columnCommitLock.value = false
  }
}

function startEditingColumn(column) {
  editingColumnId.value = column.id
  editingColumnName.value = column.label
  nextTick(() => {
    columnTitleInputRefs.value[column.id]?.$el?.focus()
  })
}

async function saveColumnTitle(column) {
  if (editingColumnId.value !== column.id) return
  
  const name = editingColumnName.value.trim()
  if (name && name !== column.label) {
    try {
      await kanbanColumnStore.updateColumn(column.id, { name })
    } catch (error) {
      uiStore.showApiError(error)
    }
  }
  editingColumnId.value = null
  editingColumnName.value = ''
}

function cancelEditingColumn() {
  editingColumnId.value = null
  editingColumnName.value = ''
}

function setNewTaskInputRef(columnId, el) {
  if (!el) return
  newTaskInputRefs.value[columnId] = el
}

async function startAddTaskInline(columnId) {
  creatingTaskColumnId.value = columnId
  newTaskTitle.value = ''
  await nextTick()
  newTaskInputRefs.value[columnId]?.focus?.()
}

function cancelAddTaskInline() {
  creatingTaskColumnId.value = null
  newTaskTitle.value = ''
}

async function saveNewTaskInline(columnId) {
  if (taskCommitLock.value || isCreatingTask.value) return
  const title = newTaskTitle.value.trim()
  if (!title) {
    cancelAddTaskInline()
    return
  }

  taskCommitLock.value = true
  isCreatingTask.value = true
  try {
    const response = await taskStore.createNewTask({
      title,
      kanbanColumnId: columnId
    })
    uiStore.showApiSuccess(response)
    cancelAddTaskInline()
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isCreatingTask.value = false
    taskCommitLock.value = false
  }
}

function renameColumn(column) {
  startEditingColumn(column)
}

function confirmDeleteColumn(column) {
  deleteTargetColumn.value = column
  deleteConfirmVisible.value = true
}

async function deleteColumn() {
  if (!deleteTargetColumn.value || deleteConfirmLoading.value) return
  deleteConfirmLoading.value = true
  try {
    const response = await kanbanColumnStore.deleteColumn(deleteTargetColumn.value.id)
    uiStore.showApiSuccess(response)
    deleteConfirmVisible.value = false
    deleteTargetColumn.value = null
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    deleteConfirmLoading.value = false
  }
}

function getColumnMenuItems(column, index) {
  const baseIndex = columns.value.findIndex((item) => item.id === column.id)
  const resolvedIndex = baseIndex === -1 ? index : baseIndex
  return [
    { label: t('projects.kanban.columns.menu.rename'), icon: Pencil, action: () => renameColumn(column) },
    {
      label: t('projects.kanban.columns.menu.addLeft'),
      icon: ArrowLeft,
      action: () => startAddColumn(Math.max(resolvedIndex, 0))
    },
    {
      label: t('projects.kanban.columns.menu.addRight'),
      icon: ArrowRight,
      action: () => startAddColumn(Math.max(resolvedIndex + 1, 0))
    },
    {
      label: t('projects.kanban.columns.menu.hideEmpty'),
      icon: EyeOff,
      action: () => { hideEmptyColumns.value = !hideEmptyColumns.value }
    },
    { type: 'divider' },
    {
      label: t('projects.kanban.columns.menu.delete'),
      icon: Trash2,
      action: () => confirmDeleteColumn(column)
    }
  ]
}

function openAddTask(column) {
  startAddTaskInline(column.id)
}

function getColumnTitleWidth(label) {
  const length = (label || '').length || 1
  const clamped = Math.min(Math.max(length + 2, 8), 22)
  return `${clamped}ch`
}

function getPriorityColor(priority) {
  const colors = {
    [TaskPriority.URGENT]: 'border-l-red-500',
    [TaskPriority.HIGH]: 'border-l-orange-500',
    [TaskPriority.MEDIUM]: 'border-l-yellow-500',
    [TaskPriority.LOW]: 'border-l-gray-300'
  }
  return colors[priority] || 'border-l-gray-300'
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return t('calendar.today')
  if (d.toDateString() === tomorrow.toDateString()) return t('calendar.tomorrow')

  return d.toLocaleDateString(locale.value || 'en', { month: 'short', day: 'numeric' })
}

function isOverdue(task) {
  if (!task.dueDate || task.status === TaskStatus.DONE) return false
  return new Date(task.dueDate) < new Date()
}

function syncColumnTasks() {
  columns.value.forEach(({ id }) => {
    ensureColumnTasks(id)
  })
  const next = {}
  columns.value.forEach(({ id }) => {
    next[id] = [...(tasksByColumn.value[id] || [])]
  })
  Object.keys(columnTasks).forEach((key) => {
    if (!(key in next)) {
      delete columnTasks[key]
    }
  })
  Object.entries(next).forEach(([key, value]) => {
    columnTasks[key] = value
  })
}

function handleDragStart(event) {
  isDragging.value = true
  // Sortable.js stores the dragged element in event.item
  // We can try to find the task by id if needed, but usually not required for visual dragging
}

async function handleDragChange(event, targetColumnId) {
  if (!isDragEnabled.value) return

  const moved = event?.moved?.element
  const added = event?.added?.element
  const task = added || moved
  if (!task) return
  if (!task.id) return

  const targetList = getColumnTasks(targetColumnId)
  const taskIds = targetList.map((item) => item.id).filter(Boolean)
  if (!taskIds.length) return

  try {
    const response = await taskStore.reorderKanbanTasks(task.id, targetColumnId, taskIds)
    uiStore.showApiSuccess(response)
  } catch (error) {
    uiStore.showApiError(error)
    syncColumnTasks()
  }
}

function handleDragEnd() {
  isDragging.value = false
  onDragEnd()
}

columns.value.forEach(({ id }) => {
  ensureColumnTasks(id)
})
syncColumnTasks()

watch([tasksByColumn, hasApiColumns, hasTaskColumns], () => {
  if (isDragging.value) return
  syncColumnTasks()
}, { immediate: true })

watch(columns, (next) => {
  next.forEach(({ id }) => {
    ensureColumnTasks(id)
  })
}, { immediate: true })

kanbanColumnStore.fetchColumns()
taskStore.fetchTasks()
</script>

<template>
  <div class="kanban-board flex flex-col text-xs ">
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
    </div>

    <!-- Board Content -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-0">
      <div class="h-full min-w-full inline-flex">
        <!-- Loading State -->
        <div v-if="isInitialLoading" class="flex gap-4">
          <div v-for="i in 4" :key="i" class="w-72 flex-shrink-0">
            <Skeleton height="40px" class="mb-3" />
            <Skeleton v-for="j in 3" :key="j" height="100px" class="mb-2" />
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="columns.length === 0 && hasLoadedColumns"
          class="flex h-[320px] items-center justify-center"
        >
          <div class="w-full max-w-md rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center shadow-sm dark-edit:border-gray-700 dark-edit:bg-gray-900">
            <h3 class="text-base font-semibold text-gray-900 dark-edit:text-white">
              {{ t('projects.kanban.columns.empty.title') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark-edit:text-gray-400">
              {{ t('projects.kanban.columns.empty.description') }}
            </p>
            <div class="mt-4 flex flex-col gap-2 sm:flex-row">
              <InputText
                v-model="newColumnName"
                class="w-full"
                :placeholder="t('projects.kanban.columns.empty.placeholder')"
                :disabled="isCreatingColumn"
                @keydown.enter.prevent="handleColumnInputCommit"
                @blur="handleColumnInputCommit"
              />
            </div>
          </div>
        </div>

        <!-- Kanban Columns -->
        <TransitionGroup
          v-else
          tag="div"
          name="column-list"
          class="flex h-full gap-4"
        >
          <div
            v-for="(column, index) in displayColumns"
            :key="column.id"
            class="kanban-column w-80 flex-shrink-0 group"
          >
            <div
              v-if="column.isAddInput"
              class="mb-3 rounded-xl border border-dashed border-gray-300 bg-white/60 p-3 text-xs text-gray-500 shadow-sm dark-edit:border-gray-700 dark-edit:bg-gray-900/70"
            >
              <InputText
                v-model="newColumnName"
                ref="addColumnInputRef"
                class="w-full !border-0 !shadow-none !ring-0 focus:!ring-0 p-0 text-xs font-medium placeholder:font-normal bg-transparent"
                :placeholder="t('projects.kanban.columns.empty.placeholder')"
                :disabled="isCreatingColumn"
                @keydown.enter.prevent="handleColumnInputCommit"
                @blur="handleColumnInputCommit"
                autoFocus
              />
            </div>
            <template v-else>
            <div
              class="kanban-column-card flex h-full flex-col rounded-xl transition-colors"
              :class="[getColumnBackground(column.color)]"
            >
              <div class="kanban-column-header flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <span class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-black/5 px-1.5 text-[10px] font-medium text-gray-600 flex-shrink-0 dark-edit:bg-white/10 dark-edit:text-gray-300">
                    {{ ensureColumnTasks(column.id).length }}
                  </span>
                  <span :class="['h-2.5 w-2.5 rounded-full ring-2 ring-white/50 flex-shrink-0', column.color]"></span>
                  <div class="flex-1 min-w-0" @click="startEditingColumn(column)">
                    <h3
                      v-if="editingColumnId !== column.id"
                      class="font-semibold text-sm leading-6 text-gray-900 dark-edit:text-gray-100 truncate cursor-text hover:bg-gray-100 dark-edit:hover:bg-gray-800 rounded px-1 -ml-1 transition-colors"
                      :style="{ maxWidth: getColumnTitleWidth(column.label) }"
                      :title="t('projects.kanban.columns.renameHint') || 'Click to rename'"
                    >
                      {{ column.label }}
                    </h3>
                    <InputText
                      v-else
                      :ref="(el) => { if (el) columnTitleInputRefs[column.id] = el }"
                      v-model="editingColumnName"
                      class="!p-0 !border-0 !shadow-none !ring-0 focus:!ring-0 text-sm font-semibold leading-6 bg-transparent h-6"
                      :style="{ width: getColumnTitleWidth(editingColumnName) }"
                      @keydown.enter="saveColumnTitle(column)"
                      @blur="saveColumnTitle(column)"
                      @keydown.esc="cancelEditingColumn"
                      @click.stop
                    />
                  </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-black/5 hover:text-gray-700 dark-edit:text-gray-400 dark-edit:hover:bg-white/10 dark-edit:hover:text-gray-200"
                    :aria-label="t('projects.kanban.columns.addTask')"
                    @click.stop="openAddTask(column)"
                  >
                    <Plus class="h-4 w-4" />
                  </button>
                  <DropdownMenu :items="getColumnMenuItems(column, index)" position="right" width="15rem">
                    <template #trigger>
                      <button
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-black/5 hover:text-gray-700 dark-edit:text-gray-400 dark-edit:hover:bg-white/10 dark-edit:hover:text-gray-200"
                        :aria-label="t('projects.kanban.columns.menu.open')"
                      >
                        <MoreHorizontal class="h-4 w-4" />
                      </button>
                    </template>
                  </DropdownMenu>
                </div>
              </div>
              <div class="kanban-column-body flex-1 overflow-y-auto px-2 py-2">
                <div
                  v-if="creatingTaskColumnId === column.id"
                  class="kanban-card--composer mb-3 rounded-lg border border-transparent bg-white p-2 shadow-sm ring-1 ring-black/5 dark-edit:bg-gray-800"
                >
                  <InputText
                    :ref="(el) => setNewTaskInputRef(column.id, el)"
                    v-model="newTaskTitle"
                    class="w-full !border-0 !shadow-none !ring-0 focus:!ring-0 p-0 text-xs font-medium placeholder:font-normal"
                    :placeholder="t('tasks.placeholders.title')"
                    :disabled="isCreatingTask"
                    @keydown.enter.prevent="saveNewTaskInline(column.id)"
                    @blur="saveNewTaskInline(column.id)"
                  />
                </div>

                <Draggable
                  v-model="columnTasks[column.id]"
                  group="kanban-board"
                  tag="div"
                  :item-key="'id'"
                  :disabled="!isDragEnabled"
                  class="kanban-column-content min-h-[100px] flex-1 space-y-2.5 pb-2"
                  ghost-class="kanban-card--ghost"
                  drag-class="kanban-card--dragging"
                  @start="handleDragStart"
                  @end="handleDragEnd"
                  @change="handleDragChange($event, column.id)"
                >
                  <div
                    v-for="task in columnTasks[column.id]"
                    :key="task.id"
                    data-kanban-card="true"
                    @click="openTaskPanel(task)"
                    :class="[
                      'kanban-card cursor-pointer rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md dark-edit:bg-gray-800 dark-edit:ring-white/10',
                      { 'kanban-card--dragging': draggedTask?.id === task.id }
                    ]"
                  >
                    <h4 class="font-medium text-sm text-gray-900 dark-edit:text-white">
                      {{ task.title }}
                    </h4>

                    <div class="mt-2 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span
                          v-if="task.dueDate"
                          :class="[
                            'flex items-center gap-1 text-[10px]',
                            isOverdue(task) ? 'text-red-600' : 'text-gray-500 dark-edit:text-gray-400'
                          ]"
                        >
                          <i class="pi pi-calendar text-[10px]"></i>
                          {{ formatDate(task.dueDate) }}
                        </span>
                        <span
                          v-if="task.subtaskCount > 0"
                          class="flex items-center gap-1 text-[10px] text-gray-500 dark-edit:text-gray-400"
                        >
                          <i class="pi pi-check-square text-[10px]"></i>
                          {{ task.completedSubtaskCount }}/{{ task.subtaskCount }}
                        </span>
                        <span
                          v-if="task.commentCount > 0"
                          class="flex items-center gap-1 text-[10px] text-gray-500 dark-edit:text-gray-400"
                        >
                          <i class="pi pi-comment text-[10px]"></i>
                          {{ task.commentCount }}
                        </span>
                      </div>
                      <Avatar
                        v-if="task.assignee"
                        :label="task.assignee.name?.charAt(0)"
                        shape="circle"
                        size="small"
                        class="bg-primary-100 text-primary-700 text-xs"
                        v-tooltip="task.assignee.name"
                      />
                    </div>

                    <div v-if="task.tags?.length > 0" class="mt-2 flex flex-wrap gap-1">
                      <span
                        v-for="tag in task.tags.slice(0, 3)"
                        :key="tag.id"
                        class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                      >
                        {{ tag.name }}
                      </span>
                      <span
                        v-if="task.tags.length > 3"
                        class="text-[10px] text-gray-400"
                       >
                        +{{ task.tags.length - 3 }}
                      </span>
                    </div>
                  </div>
                </Draggable>

                <div
                  v-if="ensureColumnTasks(column.id).length === 0"
                  class="flex h-24 items-center justify-center text-xs text-gray-400"
                >
                  {{ t('tasks.emptyState.title') }}
                </div>
              </div>
            </div>
            </template>
          </div>

          <div v-if="!showAddColumnInput" class="w-80 flex-shrink-0">
            <div class="mb-3 rounded-xl border border-dashed border-gray-300 bg-white/30 p-1 hover:bg-white hover:shadow-sm transition-all dark-edit:border-gray-700 dark-edit:bg-gray-900/60 dark-edit:hover:bg-gray-800">
              <button
                v-if="!showAddColumnInput"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
                @click="startAddColumn(columns.length)"
              >
                <Plus class="h-4 w-4" />
                {{ t('projects.kanban.columns.addSection') }}
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>


    <DeleteConfirmModal
      v-model:visible="deleteConfirmVisible"
      :header="t('projects.kanban.columns.delete.title')"
      :message="t('projects.kanban.columns.delete.message', { name: deleteTargetColumn?.label || '' })"
      :loading="deleteConfirmLoading"
      @confirm="deleteColumn"
      @cancel="deleteConfirmVisible = false"
    />
  </div>
</template>

<style scoped>
.kanban-board {
  height: calc(100vh - 80px);
}

.kanban-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  animation: card-enter 0.3s ease-out;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.kanban-card:hover {
  transform: translateY(-2px);
}

.kanban-card[draggable="true"]:active {
  cursor: grabbing;
  opacity: 0.8;
}

.kanban-card--dragging {
  opacity: 0.6;
  box-shadow: none;
  transform: scale(0.98);
}

.kanban-card--ghost {
  opacity: 0.4;
  background: transparent;
  border: 2px dashed rgba(156, 163, 175, 0.5);
  box-shadow: none;
}

.kanban-card--composer {
  animation: composer-enter 0.2s ease-out;
}

.kanban-column-content {
  transition: background-color 0.2s ease;
}



.kanban-column:hover .kanban-column-header button {
  opacity: 1;
}

.kanban-column-card {
  box-shadow: none;
}



.kanban-column-body {
  min-height: 240px;
}

@keyframes composer-enter {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Column List Transitions */
.column-list-move,
.column-list-enter-active,
.column-list-leave-active {
  transition: all 0.4s ease;
}

.column-list-enter-from,
.column-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.column-list-leave-active {
  position: absolute;
}
</style>
