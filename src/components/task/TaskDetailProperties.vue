<script setup>
/**
 * TaskDetailProperties - Properties section for the task detail sidebar.
 *
 * Renders the built-in properties (status, assignee, board, tags, due date,
 * time tracking) as well as any custom/dynamic properties defined on the
 * current project.
 *
 * Data resolution and update patterns mirror the AG Grid cell renderers
 * (StatusCell, AssigneeCell, PropertySelectCell, etc.) so that the sidebar
 * and the grid stay consistent.
 */
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useTaskStore,
  useUIStore,
  useProjectStore,
  useProjectPropertyStore,
  useUserStore
} from '@/stores'
import { TaskStatus } from '@/models'
import Avatar from 'primevue/avatar'
import Checkbox from 'primevue/checkbox'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import {
  ChevronDown,
  User as UserIcon,
  Calendar,
  Clock,
  Hash
} from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import MultiSelectPopper from '@/components/ui/MultiSelectPopper.vue'
import { normalizeUserForDisplay } from '@/utils/user'

const props = defineProps({
  task: { type: Object, required: true }
})

const { t } = useI18n()
const taskStore = useTaskStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()
const propertyStore = useProjectPropertyStore()
const userStore = useUserStore()

// ================================
// Shared helpers (mirror propertyCellUtils patterns)
// ================================
function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value === '')
}

function getMapValue(map, candidates = []) {
  if (!map || typeof map !== 'object') return undefined
  for (const candidate of candidates) {
    const rawKey = String(candidate || '').trim()
    if (!rawKey) continue
    if (rawKey in map) return map[rawKey]
    const normalized = normalizeLookupKey(rawKey)
    if (normalized && normalized in map) return map[normalized]
  }
  return undefined
}

function normalizeOptionValue(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'object') {
    return String(value.value ?? value.label ?? value.name ?? value.id ?? '').trim()
  }
  return String(value).trim()
}

// ================================
// Project-scoped property data
// ================================
const currentProjectId = computed(() => props.task?.projectId || projectStore.currentProjectId)

watch(currentProjectId, (pid) => {
  if (pid) propertyStore.fetchProperties(pid)
}, { immediate: true })

// All property definitions for the current project (system + custom)
const allPropertyDefinitions = computed(() => {
  if (!currentProjectId.value) return []
  return propertyStore.propertiesForProject(currentProjectId.value) || []
})

// Find a system property by key
function findSystemProperty(key) {
  return allPropertyDefinitions.value.find(
    (p) => p?.isSystem && normalizeLookupKey(p.key) === normalizeLookupKey(key)
  ) || null
}

// Custom (non-system) properties
const customProperties = computed(() => {
  return allPropertyDefinitions.value
    .filter((p) => !p.isSystem && p.isVisible !== false)
})

// ================================
// Status icon helpers (mirrors StatusCell / ProjectTasksGrid)
// ================================
const ICON_OPTIONS = [
  { id: '0', status: 'todo', progress: 0, color: '#9ca3af' },
  { id: '25', status: 'in_progress', progress: 25, color: '#14b8a6' },
  { id: '50', status: 'in_progress', progress: 50, color: '#a855f7' },
  { id: '75', status: 'in_progress', progress: 75, color: '#f97316' },
  { id: '100', status: 'done', progress: 100, color: '#22c55e' }
]

function normalizeIconValue(icon) {
  const raw = String(icon ?? '0')
  const legacyMap = { '1': '25', '2': '50', '3': '75', '4': '100', '5': '100' }
  const mapped = legacyMap[raw] || raw
  return ICON_OPTIONS.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveIconProps(icon, fallbackStatus) {
  const normalized = normalizeIconValue(icon)
  const matched = ICON_OPTIONS.find((item) => item.id === normalized)
  if (matched) return { ...matched, icon: normalized }
  if (fallbackStatus === 'done' || fallbackStatus === 'completed') return { ...ICON_OPTIONS[4], icon: '100' }
  if (fallbackStatus === 'in_progress') return { ...ICON_OPTIONS[2], icon: '50' }
  return { ...ICON_OPTIONS[0], icon: '0' }
}

function resolveIconIdFromProgress(progress) {
  const value = Number(progress ?? 0)
  if (value >= 100) return '100'
  if (value >= 75) return '75'
  if (value >= 50) return '50'
  if (value >= 25) return '25'
  return '0'
}

// ================================
// Status options (mirrors StatusCell.statusOptions)
// ================================
const statusOptions = computed(() => {
  const statusProperty = findSystemProperty('status')
  const propertyOptions = Array.isArray(statusProperty?.settings?.options) ? statusProperty.settings.options : []

  if (propertyOptions.length) {
    return propertyOptions.map((option, index) => {
      const rawValue = option?.value ?? option?.label ?? option?.name ?? option?.id ?? ''
      const optionValue = String(rawValue || '').trim()
      const iconIdFromProgress = resolveIconIdFromProgress(option?.progress)
      const normalizedIcon = normalizeIconValue(option?.icon ?? iconIdFromProgress)
      const canonical = resolveIconProps(normalizedIcon, optionValue.toLowerCase())
      const progress = Number.isFinite(Number(option?.progress)) ? Number(option.progress) : canonical.progress
      return {
        id: String(option?.id ?? (optionValue || `status-${index + 1}`)),
        value: optionValue,
        label: optionValue || t('taskDetail.status'),
        icon: normalizedIcon,
        status: String(option?.status || canonical.status || 'todo'),
        progress,
        color: option?.color || canonical.color
      }
    })
  }

  // Fallback: build from current task's kanban data or TaskStatus enum
  const task = props.task
  if (task?.kanbanColumnId || task?.kanbanColumn) {
    const fallback = resolveIconProps(task.kanbanColumn?.icon, task.status)
    return [{
      id: task.kanbanColumnId || task.status || 'status',
      value: task.kanbanColumn?.name || task.status || '',
      label: task.kanbanColumn?.name || task.status || t('taskDetail.status'),
      ...fallback
    }]
  }

  // Last resort: TaskStatus enum
  return Object.values(TaskStatus).map((label) => {
    const fallback = resolveIconProps(null, label)
    return { id: label, value: label, label, ...fallback }
  })
})

// Resolve current status value (mirrors StatusCell.resolveCurrentStatusValue)
function resolveCurrentStatusValue() {
  const task = props.task
  if (!task) return ''
  const statusProperty = findSystemProperty('status')
  const candidates = [statusProperty?.id, statusProperty?.key, statusProperty?.settings?.sourceField, 'status'].filter(Boolean)

  const fromPropertyMap = getMapValue(task.propertyValueMap, candidates)
  const normalizedPM = normalizeOptionValue(fromPropertyMap)
  if (normalizedPM) return normalizedPM

  const fromCustomMap = getMapValue(task.customFieldMap, candidates)
  const normalizedCM = normalizeOptionValue(fromCustomMap)
  if (normalizedCM) return normalizedCM

  // Search propertyValues / customValues arrays
  const entrySources = [task.propertyValues, task.customValues, task._raw?.propertyValues, task._raw?.customValues]
  for (const source of entrySources) {
    if (!Array.isArray(source)) continue
    const entry = source.find((item) => {
      const property = item?.property || {}
      const id = String(item?.propertyId || property?.id || '').trim()
      const key = normalizeLookupKey(item?.propertyKey || item?.key || property?.key || '')
      return candidates.some((c) => String(c) === id || normalizeLookupKey(c) === key)
    })
    const normalized = normalizeOptionValue(entry?.value)
    if (normalized) return normalized
  }

  return normalizeOptionValue(task.status || task._raw?.status || '')
}

// Match current status to an option
const currentStatusOption = computed(() => {
  const options = statusOptions.value
  const currentValue = resolveCurrentStatusValue()

  // Also try matching by kanbanColumnId
  const kanbanId = String(props.task?.kanbanColumnId || '')

  const byValue = options.find((o) => String(o.value ?? o.label ?? '') === currentValue)
  if (byValue) return byValue
  const byId = options.find((o) => String(o.id) === currentValue || String(o.id) === kanbanId)
  if (byId) return byId
  const byStatus = options.find((o) => o.status === currentValue)
  return byStatus || options[0] || null
})

// ================================
// Property value resolution (mirrors propertyCellUtils.resolvePropertyValue)
// ================================
function getPropertyValue(property) {
  const task = props.task
  if (!task) return null

  const propertyId = String(property?.id || '').trim()
  const key = String(property?.key || '').trim()
  const sourceKey = String(property?.settings?.sourceField || '').trim()
  const candidates = [propertyId, key, sourceKey].filter(Boolean)

  // 1. propertyValueMap
  const fromPVMap = getMapValue(task.propertyValueMap, candidates)
  if (hasValue(fromPVMap)) return fromPVMap

  // 2. customFieldMap
  const fromCFMap = getMapValue(task.customFieldMap, candidates)
  if (hasValue(fromCFMap)) return fromCFMap

  // 3. propertyValues / customValues arrays
  const entrySources = [task.propertyValues, task.customValues, task._raw?.propertyValues, task._raw?.customValues]
  for (const source of entrySources) {
    if (!Array.isArray(source)) continue
    const entry = source.find((item) => {
      const prop = item?.property || {}
      const id = String(item?.propertyId || prop?.id || '').trim()
      const entryKey = normalizeLookupKey(item?.propertyKey || item?.key || prop?.key || '')
      return candidates.some((c) => String(c) === id || normalizeLookupKey(c) === entryKey)
    })
    if (entry && hasValue(entry.value)) return entry.value
  }

  // 4. Direct field
  for (const candidate of candidates) {
    if (hasValue(task[candidate])) return task[candidate]
  }

  return null
}

function getPropertyOptions(property) {
  const opts = property?.settings?.options
  if (!Array.isArray(opts)) return []
  return opts.map((opt, i) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      const val = String(opt)
      return { id: val, label: val, value: val, color: '' }
    }
    if (!opt || typeof opt !== 'object') return null
    const value = opt.value ?? opt.label ?? opt.name ?? ''
    const label = String(opt.label ?? opt.value ?? opt.name ?? '').trim() || String(value)
    const id = String(opt.id ?? value ?? `opt-${i}`).trim() || `opt-${i}`
    return { id, label: label || id, value, color: opt.color || '' }
  }).filter(Boolean)
}

function getNumberFormatOptions(property) {
  if (!property || property.type !== 'number') return []
  const formatKey = property.settings?.format
  const formats = property.settings?.formats
  if (!formatKey || !formats || typeof formats !== 'object') return []
  const options = formats[formatKey]
  if (!Array.isArray(options) || !options.length) return []
  return options.map((opt, i) => ({
    id: String(opt ?? `opt-${i}`),
    label: String(opt),
    value: typeof opt === 'number' ? opt : String(opt)
  }))
}

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

// ================================
// customValues payload builder (mirrors ProjectTasksGrid.buildTaskCustomValuesPayload)
// ================================
function buildCustomValuesPayload(changedPropertyId, changedValue) {
  const payload = []
  const included = new Set()

  allPropertyDefinitions.value.forEach((prop) => {
    const propertyId = String(prop?.id || '').trim()
    if (!propertyId || included.has(propertyId)) return
    included.add(propertyId)

    const value = propertyId === changedPropertyId
      ? changedValue
      : getPropertyValue(prop)

    if (propertyId !== changedPropertyId && !hasValue(value)) return
    payload.push({ propertyId, value: value ?? null })
  })

  if (changedPropertyId && !payload.some((e) => String(e.propertyId) === String(changedPropertyId))) {
    payload.push({ propertyId: changedPropertyId, value: changedValue ?? null })
  }

  return payload
}

function resolveProjectItemId() {
  return (
    props.task?.projectItemId ||
    props.task?.projectItem?.id ||
    props.task?._raw?.projectItemId ||
    props.task?._raw?.projectItem?.id ||
    projectStore.activeProjectItemId ||
    null
  )
}

// ================================
// Tags — resolve from propertyValues, then fallback to task.tags
// ================================
function normalizeTagItem(item) {
  if (!item) return null
  if (typeof item === 'string') return { id: item, name: item, color: '' }
  const name = String(item.name ?? item.label ?? item.value ?? item.id ?? '').trim()
  if (!name) return null
  return { id: String(item.id ?? name), name, color: item.color || '' }
}

const tagOptions = computed(() => {
  const tagsProperty = findSystemProperty('tags')
  const options = Array.isArray(tagsProperty?.settings?.options) ? tagsProperty.settings.options : []
  return options.map((opt) => normalizeTagItem(opt)).filter(Boolean)
})

function resolveTagValues() {
  const tagsProperty = findSystemProperty('tags')
  if (tagsProperty) {
    const value = getPropertyValue(tagsProperty)
    if (Array.isArray(value) && value.length) {
      return value.map((item) => normalizeTagItem(item)).filter(Boolean)
    }
  }
  // Fallback: direct task.tags
  const tags = props.task?.tags
  if (Array.isArray(tags) && tags.length) {
    return tags.map((item) => normalizeTagItem(item)).filter(Boolean)
  }
  return []
}

const selectedTags = computed(() => resolveTagValues())

// Track available width for tag overflow calculation
const tagContainerRef = ref(null)
const tagAvailableWidth = ref(0)
let tagResizeObserver = null

function measureTagWidth() {
  if (tagContainerRef.value) {
    tagAvailableWidth.value = tagContainerRef.value.getBoundingClientRect().width
  }
}

onMounted(() => {
  measureTagWidth()
  if (typeof ResizeObserver !== 'undefined') {
    tagResizeObserver = new ResizeObserver(() => measureTagWidth())
    if (tagContainerRef.value) tagResizeObserver.observe(tagContainerRef.value)
  }
})

onBeforeUnmount(() => {
  if (tagResizeObserver) tagResizeObserver.disconnect()
})

watch(tagContainerRef, (el) => {
  if (el && tagResizeObserver) tagResizeObserver.observe(el)
  measureTagWidth()
})

function handleTagSelectionChange(nextTags) {
  const tagsProperty = findSystemProperty('tags')
  const propertyId = tagsProperty?.id || 'tags'
  const values = (Array.isArray(nextTags) ? nextTags : [])
    .map((tag) => {
      if (typeof tag === 'string') return tag
      return tag.name ?? tag.value ?? tag.label ?? tag.id ?? ''
    })
    .filter(Boolean)
  handleUpdatePropertyValue(propertyId, values)
}

// ================================
// Handlers — status
// ================================
async function handleUpdateStatus(option) {
  const task = props.task
  if (!task?.id) return
  const nextValue = String(option?.value ?? option?.label ?? option?.id ?? '').trim()
  if (!nextValue) return

  try {
    // Mirror StatusCell → grid.updatePropertyValue (property mode):
    // sends PATCH /tasks/{id} with { customValues: [{ propertyId, value }] }
    const statusProperty = findSystemProperty('status')
    const propertyId = String(statusProperty?.id || 'status').trim()
    const customValues = buildCustomValuesPayload(propertyId, nextValue)
    await taskStore.updateTaskPropertyValue(task.id, propertyId, nextValue, {
      projectItemId: resolveProjectItemId(),
      customValues,
      silent: true
    })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

// ================================
// Handlers — assignee (mirrors PropertyUserCell pattern)
// ================================
function isUnassignedLike(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return !normalized || normalized === 'unassigned' || normalized === 'none' || normalized === 'null' || normalized === 'undefined'
  }
  if (typeof value === 'object') {
    const id = value.id ?? value.userId ?? value.value ?? null
    const name = String(value.name ?? value.label ?? value.firstName ?? '').trim().toLowerCase()
    if (!name || name === 'unassigned' || name === 'none') {
      if ((id === null || id === undefined || id === '') && !(value.avatarUrl || value.avatar)) return true
    }
  }
  return false
}

function normalizeAssigneeValue(value) {
  if (isUnassignedLike(value)) return null

  // If it's an object with id, try to enrich from userStore
  if (typeof value === 'object' && value.id) {
    const matched = userStore.users.find((u) => String(u.id) === String(value.id))
    if (matched) return normalizeUserForDisplay(matched)
    return normalizeUserForDisplay(value)
  }

  // If it's a string (user ID), look up in userStore
  if (typeof value === 'string') {
    const matched = userStore.users.find((u) => String(u.id) === String(value))
    if (matched) return normalizeUserForDisplay(matched)
    return null
  }

  return normalizeUserForDisplay(value)
}

function resolveAssigneeDisplay() {
  // Use property definition to resolve value (same as PropertyUserCell uses resolvePropertyValue)
  const assigneeProperty = findSystemProperty('assignee')
  if (assigneeProperty) {
    const value = getPropertyValue(assigneeProperty)
    const resolved = normalizeAssigneeValue(value)
    if (resolved) return resolved
  }

  // Fallback: direct task fields
  const task = props.task
  if (!task) return null
  const fallback = normalizeAssigneeValue(task.assignee) || normalizeAssigneeValue(task.assignTo)
  return fallback
}

const assigneeDisplay = computed(() => resolveAssigneeDisplay())

async function handleUpdateAssignee(user) {
  const task = props.task
  if (!task?.id) return
  try {
    const userId = user ? user.id : null
    // Use same approach as AssigneeCell: updateTaskPropertyValue with user object
    const assigneeProperty = findSystemProperty('assignee')
    if (assigneeProperty?.id) {
      const customValues = buildCustomValuesPayload(assigneeProperty.id, userId)
      await taskStore.updateTask(
        task.id,
        {
          customValues,
          assignToId: userId,
          projectItemId: resolveProjectItemId()
        },
        { silent: true }
      )
    } else {
      await taskStore.changeTaskAssignee(task.id, userId)
    }
  } catch (error) {
    uiStore.showApiError(error)
  }
}

// ================================
// Handlers — board / project
// ================================
async function handleUpdateProject(projectId) {
  if (!props.task?.id) return
  try {
    await taskStore.updateTask(props.task.id, { projectId }, { silent: true })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

// ================================
// Handlers — due date
// ================================
async function handleUpdateDueDate(val) {
  if (!props.task?.id) return
  try {
    await taskStore.updateTask(props.task.id, { dueDate: val }, { silent: true })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

// ================================
// Handlers — custom properties (generic)
// ================================
async function handleUpdatePropertyValue(propertyId, value) {
  if (!props.task?.id) return
  try {
    const customValues = buildCustomValuesPayload(propertyId, value)
    await taskStore.updateTaskPropertyValue(props.task.id, propertyId, value, {
      projectItemId: resolveProjectItemId(),
      customValues,
      silent: true
    })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function handleCustomTextBlur(property, event) {
  const next = event.target.value
  const current = getPropertyValue(property)
  if (String(next || '') === String(current || '')) return
  handleUpdatePropertyValue(property.id, next)
}

function handleCustomNumberBlur(property, event) {
  const raw = event.target.value
  if (raw === '' || raw === null || raw === undefined) {
    handleUpdatePropertyValue(property.id, null)
    return
  }
  const num = Number(raw)
  if (Number.isNaN(num)) return
  const current = getPropertyValue(property)
  if (num === Number(current)) return
  handleUpdatePropertyValue(property.id, num)
}

function handleCustomSelectChange(property, value) {
  handleUpdatePropertyValue(property.id, value)
}

function handleCustomMultiselectChange(property, tags) {
  const values = (tags || []).map((tag) => {
    if (typeof tag === 'string') return tag
    return tag.value ?? tag.name ?? tag.label ?? tag.id ?? ''
  }).filter(Boolean)
  handleUpdatePropertyValue(property.id, values)
}

function handleCustomDateChange(property, value) {
  handleUpdatePropertyValue(property.id, value)
}

function handleCustomUserChange(property, user) {
  handleUpdatePropertyValue(property.id, user ? user.id : null)
}

function handleCustomCheckboxChange(property, checked) {
  handleUpdatePropertyValue(property.id, checked)
}

// ================================
// Display helpers for custom properties
// ================================

// Multiselect: convert property value to tag array for MultiSelectPopper
function toMultiselectTags(property) {
  const raw = getPropertyValue(property)
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean)
  const options = getPropertyOptions(property)
  return arr.map((val) => {
    const normalized = normalizeOptionValue(val)
    const opt = options.find((o) => String(o.value) === normalized || String(o.id) === normalized)
    return opt || { id: normalized, label: normalized, value: normalized, color: '' }
  })
}

// Select: current display label
function getSelectDisplayLabel(property) {
  const val = getPropertyValue(property)
  if (!hasValue(val)) return t('taskDetail.none')
  const normalized = normalizeOptionValue(val)
  const options = getPropertyOptions(property)
  const opt = options.find((o) => String(o.value) === normalized || String(o.id) === normalized)
  return opt?.label || normalized
}

// Select: current option (for color dot display)
function getSelectCurrentOption(property) {
  const val = getPropertyValue(property)
  if (!hasValue(val)) return null
  const normalized = normalizeOptionValue(val)
  const options = getPropertyOptions(property)
  return options.find((o) => String(o.value) === normalized || String(o.id) === normalized) || null
}

// User: get display info
function getCustomUserDisplay(property) {
  const val = getPropertyValue(property)
  if (!val) return null
  if (typeof val === 'object' && val.name) return normalizeUserForDisplay(val)
  return null
}

// Date: formatted display
function formatDateDisplay(value) {
  if (!value) return t('taskDetail.none')
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return String(value)
  }
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2 text-xs">
    <!-- ============== Status ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.status') }}</span>
      <div class="mt-0.5">
        <DropdownMenu width="14rem">
          <template #trigger>
            <div class="flex items-center gap-1.5 px-1 py-0.5 -ml-1 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
              <TaskProgressIcon
                :status="currentStatusOption?.status || 'todo'"
                :progress="currentStatusOption?.progress ?? 0"
                :color="currentStatusOption?.color || ''"
                size="sm"
              />
              <span class="font-medium text-gray-700">{{ currentStatusOption?.label || t('taskDetail.status') }}</span>
            </div>
          </template>
          <template #content>
            <div class="py-1 max-h-60 overflow-y-auto">
              <button
                v-for="opt in statusOptions"
                :key="opt.id"
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                :class="{ 'text-primary-600 bg-primary-50 font-semibold': currentStatusOption?.id === opt.id }"
                @click="handleUpdateStatus(opt)"
              >
                <TaskProgressIcon
                  :status="opt.status || 'todo'"
                  :progress="opt.progress ?? 0"
                  :color="opt.color || ''"
                  size="sm"
                />
                <span class="flex-1 text-left">{{ opt.label }}</span>
                <i v-if="currentStatusOption?.id === opt.id" class="pi pi-check text-[10px]"></i>
              </button>
            </div>
          </template>
        </DropdownMenu>
      </div>
    </div>

    <!-- ============== Assignee ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.assignee') }}</span>
      <div class="mt-0.5">
        <UserSearchDropdown
          :model-value="assigneeDisplay"
          @select="handleUpdateAssignee"
        >
          <template #trigger>
            <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
              <Avatar
                v-if="assigneeDisplay"
                :image="assigneeDisplay.avatarUrl || assigneeDisplay.avatar || undefined"
                :label="!(assigneeDisplay.avatarUrl || assigneeDisplay.avatar) ? (assigneeDisplay.initials || '?') : undefined"
                shape="circle"
                class="assignee-avatar"
                :style="{
                  width: '20px', height: '20px', minWidth: '20px',
                  fontSize: '10px', fontWeight: '600',
                  color: '#ffffff', border: 'none', boxShadow: 'none',
                  backgroundColor: !(assigneeDisplay.avatarUrl || assigneeDisplay.avatar) ? (assigneeDisplay.color || '#3b82f6') : 'transparent'
                }"
              />
              <div
                v-else
                class="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-500 group-hover:text-gray-600 transition-colors"
              >
                <UserIcon class="w-2.5 h-2.5" />
              </div>
              <span class="text-gray-700 font-medium truncate">{{ assigneeDisplay?.name || t('taskDetail.unassigned', 'Unassigned') }}</span>
            </div>
          </template>
        </UserSearchDropdown>
      </div>
    </div>

    <!-- ============== Board ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.board') }}</span>
      <div class="mt-0.5">
        <DropdownMenu width="14rem">
          <template #trigger>
            <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
              <span class="font-medium text-gray-700">{{ task.projectName || t('taskDetail.none') }}</span>
              <ChevronDown class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
            </div>
          </template>
          <template #content>
            <div class="py-1 max-h-60 overflow-y-auto custom-scrollbar">
              <button
                v-for="project in projectStore.projects"
                :key="project.id"
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                :class="{ 'text-primary-600 bg-primary-50 font-semibold': task.projectId === project.id }"
                @click="handleUpdateProject(project.id)"
              >
                <span class="flex-1 text-left">{{ project.name }}</span>
                <i v-if="task.projectId === project.id" class="pi pi-check text-[10px]"></i>
              </button>
            </div>
          </template>
        </DropdownMenu>
      </div>
    </div>

    <!-- ============== Tags ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.tags') }}</span>
      <div ref="tagContainerRef" class="mt-0.5 sidebar-tag-container">
        <MultiSelectPopper
          :model-value="selectedTags"
          :options="tagOptions"
          :available-width="tagAvailableWidth"
          :allow-create="true"
          :placeholder="t('taskDetail.none')"
          placement="bottom-start"
          :offset-distance="4"
          selected-label="tags"
          @update:model-value="handleTagSelectionChange"
        />
      </div>
    </div>

    <!-- ============== Due Date ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.dueDate') }}</span>
      <div class="mt-0.5">
        <VDatePicker
          :model-value="task.dueDate"
          :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
          @update:model-value="handleUpdateDueDate"
        >
          <template #default="{ togglePopover }">
            <div
              @click="togglePopover"
              class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group"
            >
              <Calendar class="w-3.5 h-3.5 text-gray-400" />
              <span :class="task.dueDate ? 'text-gray-700 font-medium' : 'text-gray-400'">
                {{ formatDateDisplay(task.dueDate) }}
              </span>
            </div>
          </template>
        </VDatePicker>
      </div>
    </div>

    <!-- ============== Time Tracking ============== -->
    <div>
      <span class="text-gray-500 text-[11px]">{{ t('taskDetail.timeTracking') }}</span>
      <div class="mt-0.5">
        <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 text-gray-700">
          <Clock class="w-3.5 h-3.5 text-gray-400" />
          <span>{{ t('taskDetail.noTimeTracked') }}</span>
        </div>
      </div>
    </div>

    <!-- ============== Custom Properties ============== -->
    <template v-for="prop in customProperties" :key="prop.id">
      <!-- Text -->
      <div v-if="prop.type === 'text'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <input
            type="text"
            :value="getPropertyValue(prop) ?? ''"
            class="w-full px-1.5 py-1 -ml-1.5 text-xs text-gray-700 bg-transparent rounded hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-300 transition-colors"
            :placeholder="t('taskDetail.none')"
            @blur="handleCustomTextBlur(prop, $event)"
            @keydown.enter="$event.target.blur()"
          />
        </div>
      </div>

      <!-- Number -->
      <div v-else-if="prop.type === 'number'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <DropdownMenu v-if="getNumberFormatOptions(prop).length > 0" width="10rem">
            <template #trigger>
              <div class="flex items-center gap-1.5 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors">
                <Hash class="w-3.5 h-3.5 text-gray-400" />
                <span class="font-medium text-gray-700">{{ getPropertyValue(prop) ?? t('taskDetail.none') }}</span>
              </div>
            </template>
            <template #content>
              <div class="py-1 max-h-48 overflow-y-auto">
                <button
                  v-for="opt in getNumberFormatOptions(prop)"
                  :key="opt.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                  :class="{ 'text-primary-600 bg-primary-50 font-semibold': String(getPropertyValue(prop)) === String(opt.value) }"
                  @click="handleCustomSelectChange(prop, opt.value)"
                >
                  <span class="flex-1 text-left">{{ opt.label }}</span>
                  <i v-if="String(getPropertyValue(prop)) === String(opt.value)" class="pi pi-check text-[10px]"></i>
                </button>
              </div>
            </template>
          </DropdownMenu>
          <input
            v-else
            type="number"
            step="any"
            :value="getPropertyValue(prop) ?? ''"
            class="w-full px-1.5 py-1 -ml-1.5 text-xs text-gray-700 bg-transparent rounded hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-300 transition-colors"
            :placeholder="t('taskDetail.none')"
            @blur="handleCustomNumberBlur(prop, $event)"
            @keydown.enter="$event.target.blur()"
          />
        </div>
      </div>

      <!-- Select -->
      <div v-else-if="prop.type === 'select'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <DropdownMenu width="12rem">
            <template #trigger>
              <div class="flex items-center gap-1.5 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
                <span
                  v-if="getSelectCurrentOption(prop)?.color"
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: getSelectCurrentOption(prop).color }"
                ></span>
                <span class="font-medium text-gray-700">{{ getSelectDisplayLabel(prop) }}</span>
                <ChevronDown class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </div>
            </template>
            <template #content>
              <div class="py-1 max-h-48 overflow-y-auto">
                <button
                  v-for="opt in getPropertyOptions(prop)"
                  :key="opt.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                  :class="{ 'text-primary-600 bg-primary-50 font-semibold': String(getPropertyValue(prop)) === String(opt.value) || String(getPropertyValue(prop)) === String(opt.id) }"
                  @click="handleCustomSelectChange(prop, opt.value)"
                >
                  <span
                    v-if="opt.color"
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: opt.color }"
                  ></span>
                  <span class="flex-1 text-left">{{ opt.label }}</span>
                  <i v-if="String(getPropertyValue(prop)) === String(opt.value) || String(getPropertyValue(prop)) === String(opt.id)" class="pi pi-check text-[10px]"></i>
                </button>
              </div>
            </template>
          </DropdownMenu>
        </div>
      </div>

      <!-- Multiselect -->
      <div v-else-if="prop.type === 'multiselect'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5 -ml-1.5">
          <MultiSelectPopper
            :model-value="toMultiselectTags(prop)"
            :options="getPropertyOptions(prop)"
            :allow-create="prop.settings?.isAllowCustom !== false"
            :max-visible-tags="2"
            :wrap-chips="true"
            :placeholder="t('taskDetail.none')"
            @update:model-value="(tags) => handleCustomMultiselectChange(prop, tags)"
          />
        </div>
      </div>

      <!-- Date -->
      <div v-else-if="prop.type === 'date'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <VDatePicker
            :model-value="getPropertyValue(prop)"
            :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
            @update:model-value="(val) => handleCustomDateChange(prop, val)"
          >
            <template #default="{ togglePopover }">
              <div
                @click="togglePopover"
                class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <Calendar class="w-3.5 h-3.5 text-gray-400" />
                <span :class="getPropertyValue(prop) ? 'text-gray-700 font-medium' : 'text-gray-400'">
                  {{ formatDateDisplay(getPropertyValue(prop)) }}
                </span>
              </div>
            </template>
          </VDatePicker>
        </div>
      </div>

      <!-- User -->
      <div v-else-if="prop.type === 'user'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <UserSearchDropdown
            :model-value="getCustomUserDisplay(prop)"
            @select="(user) => handleCustomUserChange(prop, user)"
          >
            <template #trigger>
              <div class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors group">
                <div v-if="getCustomUserDisplay(prop)" class="flex items-center gap-1.5">
                  <Avatar
                    :label="getCustomUserDisplay(prop)?.initials || '?'"
                    shape="circle"
                    size="small"
                    class="font-semibold ring-2 ring-white"
                    :style="{ width: '20px', height: '20px', fontSize: '10px', backgroundColor: getCustomUserDisplay(prop)?.color || '#dbeafe', color: '#1e40af' }"
                  />
                  <span class="text-gray-700 font-medium">{{ getCustomUserDisplay(prop)?.name }}</span>
                </div>
                <div v-else class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-500 group-hover:text-gray-600 transition-colors">
                    <UserIcon class="w-2.5 h-2.5" />
                  </div>
                  <span class="text-gray-400">{{ t('taskDetail.none') }}</span>
                </div>
              </div>
            </template>
          </UserSearchDropdown>
        </div>
      </div>

      <!-- Checkbox / Boolean -->
      <div v-else-if="prop.type === 'checkbox' || prop.type === 'boolean'">
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5">
          <div
            class="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded hover:bg-gray-100 cursor-pointer transition-colors"
            @click="handleCustomCheckboxChange(prop, !toBoolean(getPropertyValue(prop)))"
          >
            <Checkbox
              :model-value="toBoolean(getPropertyValue(prop))"
              :binary="true"
              @update:model-value="(val) => handleCustomCheckboxChange(prop, val)"
              @click.stop
            />
            <span class="text-gray-700">{{ toBoolean(getPropertyValue(prop)) ? t('tasks.filters.checked', 'Yes') : t('tasks.filters.unchecked', 'No') }}</span>
          </div>
        </div>
      </div>

      <!-- Fallback: unsupported type → read-only text -->
      <div v-else>
        <span class="text-gray-500 text-[11px]">{{ prop.label }}</span>
        <div class="mt-0.5 px-1.5 py-1 -ml-1.5 text-gray-700">
          {{ getPropertyValue(prop) ?? t('taskDetail.none') }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sidebar-tag-container {
  min-height: 28px;
}

.sidebar-tag-container :deep(.tag-select) {
  min-width: 0;
}

.sidebar-tag-container :deep(.tag-trigger) {
  min-height: 24px;
  padding: 1px 0;
  border-color: transparent;
  border-radius: 4px;
}

.sidebar-tag-container :deep(.tag-trigger:hover) {
  background-color: #f3f4f6;
  border-color: transparent;
}

.sidebar-tag-container :deep(.tag-pill) {
  max-width: 80px;
  height: 20px;
  padding: 2px 6px;
  font-size: 11px;
}

.sidebar-tag-container :deep(.tag-name) {
  max-width: 60px;
}

.sidebar-tag-container :deep(.tag-remove) {
  margin-left: 1px;
}

.sidebar-tag-container :deep(.tag-remove svg) {
  width: 8px;
  height: 8px;
}

.sidebar-tag-container :deep(.chevron-spacer) {
  display: none;
}

.sidebar-tag-container :deep(.tag-placeholder) {
  font-size: 11px;
  color: #9ca3af;
}
</style>

