<script setup>
/**
 * KanbanBoard - Kanban board component for project tasks
 * 
 * This component handles the visual representation and drag-and-drop
 * functionality of the Kanban board. It receives data from the parent
 * and emits events for mutations.
 */
import { computed, ref, reactive, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useKanbanColumnStore, useUIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { Plus, MoreHorizontal, Pencil, ArrowLeft, ArrowRight, EyeOff, Trash, ChevronDown } from 'lucide-vue-next'

// PrimeVue
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'

const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  tasksByColumn: {
    type: Object,
    default: () => ({})
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  hasLoadedColumns: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'create-column',
  'update-column',
  'delete-column',
  'reorder-columns',
  'create-task',
  'open-task',
  'update-assignee',
  'update-due-date',
  'reorder-tasks'
])

const taskStore = useTaskStore()
const kanbanColumnStore = useKanbanColumnStore()
const uiStore = useUIStore()
const { t, locale } = useI18n()

// Local state
const draggedTask = ref(null)
const isDragging = ref(false)
const columnTasks = reactive({})
const newColumnName = ref('')
const isCreatingColumn = ref(false)
const showAddColumnInput = ref(false)
const pendingInsertIndex = ref(null)
const hideEmptyColumns = ref(false)
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

// Empty State Logic
const templateOptions = [
  { label: 'Studio booking', action: () => applyTemplate('Studio booking') },
  { label: 'Podcast', action: () => applyTemplate('Podcast') },
  { label: 'Board for tennant', action: () => applyTemplate('Board for tennant') },
  { label: 'Board for technician', action: () => applyTemplate('Board for technician') }
]

async function handleEmptyStateCreateTask() {
  // Create a default column "To Do" if none exist
  isCreatingColumn.value = true
  try {
    // 1. Create Default Columns
    const defaultColumns = ['To Do', 'In Progress', 'Done']
    const createdColumns = []
    
    for (const name of defaultColumns) {
      const response = await kanbanColumnStore.createColumn({ name })
      const created = response?.column || response?.data || response
      if (created) {
        createdColumns.push(created)
      }
    }

    // 2. Find "To Do" column and start inline task creation
    const todoColumn = createdColumns.find(c => c.label === 'To Do') || createdColumns[0]
    
    if (todoColumn) {
      // Need to wait for DOM update to ensure column is rendered
      await nextTick()
      // Locate the column in the props.columns or refresh logic might be needed
      // Since props.columns might not be updated immediately if it depends on parent, 
      // we might need to rely on the fact that we just created it.
      // However, startAddTaskInline needs the column ID.
      startAddTaskInline(todoColumn.id)
    }

  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isCreatingColumn.value = false
  }
}

async function applyTemplate(templateName) {
  isCreatingColumn.value = true
  try {
    let columnsToCreate = []
    
    switch (templateName) {
      case 'Studio booking':
        columnsToCreate = ['Inquiry', 'Confirmed', 'In Session', 'Completed', 'Cancelled']
        break
      case 'Podcast':
        columnsToCreate = ['Idea', 'Scripting', 'Recording', 'Editing', 'Published']
        break
      case 'Board for tennant':
        columnsToCreate = ['New Request', 'Review', 'Approved', 'In Progress', 'Resolved']
        break
      case 'Board for technician':
        columnsToCreate = ['Assigned', 'On Site', 'Pending Parts', 'Fixed', 'Reported']
        break
      default:
        columnsToCreate = ['To Do', 'In Progress', 'Done']
    }

    for (const name of columnsToCreate) {
      await kanbanColumnStore.createColumn({ name })
    }
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isCreatingColumn.value = false
  }
}

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

const hasTaskColumns = computed(() => props.columns.length > 0)
const hasApiColumns = computed(() => kanbanColumnStore.columnCount > 0)
const isInitialLoading = computed(() => props.isLoading && !hasApiColumns.value && !hasTaskColumns.value)

const visibleColumns = computed(() => {
  if (!hideEmptyColumns.value) return props.columns
  return props.columns.filter((column) => (getColumnTasks(column.id) || []).length > 0)
})

const displayColumns = computed(() => {
  const base = [...visibleColumns.value]
  if (!showAddColumnInput.value) return base
  const insertIndex = pendingInsertIndex.value ?? base.length
  const safeIndex = Math.min(Math.max(insertIndex, 0), base.length)
  base.splice(safeIndex, 0, { id: 'add-column-input', isAddInput: true })
  return base
})

const isDragEnabled = computed(() => !isInitialLoading.value && props.columns.length > 0)

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
}

function openTaskPanel(task) {
  emit('open-task', task)
}

async function createColumn() {
  const name = newColumnName.value.trim()
  if (!name) return

  isCreatingColumn.value = true
  try {
    const response = await kanbanColumnStore.createColumn({ name })
    const created = response?.column || response?.data || response
    if (pendingInsertIndex.value !== null && created?.id) {
      const orderedIds = props.columns
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
  
  setTimeout(() => {
    const el = newTaskInputRefs.value[columnId]
    if (el) {
      if (typeof el.focus === 'function') {
        el.focus()
      } else if (el.$el && typeof el.$el.focus === 'function') {
        el.$el.focus()
      }
      const internalInput = el.$el ? el.$el.querySelector('input') : (el.querySelector ? el.querySelector('input') : null)
      if (internalInput) {
        internalInput.focus()
      }
    }
  }, 300)
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
    await taskStore.createNewTask({
      title,
      kanbanColumnId: columnId
    })
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

async function deleteColumn(column) {
  emit('delete-column', column)
}

function getColumnMenuItems(column, index) {
  const baseIndex = props.columns.findIndex((item) => item.id === column.id)
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
      icon: Trash,
      action: () => emit('delete-column', column)
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

async function handleUpdateAssignee(taskId, user) {
  try {
    const userId = user ? user.id : null
    await taskStore.changeTaskAssignee(taskId, userId)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

async function handleUpdateDueDate(taskId, date) {
  try {
    const formattedDate = date ? new Date(date).toISOString().split('T')[0] : null
    await taskStore.updateTask(taskId, { dueDate: formattedDate })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function syncColumnTasks() {
  props.columns.forEach(({ id }) => {
    ensureColumnTasks(id)
  })
  const next = {}
  props.columns.forEach(({ id }) => {
    next[id] = [...(props.tasksByColumn[id] || [])]
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
    await taskStore.reorderKanbanTasks(task.id, targetColumnId, taskIds)
  } catch (error) {
    uiStore.showApiError(error)
    syncColumnTasks()
  }
}

function handleDragEnd() {
  isDragging.value = false
  onDragEnd()
}

// Initialize column tasks
props.columns.forEach(({ id }) => {
  ensureColumnTasks(id)
})
syncColumnTasks()

watch([() => props.tasksByColumn, () => props.columns], () => {
  if (isDragging.value) return
  syncColumnTasks()
}, { immediate: true, deep: true })

watch(() => props.columns, (next) => {
  next.forEach(({ id }) => {
    ensureColumnTasks(id)
  })
}, { immediate: true })


// Date Picker Logic
const activeDatePicker = ref({
  taskId: null,
  date: null,
  position: { top: 0, left: 0 }
})

function openDatePicker(event, task) {
  // Prevent sidebar opening
  event.stopPropagation()
  
  // If clicking same trigger, toggle close
  if (activeDatePicker.value.taskId === task.id) {
    closeDatePicker()
    return
  }

  // Calculate position
  const rect = event.currentTarget.getBoundingClientRect()
  activeDatePicker.value = {
    taskId: task.id,
    date: task.dueDate,
    position: {
      top: rect.bottom + 8,
      left: rect.left
    }
  }
}

function closeDatePicker() {
  activeDatePicker.value = {
    taskId: null,
    date: null,
    position: { top: 0, left: 0 }
  }
}

function handleDateSelect(val) {
  if (activeDatePicker.value.taskId) {
    handleUpdateDueDate(activeDatePicker.value.taskId, val)
  }
  closeDatePicker()
}

// Close on outside click
function handleClickOutside(event) {
  if (!activeDatePicker.value.taskId) return
  const popup = document.getElementById('kanban-datepicker-popup')
  if (popup && popup.contains(event.target)) return
  
  // Check if click is on a trigger (handled by openDatePicker)
  if (event.target.closest('.date-trigger')) return
  
  closeDatePicker()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="kanban-board-content flex-1 overflow-x-auto overflow-y-hidden px-6 pt-6 pb-0">
    <div class="h-full min-w-full inline-flex gap-4">
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
        class="flex h-full w-full flex-col items-center justify-center"
      >
        <div class="text-center max-w-md">
          <h3 class="text-lg font-semibold text-gray-900 dark-edit:text-white mb-2">
            Empty Board
          </h3>
          <p class="text-sm text-gray-500 dark-edit:text-gray-400 mb-8">
            Tasks doesn't have any tasks yet. Get started by creating a new one!
          </p>

          <div class="flex items-center justify-center gap-3">
            <DropdownMenu :items="templateOptions" position="bottom" width="14rem">
              <template #trigger>
                <button
                  type="button"
                  class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <span>Start with template</span>
                  <ChevronDown class="w-4 h-4" />
                </button>
              </template>
            </DropdownMenu>

            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              @click="handleEmptyStateCreateTask"
            >
              <Plus class="w-4 h-4" />
              <span>Create task</span>
            </button>
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
          :class="{ 'no-transition': column.isAddInput }"
        >
          <div
            v-if="column.isAddInput"
            class="h-[52px] flex items-center px-4 rounded-xl border border-dashed border-gray-300 bg-white/60 text-xs text-gray-500 shadow-sm dark-edit:border-gray-700 dark-edit:bg-gray-900/70"
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
            <div class="kanban-column-body flex-1 flex flex-col overflow-y-auto px-2 py-2">
              <div
                v-if="creatingTaskColumnId === column.id"
                class="kanban-card--composer mb-3 rounded-lg border border-transparent bg-white p-0 py-2 shadow-sm ring-1 ring-black/5 dark-edit:bg-gray-800"
              >
                <InputText
                  :ref="(el) => setNewTaskInputRef(column.id, el)"
                  v-model="newTaskTitle"
                  class="w-full !border-0 !shadow-none !ring-0 focus:!ring-0 p-0 text-xs font-medium placeholder:font-normal bg-transparent"
                  :placeholder="t('tasks.placeholders.title')"
                  :disabled="isCreatingTask"
                  @keydown.enter.prevent="saveNewTaskInline(column.id)"
                  @blur="saveNewTaskInline(column.id)"
                  autoFocus
                />
              </div>

              <Draggable
                v-model="columnTasks[column.id]"
                group="kanban-board"
                tag="div"
                :item-key="'id'"
                :disabled="!isDragEnabled"
                class="kanban-column-content flex-1 space-y-2.5 pb-4"
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
                    'kanban-card cursor-pointer rounded-lg bg-white ring-1 ring-black/5 transition-shadow dark-edit:bg-gray-800 dark-edit:ring-white/10',
                    { 'kanban-card--dragging': draggedTask?.id === task.id }
                  ]"
                >
                  <h4 class="font-medium text-sm text-gray-900 dark-edit:text-white truncate" :title="task.title">
                    {{ task.title }}
                  </h4>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="date-trigger flex items-center gap-1 text-[10px] cursor-pointer hover:bg-black/5 dark-edit:hover:bg-white/5 rounded transition-colors"
                        :class="[
                          task.dueDate ? (isOverdue(task) ? 'text-red-600' : 'text-gray-500 dark-edit:text-gray-400') : 'text-gray-400',
                          { 'bg-black/10 dark-edit:bg-white/10': activeDatePicker.taskId === task.id }
                        ]"
                        @click="openDatePicker($event, task)"
                      >
                        <i class="pi pi-calendar text-[10px]"></i>
                        {{ task.dueDate ? formatDate(task.dueDate) : 'Add date' }}
                      </span>
                      <span
                        v-if="task.subtaskCount > 0"
                        class="flex items-center gap-1 text-[10px] text-gray-500 dark-edit:text-gray-400"
                      >
                        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
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
                    
                    <div @click.stop>
                      <UserSearchDropdown
                        :model-value="task.assignee"
                        @select="(user) => handleUpdateAssignee(task.id, user)"
                      >
                        <template #trigger>
                          <AppTooltip :content="task.assignee?.name || 'Assign user'" placement="top">
                            <Avatar
                              v-if="task.assignee"
                              :image="task.assignee.avatar"
                              :label="!task.assignee.avatar ? task.assignee.name?.charAt(0) : undefined"
                              shape="circle"
                              class="text-[10px] bg-primary-100 text-primary-700 cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all flex items-center justify-center p-0"
                              :style="[{ width: '26px', height: '26px', fontSize: '13px' }, !task.assignee.avatar ? {} : { backgroundColor: 'transparent' }]"
                            />
                            <div 
                              v-else 
                              class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 cursor-pointer transition-colors"
                            >
                              <i class="pi pi-user" style="font-size: 10px;"></i>
                            </div>
                          </AppTooltip>
                        </template>
                      </UserSearchDropdown>
                    </div>
                  </div>
                </div>

                <!-- Empty state inside draggable for proper drop target -->
                <div
                  v-if="columnTasks[column.id]?.length === 0"
                  class="flex-1 flex items-center justify-center min-h-[80px] text-center"
                >
                  <p class="text-[12px] text-gray-400 dark-edit:text-gray-500">
                    {{ t('projects.kanban.columns.noTasks') }}
                  </p>
                </div>
              </Draggable>
            </div>
          </div>
          </template>
        </div>
      </TransitionGroup>

      <!-- Add Section Button -->
      <div v-if="!isInitialLoading && columns.length > 0 && !showAddColumnInput" class="kanban-new-column w-80 flex-shrink-0">
        <button
          type="button"
          class="flex h-[52px] w-full items-center justify-start gap-2 rounded-xl border border-dashed border-gray-300 bg-transparent px-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 dark-edit:border-gray-700 dark-edit:text-gray-400 dark-edit:hover:bg-white/5 dark-edit:hover:text-gray-200"
          @click="startAddColumn()"
        >
          <Plus class="h-4 w-4" />
          {{ t('projects.kanban.columns.add') }}
        </button>
      </div>
    </div>

    <!-- Shared DatePicker Popup -->
    <Teleport to="body">
      <div
        v-if="activeDatePicker.taskId"
        id="kanban-datepicker-popup"
        :style="{
          position: 'fixed',
          top: activeDatePicker.position.top + 'px',
          left: activeDatePicker.position.left + 'px',
          zIndex: 99999
        }"
      >
        <div class="rounded-lg bg-white shadow-xl dark-edit:bg-gray-800">
          <VDatePicker
            :model-value="activeDatePicker.date"
            mode="date"
            :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
            @update:model-value="handleDateSelect"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.kanban-board-content {
  flex: 1;
}

.kanban-card {
  will-change: transform;
  padding: 8px;
}

@media (prefers-reduced-motion: no-preference) {
  .kanban-card:hover {
    background-color: #F9FAFB;
  }
}

.kanban-card:hover {
  background-color: #F9FAFB;
}

.kanban-card:focus,
.kanban-card:focus-visible,
.kanban-card:active {
  background-color: white;
  outline: none;
}

.kanban-card[draggable="true"]:active {
  cursor: grabbing;
}

:root.dark .kanban-card:focus,
:root.dark .kanban-card:focus-visible,
:root.dark .kanban-card:active {
  background-color: rgb(31 41 55);
}

.kanban-card--dragging {
  opacity: 0.6;
  box-shadow: none;
  transform: scale(0.98);
}

.kanban-card--ghost {
  opacity: 0.4;
  background: transparent;
  border: 1px dashed rgba(156, 163, 175, 0.5);
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
  min-height: 0;
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

/* Disable transition for add input */
.column-list-enter-active.no-transition,
.column-list-leave-active.no-transition,
.column-list-move.no-transition {
  transition: none !important;
  transform: none !important; /* prevent transform */
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

