<script setup>
/**
 * ProjectCalendarView - Calendar view for project tasks
 * Supports Month, Week, and Day view modes with filter bar
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore } from '@/stores'
import { TaskStatus } from '@/models'
import { ChevronLeft, ChevronRight, ChevronDown, Plus } from 'lucide-vue-next'
import { getKanbanColumns } from '@/api/kanbanColumn.api'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Pagination from '@/components/ui/Pagination.vue'
import ProjectTasksGridFilterBar from '@/components/task/projectTasksGrid/ProjectTasksGridFilterBar.vue'
import { useProjectTaskFilters } from '@/components/task/projectTasksGrid/useProjectTaskFilters'
import { TASK_COLUMN_DEFINITIONS } from '@/components/task/projectTasksGrid/taskColumnDefinitions.js'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t, locale } = useI18n()

// ================================
// State
// ================================
const currentDate = ref(new Date())
const viewMode = ref('month')

// Status options for filter bar
const statusOptions = ref([])

// Sort state
const sortModel = ref([])

// ================================
// Filter integration
// ================================
const calendarColumnDefs = computed(() => {
  const filterIds = ['title', 'status', 'assignee', 'dueDate', 'tags', 'priority']
  return TASK_COLUMN_DEFINITIONS
    .filter(col => filterIds.includes(col.id))
    .map(col => ({
      id: col.id,
      label: t(col.labelKey, col.fallback),
      icon: col.icon,
      type: col.type,
      propertyOptions: col.type === 'select' && col.id === 'status'
        ? statusOptions.value
        : []
    }))
})

const {
  activeFilters,
  filterableColumns,
  addFilter,
  removeFilter,
  updateFilter,
  resetFilters,
  applyFilters,
  getOperatorsForColumn
} = useProjectTaskFilters(t, { columnDefinitions: calendarColumnDefs })

// ================================
// Data loading
// ================================
async function loadData() {
  if (projectStore.currentProjectId) {
    await taskStore.fetchTasks()
    await loadStatusOptions()
  }
}

async function loadStatusOptions() {
  const projectItemId = projectStore.activeProjectItemId
  if (!projectItemId) return

  try {
    const response = await getKanbanColumns({
      projectItemId,
      limit: 100,
      sortBy: 'index:ASC'
    })
    const columns = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response) ? response : []

    statusOptions.value = columns.map(col => ({
      id: col.id,
      label: col.name || col.title || '',
      value: col.id,
      status: col.status || 'todo',
      progress: col.progress ?? 0,
      color: col.color || '#9ca3af',
      icon: col.icon || null
    }))
  } catch {
    statusOptions.value = []
  }
}

watch(
  () => projectStore.activeProjectItemId,
  (newId, oldId) => {
    if (newId && String(newId) !== String(oldId)) {
      loadData()
    }
  },
  { immediate: true }
)

// ================================
// Filtered & sorted tasks
// ================================
const filteredTasks = computed(() => {
  let tasks = [...taskStore.tasks]

  // Apply filters
  tasks = applyFilters(tasks)

  // Apply sort
  if (sortModel.value.length > 0) {
    const { colId, sort } = sortModel.value[0]
    const dir = sort === 'desc' ? -1 : 1
    tasks.sort((a, b) => {
      const aVal = a[colId] ?? ''
      const bVal = b[colId] ?? ''
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })
  }

  return tasks
})

const tasksByDate = computed(() => {
  const map = {}
  filteredTasks.value.forEach(task => {
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toDateString()
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(task)
    }
  })
  return map
})

// ================================
// View mode
// ================================
const viewModeItems = computed(() => [
  { key: 'month', label: t('calendar.month', 'Month'), action: () => { viewMode.value = 'month' } },
  { key: 'week', label: t('calendar.week', 'Week'), action: () => { viewMode.value = 'week' } },
  { key: 'day', label: t('calendar.day', 'Day'), action: () => { viewMode.value = 'day' } }
])

const viewModeLabel = computed(() => {
  const labels = { month: t('calendar.month', 'Month'), week: t('calendar.week', 'Week'), day: t('calendar.day', 'Day') }
  return labels[viewMode.value] || 'Month'
})

// ================================
// Navigation
// ================================
function navigatePrev() {
  const d = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() - 1)
  } else if (viewMode.value === 'week') {
    d.setDate(d.getDate() - 7)
  } else {
    d.setDate(d.getDate() - 1)
  }
  currentDate.value = d
}

function navigateNext() {
  const d = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + 1)
  } else if (viewMode.value === 'week') {
    d.setDate(d.getDate() + 7)
  } else {
    d.setDate(d.getDate() + 1)
  }
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
}

// ================================
// Title
// ================================
const headerTitle = computed(() => {
  const d = currentDate.value
  const loc = locale.value || 'en'

  if (viewMode.value === 'month') {
    const month = d.toLocaleDateString(loc, { month: 'long' })
    const year = d.getFullYear()
    return { month, year: String(year) }
  }

  if (viewMode.value === 'week') {
    const weekStart = getWeekStart(d)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startStr = weekStart.toLocaleDateString(loc, { month: 'short', day: 'numeric' })
    const endStr = weekEnd.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' })
    return { month: `${startStr} – ${endStr}`, year: '' }
  }

  // day
  const dayStr = d.toLocaleDateString(loc, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return { month: dayStr, year: '' }
})

// ================================
// Calendar computations
// ================================
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  // Shift so Monday = 0
  const diff = (day === 0 ? 6 : day - 1)
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const calendarDays = computed(() => {
  if (viewMode.value === 'day') {
    const d = new Date(currentDate.value)
    d.setHours(0, 0, 0, 0)
    return [{ date: d, isCurrentMonth: true }]
  }

  if (viewMode.value === 'week') {
    const start = getWeekStart(currentDate.value)
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push({ date: d, isCurrentMonth: true })
    }
    return days
  }

  // Month view
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days = []

  // Monday-based start padding
  let startDay = firstDay.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1 // Monday = 0
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({ date, isCurrentMonth: false })
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    days.push({ date, isCurrentMonth: true })
  }

  // End padding to 42
  const endPadding = 42 - days.length
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i)
    days.push({ date, isCurrentMonth: false })
  }

  return days
})

// ================================
// Helpers
// ================================
function isToday(date) {
  return date.toDateString() === new Date().toDateString()
}

function getTasksForDate(date) {
  return tasksByDate.value[date.toDateString()] || []
}

function getTaskStyle(task) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (task.status === TaskStatus.DONE || task.status === 'done') {
    return 'cal-task--done'
  }

  if (task.dueDate) {
    const due = new Date(task.dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'cal-task--overdue'
    if (diffDays <= 3) return 'cal-task--near-due'
  }

  return 'cal-task--normal'
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

function handleAddTask(date) {
  const dueDate = date ? new Date(date).toISOString().split('T')[0] : null
  uiStore.openModal('createTask', { defaultDueDate: dueDate })
}

// ================================
// Filter bar handlers
// ================================
function handleAddFilter(colId) {
  addFilter(colId)
}

function handleRemoveFilter(filterId) {
  removeFilter(filterId)
}

function handleUpdateFilter(filterId, updates) {
  updateFilter(filterId, updates)
}

function handleResetFilters() {
  resetFilters()
}

function handleSortUpdate({ colId, sort }) {
  if (!sort) {
    sortModel.value = []
  } else {
    sortModel.value = [{ colId, sort }]
  }
}
</script>

<template>
  <div class="calendar-view">
    <!-- Header -->
    <div class="calendar-header">
      <div class="calendar-header__left">
        <span class="calendar-title-month">{{ headerTitle.month }}</span>
        <span v-if="headerTitle.year" class="calendar-title-year">{{ headerTitle.year }}</span>

        <div class="calendar-header__nav">
          <button class="cal-nav-btn" @click="navigatePrev">
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button class="cal-nav-today" @click="goToToday">
            {{ t('calendar.today', 'Today') }}
          </button>
          <button class="cal-nav-btn" @click="navigateNext">
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="calendar-header__right">
        <DropdownMenu :items="viewModeItems" position="right" width="8rem">
          <template #trigger>
            <button class="cal-mode-btn">
              {{ viewModeLabel }}
              <ChevronDown class="w-3.5 h-3.5 text-gray-400" />
            </button>
          </template>
        </DropdownMenu>
      </div>
    </div>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="calendar-grid-wrapper">
      <div class="calendar-grid">
        <!-- Weekday headers -->
        <div class="calendar-weekdays">
          <div v-for="day in weekdayLabels" :key="day" class="calendar-weekday">
            {{ day }}
          </div>
        </div>

        <!-- Day cells -->
        <div class="calendar-days">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              'calendar-day--other': !day.isCurrentMonth,
              'calendar-day--today': isToday(day.date)
            }"
          >
            <div class="calendar-day__header">
              <span
                class="calendar-day__number"
                :class="{ 'calendar-day__number--today': isToday(day.date) }"
              >
                {{ day.date.getDate() }}
              </span>
            </div>

            <div class="calendar-day__tasks">
              <div
                v-for="task in getTasksForDate(day.date).slice(0, 3)"
                :key="task.id"
                class="cal-task"
                :class="getTaskStyle(task)"
                @click.stop="openTaskPanel(task)"
              >
                <span class="cal-task__title">{{ task.title }}</span>
              </div>
              <div
                v-if="getTasksForDate(day.date).length > 3"
                class="cal-task-more"
              >
                {{ t('calendar.moreCount', { count: getTasksForDate(day.date).length - 3 }) }}
              </div>
            </div>

            <button
              class="calendar-day__add"
              @click.stop="handleAddTask(day.date)"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <div v-else-if="viewMode === 'week'" class="calendar-grid-wrapper">
      <div class="calendar-grid">
        <div class="calendar-weekdays">
          <div v-for="day in weekdayLabels" :key="day" class="calendar-weekday">
            {{ day }}
          </div>
        </div>

        <div class="calendar-week-row">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-week-cell"
            :class="{ 'calendar-day--today': isToday(day.date) }"
          >
            <div class="calendar-day__header">
              <span
                class="calendar-day__number"
                :class="{ 'calendar-day__number--today': isToday(day.date) }"
              >
                {{ day.date.getDate() }}
              </span>
            </div>

            <div class="calendar-week-cell__tasks">
              <div
                v-for="task in getTasksForDate(day.date)"
                :key="task.id"
                class="cal-task"
                :class="getTaskStyle(task)"
                @click.stop="openTaskPanel(task)"
              >
                <span class="cal-task__title">{{ task.title }}</span>
              </div>
            </div>

            <button
              class="calendar-day__add"
              @click.stop="handleAddTask(day.date)"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Day View -->
    <div v-else class="calendar-day-view">
      <div class="calendar-day-view__header">
        <span
          class="calendar-day__number"
          :class="{ 'calendar-day__number--today': isToday(calendarDays[0]?.date) }"
        >
          {{ calendarDays[0]?.date.getDate() }}
        </span>
        <span class="calendar-day-view__weekday">
          {{ calendarDays[0]?.date.toLocaleDateString(locale || 'en', { weekday: 'long' }) }}
        </span>
      </div>

      <div class="calendar-day-view__tasks">
        <div
          v-for="task in getTasksForDate(calendarDays[0]?.date)"
          :key="task.id"
          class="cal-task-detail"
          :class="getTaskStyle(task)"
          @click.stop="openTaskPanel(task)"
        >
          <span class="cal-task__title">{{ task.title }}</span>
        </div>
        <div v-if="!getTasksForDate(calendarDays[0]?.date).length" class="calendar-day-view__empty">
          {{ t('tasks.emptyState.description', 'No tasks for this day') }}
        </div>
      </div>

      <button
        class="calendar-day-view__add"
        @click.stop="handleAddTask(calendarDays[0]?.date)"
      >
        <Plus class="w-4 h-4" />
        <span>{{ t('calendar.addTask', 'Add task') }}</span>
      </button>
    </div>

    <!-- Bottom Filter Bar -->
    <Pagination :currentPage="1" :totalPages="1" :pageSize="9999" :fixed="true">
      <template #filters>
        <ProjectTasksGridFilterBar
          :activeFilters="activeFilters"
          :filterableColumns="filterableColumns"
          :statusOptions="statusOptions"
          :getOperatorsForColumn="getOperatorsForColumn"
          :sortModel="sortModel"
          @add-filter="handleAddFilter"
          @remove-filter="handleRemoveFilter"
          @update-filter="handleUpdateFilter"
          @reset-filters="handleResetFilters"
          @update-sort="handleSortUpdate"
        />
      </template>
    </Pagination>
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding-bottom: 48px; /* space for fixed footer */
}

/* ---- Header ---- */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  flex-shrink: 0;
}

.calendar-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-title-month {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.calendar-title-year {
  font-size: 18px;
  font-weight: 400;
  color: #6b7280;
}

.calendar-header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.cal-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.12s;
}

.cal-nav-btn:hover {
  background: #f3f4f6;
}

.cal-nav-today {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.12s;
}

.cal-nav-today:hover {
  background: #f3f4f6;
}

.calendar-header__right {
  display: flex;
  align-items: center;
}

.cal-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.12s;
}

.cal-mode-btn:hover {
  background: #f3f4f6;
}

/* ---- Grid ---- */
.calendar-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 12px;
}

.calendar-grid {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e5e7eb;
}

.calendar-weekday {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  position: relative;
  min-height: 110px;
  border-bottom: 1px solid #f3f4f6;
  border-right: 1px solid #f3f4f6;
  padding: 4px 6px;
  transition: background-color 0.12s;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day:nth-last-child(-n+7) {
  border-bottom: none;
}

.calendar-day--other {
  background: #fafafa;
}

.calendar-day--other .calendar-day__number {
  color: #d1d5db;
}

.calendar-day__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 4px;
  padding: 2px;
}

.calendar-day__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  border-radius: 50%;
}

.calendar-day__number--today {
  background: #3b82f6;
  color: #fff;
  font-weight: 600;
}

.calendar-day__tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ---- Task blocks ---- */
.cal-task {
  display: flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.3;
  transition: opacity 0.12s;
  border-left: 2.5px solid transparent;
}

.cal-task:hover {
  opacity: 0.85;
}

.cal-task__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-task--normal {
  background: #f3f4f6;
  color: #374151;
  border-left-color: #9ca3af;
}

.cal-task--done {
  background: #dcfce7;
  color: #166534;
  border-left-color: #22c55e;
}

.cal-task--overdue {
  background: #fef2f2;
  color: #b91c1c;
  border-left-color: #ef4444;
}

.cal-task--near-due {
  background: #fefce8;
  color: #a16207;
  border-left-color: #eab308;
}

.cal-task-more {
  font-size: 11px;
  color: #6b7280;
  padding: 2px 8px;
  cursor: default;
}

/* ---- Add button ---- */
.calendar-day__add {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.12s;
}

.calendar-day:hover .calendar-day__add {
  opacity: 1;
}

.calendar-day__add:hover {
  background: #e5e7eb;
  color: #374151;
}

/* ---- Week View ---- */
.calendar-week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-week-cell {
  position: relative;
  min-height: 300px;
  border-right: 1px solid #f3f4f6;
  padding: 4px 6px;
}

.calendar-week-cell:last-child {
  border-right: none;
}

.calendar-week-cell__tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}

/* ---- Day View ---- */
.calendar-day-view {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 12px;
}

.calendar-day-view__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
}

.calendar-day-view__weekday {
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
}

.calendar-day-view__tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cal-task-detail {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  border-left: 3px solid transparent;
  transition: opacity 0.12s;
}

.cal-task-detail:hover {
  opacity: 0.85;
}

.calendar-day-view__empty {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.calendar-day-view__add {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.calendar-day-view__add:hover {
  background: #f3f4f6;
  color: #374151;
}
</style>
