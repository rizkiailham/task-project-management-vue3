<script setup>
/**
 * CreateTaskModal - Modal for creating new tasks.
 *
 * Two modes:
 *   - Minimal (default): title input + board selector + footer actions
 *   - Expanded: adds description editor (NotionEditor with BubbleToolbar),
 *     and property pills (board, assignee, subscriber, status, due date,
 *     due time, attachment, relationship, tags, recurrence)
 *
 * Toggle between modes via the expand/collapse arrow.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useTaskStore,
  useProjectStore,
  useUIStore,
  useAIStore,
  useProjectPropertyStore,
  useUserStore
} from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Avatar from 'primevue/avatar'
import NotionEditor from '@/components/editor/NotionEditor.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import UserMultiSearchDropdown from '@/components/user/UserMultiSearchDropdown.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import { getAvatarColor } from '@/utils/avatarColor'
import MultiSelectPopper from '@/components/ui/MultiSelectPopper.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskLinkDropdown from '@/components/task/TaskLinkDropdown.vue'
import DatePicker from 'primevue/datepicker'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  Sparkles,
  AtSign,
  User,
  Users,
  CalendarDays,
  Clock,
  Paperclip,
  GitBranch,
  Tag,
  Repeat,
  AlignLeft,
  Layers
} from 'lucide-vue-next'

const { t } = useI18n()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const aiStore = useAIStore()
const propertyStore = useProjectPropertyStore()
const userStore = useUserStore()

// Modal visibility
const visible = computed({
  get: () => uiStore.activeModal === 'createTask',
  set: (val) => { if (!val) uiStore.closeModal() }
})

// State
const isExpanded = ref(false)
const isLoading = ref(false)
const createMore = ref(false)

// Form fields
const title = ref('')
const description = ref('')
const projectId = ref('')
const status = ref('')
const assigneeId = ref(null)
const assignee = ref(null)
const dueDate = ref(null)
function defaultTime() {
  const d = new Date()
  d.setHours(11, 30, 0, 0)
  return d
}
const dueTime = ref(defaultTime())
const subscriberIds = ref([])
const selectedTagValues = ref([])
const linkedTask = ref(null)
const titleInputRef = ref(null)
const timePickerRef = ref(null)

const dueTimeDisplay = computed(() => {
  if (!dueTime.value) return t('tasks.createModal.dueTime', 'Due time')
  const d = dueTime.value instanceof Date ? dueTime.value : new Date(dueTime.value)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
})

function toggleTimePicker() {
  const dp = timePickerRef.value
  if (!dp) return
  // PrimeVue DatePicker doesn't expose show/hide — click its internal input to toggle
  const input = dp.$el?.querySelector('input')
  if (input) input.click()
}

// Project options
const projectOptions = computed(() =>
  projectStore.projects.map((p) => ({ id: p.id, name: p.name }))
)

const currentProject = computed(() =>
  projectStore.projects.find((p) => p.id === projectId.value) || null
)

// Status icon helpers (mirrors StatusCell / TaskDetailProperties)
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

// Status options from project properties (mirrors StatusCell.statusOptions)
const statusOptions = computed(() => {
  const pid = projectId.value || projectStore.currentProjectId
  if (pid) {
    const statusProp = propertyStore.getPropertyByKey(pid, 'status')
    const propertyOptions = Array.isArray(statusProp?.settings?.options) ? statusProp.settings.options : []
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
  }
  // Fallback
  return [
    { id: 'todo', value: TaskStatus.TODO, label: t('tasks.statusOptions.todo'), status: 'todo', progress: 0, color: '#9ca3af' },
    { id: 'in_progress', value: TaskStatus.IN_PROGRESS, label: t('tasks.statusOptions.inProgress'), status: 'in_progress', progress: 50, color: '#a855f7' },
    { id: 'in_review', value: TaskStatus.IN_REVIEW, label: t('tasks.statusOptions.inReview'), status: 'in_progress', progress: 75, color: '#f97316' }
  ]
})

const currentStatusOption = computed(() => {
  const opt = statusOptions.value.find((o) => o.value === status.value)
  return opt || statusOptions.value[0] || null
})

// Tag options from project properties
const tagOptions = computed(() => {
  const pid = projectId.value || projectStore.currentProjectId
  if (!pid) return []
  const tagsProp = propertyStore.getPropertyByKey(pid, 'tags')
  const options = Array.isArray(tagsProp?.settings?.options) ? tagsProp.settings.options : []
  return options.map((opt) => {
    if (typeof opt === 'string') return { id: opt, label: opt, value: opt, color: '' }
    const value = opt?.value ?? opt?.label ?? opt?.name ?? ''
    return {
      id: String(opt?.id ?? value),
      label: String(opt?.label ?? value),
      value: String(value),
      color: opt?.color || ''
    }
  }).filter((o) => o.value)
})

// Ensure properties loaded
watch(() => projectId.value || projectStore.currentProjectId, (pid) => {
  if (pid) propertyStore.fetchProperties(pid)
}, { immediate: true })

// Reset on open
watch(visible, (isVisible) => {
  if (isVisible) {
    title.value = ''
    description.value = ''
    projectId.value = projectStore.currentProjectId || ''
    status.value = uiStore.modalData?.defaultStatus || TaskStatus.TODO
    assigneeId.value = null
    assignee.value = null
    dueDate.value = uiStore.modalData?.defaultDueDate || null
    dueTime.value = defaultTime()
    subscriberIds.value = []
    selectedTagValues.value = []
    linkedTask.value = null
    isExpanded.value = false
    nextTick(() => titleInputRef.value?.focus())
  }
})

// Actions
async function handleSubmit() {
  if (!title.value?.trim()) return
  isLoading.value = true
  try {
    await taskStore.createNewTask({
      title: title.value.trim(),
      description: description.value || '',
      projectId: projectId.value || projectStore.currentProjectId,
      status: status.value || TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : null,
      assigneeId: assigneeId.value,
      kanbanColumnId: uiStore.modalData?.kanbanColumnId || null
    })
    if (createMore.value) {
      title.value = ''
      description.value = ''
      assigneeId.value = null
      assignee.value = null
      dueDate.value = null
      dueTime.value = defaultTime()
      subscriberIds.value = []
      selectedTagValues.value = []
      linkedTask.value = null
      nextTick(() => titleInputRef.value?.focus())
    } else {
      uiStore.closeModal()
    }
  } catch (error) {
    uiStore.showApiError(error, t('tasks.errors.create'))
  } finally {
    isLoading.value = false
  }
}

function handleAssigneeSelect(user) {
  assigneeId.value = user?.id || null
  assignee.value = user || null
}

function handleProjectSelect(project) {
  projectId.value = project.id
}


function handleTagSelectionChange(nextTags) {
  selectedTagValues.value = (Array.isArray(nextTags) ? nextTags : []).map((tag) => {
    if (typeof tag === 'string') return tag
    return tag.name ?? tag.value ?? tag.label ?? tag.id ?? ''
  }).filter(Boolean)
}

const selectedTags = computed(() =>
  selectedTagValues.value.map((value) => {
    const option = tagOptions.value.find((o) => String(o.value) === String(value) || String(o.id) === String(value))
    return {
      id: String(option?.id ?? value),
      name: String(option?.label ?? value),
      color: option?.color || ''
    }
  })
)

function getIndicatorColor(hex) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return '#6b7280'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 170 ? '#6b7280' : '#ffffff'
}

function handleStatusSelect(opt) {
  status.value = opt.value
}

function handleDueDateChange(val) {
  dueDate.value = val
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

const isGeneratingAI = computed(() => aiStore.isGenerating)

async function generateWithAI() {
  if (!title.value?.trim()) {
    uiStore.showWarning(t('tasks.errors.titleRequired'))
    return
  }
  try {
    const result = await aiStore.generateDescription(title.value)
    if (result) {
      description.value = result
      if (!isExpanded.value) isExpanded.value = true
    }
  } catch (error) {
    uiStore.showApiError(error, t('tasks.errors.generateDescription'))
  }
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}




</script>

<template>
  <BaseModal
    v-model:visible="visible"
    width="460px"
    :closable="!isLoading"
    :close-on-escape="!isLoading"
    dialog-class="create-task-modal-dialog"
  >
    <template #header>
      <div class="w-full">
        <FormInput
          ref="titleInputRef"
          v-model="title"
          :placeholder="t('tasks.createModal.placeholders.title', 'Task name')"
          class="w-full !border-none !shadow-none !ring-0 !outline-none !text-[24px] !font-bold !pl-0 !bg-transparent !text-gray-900"
          @keydown.enter.prevent="handleSubmit"
        />
      </div>
    </template>

    <div class="pt-1">
      <!-- Minimal: Board row -->
      <div v-if="!isExpanded" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <DropdownMenu width="12rem">
            <template #trigger>
              <button
                type="button"
                class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AtSign class="w-3 h-3" />
                <span>{{ currentProject?.name || t('tasks.fields.project', 'Project') }}</span>
              </button>
            </template>
            <template #content>
              <div class="py-1 max-h-48 overflow-y-auto">
                <button
                  v-for="proj in projectOptions"
                  :key="proj.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                  :class="{ 'text-blue-600 bg-blue-50 font-medium': projectId === proj.id }"
                  @click="handleProjectSelect(proj)"
                >
                  <span class="flex-1 text-left">{{ proj.name }}</span>
                </button>
              </div>
            </template>
          </DropdownMenu>
        </div>
        <button
          type="button"
          class="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
          :title="t('tasks.createModal.expand', 'Expand')"
          @click="toggleExpanded"
        >
          <ArrowDownFromLine class="w-4 h-4" />
        </button>
      </div>

      <!-- Expanded: Description + Properties -->
      <template v-if="isExpanded">
        <!-- Description -->
        <div class="mb-4">
          <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <AlignLeft class="w-4 h-4" />
            <span class="font-medium">{{ t('tasks.fields.description', 'Description') }}</span>
          </div>
          <div class="create-task-editor-wrapper">
            <NotionEditor
              v-model="description"
              :placeholder="t('tasks.placeholders.description', 'Add a description...')"
              min-height="80px"
              max-height="200px"
              :borderless="true"
            />
          </div>
        </div>

        <!-- Property pills -->
        <div class="flex flex-wrap items-center gap-1 mt-1">
          <!-- Board / Project -->
          <DropdownMenu width="12rem">
            <template #trigger>
              <span class="create-task-pill">
                <AtSign class="w-3 h-3" />
                {{ currentProject?.name || t('tasks.fields.project', 'Project') }}
              </span>
            </template>
            <template #content>
              <div class="py-1 max-h-48 overflow-y-auto">
                <button
                  v-for="proj in projectOptions"
                  :key="proj.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                  :class="{ 'text-blue-600 bg-blue-50 font-medium': projectId === proj.id }"
                  @click="handleProjectSelect(proj)"
                >
                  <span class="flex-1 text-left">{{ proj.name }}</span>
                </button>
              </div>
            </template>
          </DropdownMenu>

          <!-- Assignee -->
          <UserSearchDropdown
            :project-id="projectId"
            :show-groups="true"
            @select="handleAssigneeSelect"
          >
            <template #trigger>
              <span class="create-task-pill">
                <template v-if="assignee">
                  <Avatar
                    :image="assignee.avatar || assignee.avatarUrl || undefined"
                    :label="!(assignee.avatar || assignee.avatarUrl) ? (assignee.name || '?').charAt(0) : undefined"
                    shape="circle"
                    class="!w-4 !h-4 !min-w-4 !text-[8px] !font-semibold !text-white"
                    :style="{ backgroundColor: !(assignee.avatar || assignee.avatarUrl) ? getAvatarColor(assignee.name || '') : 'transparent' }"
                  />
                </template>
                <User v-else class="w-3 h-3" />
                {{ assignee?.name || t('taskDetail.assignee', 'Assignee') }}
              </span>
            </template>
          </UserSearchDropdown>

          <!-- Subscriber -->
          <UserMultiSearchDropdown
            v-model="subscriberIds"
            :project-id="projectId"
            :show-groups="true"
            :placeholder="t('tasks.createModal.subscriber', 'Subscriber')"
          >
            <template #trigger="{ selectedUsers = [] }">
              <span class="create-task-pill">
                <template v-if="selectedUsers.length > 0">
                  <div class="flex -space-x-1">
                    <Avatar
                      v-for="(u, i) in selectedUsers.slice(0, 2)"
                      :key="u.id || u.value"
                      :image="u.avatarUrl"
                      :label="!u.avatarUrl ? (u.name || '?').charAt(0) : undefined"
                      shape="circle"
                      class="!w-4 !h-4 !min-w-4 !text-[8px] !font-semibold !text-white border border-white"
                      :style="{ backgroundColor: !u.avatarUrl ? getAvatarColor(u.name || '') : 'transparent', zIndex: 10 - i }"
                    />
                    <div v-if="selectedUsers.length > 2" class="w-4 h-4 rounded-full border border-white bg-gray-100 flex items-center justify-center text-[8px] font-semibold text-gray-500 z-0">
                      +{{ selectedUsers.length - 2 }}
                    </div>
                  </div>
                </template>
                <Users v-else class="w-3 h-3" />
                {{ selectedUsers.length > 0 ? `${selectedUsers.length} ${t('tasks.createModal.subscriber', 'Subscriber')}` : t('tasks.createModal.subscriber', 'Subscriber') }}
              </span>
            </template>
          </UserMultiSearchDropdown>

          <!-- Status -->
          <DropdownMenu width="12rem">
            <template #trigger>
              <span class="create-task-pill">
                <TaskProgressIcon
                  :status="currentStatusOption?.status || 'todo'"
                  :progress="currentStatusOption?.progress ?? 0"
                  :color="currentStatusOption?.color || ''"
                  size="sm"
                />
                {{ currentStatusOption?.label || t('taskDetail.status', 'Status') }}
              </span>
            </template>
            <template #content>
              <div class="py-1 max-h-60 overflow-y-auto">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                  :class="{ 'text-blue-600 bg-blue-50 font-semibold': currentStatusOption?.id === opt.id }"
                  @click="handleStatusSelect(opt)"
                >
                  <TaskProgressIcon
                    :status="opt.status || 'todo'"
                    :progress="opt.progress ?? 0"
                    :color="opt.color || ''"
                    size="sm"
                  />
                  <span class="flex-1 text-left truncate">{{ opt.label }}</span>
                  <i v-if="currentStatusOption?.id === opt.id" class="pi pi-check text-[10px]"></i>
                </button>
              </div>
            </template>
          </DropdownMenu>

          <!-- Due date -->
          <VDatePicker
            ref="dp"
            :model-value="dueDate"
            :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
            @update:model-value="handleDueDateChange"
          >
            <template #default="{ togglePopover }">
              <span class="create-task-pill" @click="togglePopover">
                <CalendarDays class="w-3 h-3" />
                {{ dueDate ? formatDate(dueDate) : t('tasks.fields.dueDate', 'Due date') }}
              </span>
            </template>
            <template #footer>
              <div class="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="$refs.dp && $refs.dp.updateValue(new Date()); $refs.dp && $refs.dp.hidePopover()">{{ t('calendar.today', 'Today') }}</button>
                <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="$refs.dp && $refs.dp.updateValue(null); $refs.dp && $refs.dp.hidePopover()">{{ t('calendar.clear', 'Clear') }}</button>
              </div>
            </template>
          </VDatePicker>

          <!-- Due time -->
          <span class="due-time-wrapper">
            <span class="create-task-pill" @click="toggleTimePicker">
              <Clock class="w-3 h-3" />
              {{ dueTimeDisplay }}
            </span>
            <DatePicker
              ref="timePickerRef"
              v-model="dueTime"
              timeOnly
              class="due-time-picker-hidden"
            />
          </span>

          <!-- Attachment (placeholder) -->
          <span class="create-task-pill">
            <Paperclip class="w-3 h-3" />
            {{ t('taskDetail.attachments', 'Attachment') }}
          </span>

          <!-- Relationship -->
          <TaskLinkDropdown
            :project-id="projectId"
            @select="(task) => linkedTask = task"
          >
            <template #trigger>
              <span class="create-task-pill">
                <GitBranch class="w-3 h-3" />
                {{ linkedTask?.title || t('tasks.createModal.relationship', 'Relationship') }}
              </span>
            </template>
          </TaskLinkDropdown>

          <!-- Tags -->
          <MultiSelectPopper
            :model-value="selectedTags"
            :options="tagOptions.map((o) => ({ id: o.id, name: o.label || o.value, color: o.color || '' }))"
            :placeholder="t('taskDetail.tags', 'Tags')"
            :allow-create="false"
            :close-on-select="false"
            :panel-width="270"
            :panel-max-width="270"
            :wrap-chips="true"
            selected-label="tags"
            placement="bottom-start"
            @update:model-value="handleTagSelectionChange"
          >
            <template #trigger="{ toggle }">
              <span class="create-task-pill" @click="toggle">
                <Tag class="w-3 h-3" />
                {{ selectedTagValues.length > 0 ? `${selectedTagValues.length} ${t('taskDetail.tags', 'Tags')}` : t('taskDetail.tags', 'Tags') }}
              </span>
            </template>
            <template #head="{ selected, remove }">
              <div class="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-500">
                {{ t('tasks.selectedTags', 'Selected tags') }}
              </div>
              <div v-if="selected.length" class="flex flex-wrap gap-1 px-3 pb-2">
                <button
                  v-for="tag in selected"
                  :key="tag.id"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-semibold"
                  :style="{ backgroundColor: tag.color || '#e5e7eb', color: getIndicatorColor(tag.color) }"
                  @click.stop="remove(tag)"
                >
                  <span class="max-w-[120px] truncate" :title="tag.name">{{ tag.name }}</span>
                  <span class="opacity-80">x</span>
                </button>
              </div>
              <div v-else class="px-3 pb-2 text-[11px] text-gray-400">
                {{ t('tasks.noTagsSelected', 'No tags selected.') }}
              </div>
            </template>
          </MultiSelectPopper>

          <!-- Recurrence (placeholder) -->
          <span class="create-task-pill">
            <Repeat class="w-3 h-3" />
            {{ t('tasks.createModal.recurrence', 'Recurrence') }}
          </span>

          <!-- Collapse toggle -->
          <button
            type="button"
            class="ml-auto p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
            :title="t('tasks.createModal.collapse', 'Collapse')"
            @click="toggleExpanded"
          >
            <ArrowUpFromLine class="w-4 h-4" />
          </button>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <Button
            :label="isGeneratingAI ? t('aiChat.generating') : t('tasks.createModal.taskAI', 'Task AI')"
            :icon="isGeneratingAI ? 'pi pi-spin pi-spinner' : undefined"
            :disabled="isGeneratingAI || isLoading"
            class="create-task-ai-btn !h-8 !px-3 !text-xs !text-white"
            @click="generateWithAI"
          >
            <template v-if="!isGeneratingAI" #icon>
              <Sparkles class="w-3 h-3 mr-1.5" />
            </template>
          </Button>
          <button
            v-if="isExpanded"
            type="button"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Layers class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <ToggleSwitch v-model="createMore" class="create-more-switch" />
            <span class="text-xs text-gray-600 font-medium">{{ t('tasks.createModal.createMore', 'Create more') }}</span>
          </label>

          <Button
            :label="isLoading ? t('tasks.createModal.creating') : t('tasks.createModal.cta')"
            :icon="isLoading ? 'pi pi-spin pi-spinner' : undefined"
            :disabled="!title.trim() || isLoading"
            class="!h-8 !px-4 !text-xs !bg-blue-600 !border-blue-600 hover:!bg-blue-700"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
/* ── Property pills: squared, white bg ── */
.create-task-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-600);
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  user-select: none;
}

.create-task-pill:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: var(--color-gray-800);
}

/* ── Task AI purple button ── */
.create-task-ai-btn {
  transition: all 0.2s ease;
}

/* ── Description editor ── */
.create-task-editor-wrapper :deep(.notion-editor) {
  padding: 8px 0;
  font-size: 13px;
  min-height: 80px;
}

.create-task-editor-wrapper :deep(.notion-editor p.is-editor-empty:first-child::before) {
  color: var(--color-gray-400);
  font-size: 13px;
}

/* ── Toggle switch sizing ── */
.create-more-switch {
  transform: scale(0.8);
  transform-origin: center;
}

.due-time-wrapper {
  position: relative;
  display: inline-flex;
}

.due-time-picker-hidden {
  position: absolute;
  top: 100%;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.due-time-picker-hidden :deep(.p-datepicker-input) {
  width: 1px;
  height: 1px;
  padding: 0;
  border: none;
}
</style>

<!-- Unscoped: targets PrimeVue Dialog via dialogClass since scoped can't reach through BaseModal -->
<style>
.create-task-modal-dialog.p-dialog {
  /* border-radius: 12px !important; */
  /* overflow: hidden !important; */
}

.create-task-modal-dialog.p-dialog .p-dialog-header {
  padding: 20px 24px 4px 24px !important;
  border-bottom: none !important;
  background: white !important;
}

.create-task-modal-dialog.p-dialog .p-dialog-header .p-inputtext,
.create-task-modal-dialog.p-dialog .p-dialog-header .p-inputtext:enabled,
.create-task-modal-dialog.p-dialog .p-dialog-header .p-inputtext:focus,
.create-task-modal-dialog.p-dialog .p-dialog-header .p-inputtext:hover,
.create-task-modal-dialog.p-dialog .p-dialog-header input {
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.create-task-modal-dialog.p-dialog .p-dialog-content {
  padding: 4px 24px 12px 24px !important;
  background: white !important;
  overflow: visible !important;
}

.create-task-modal-dialog.p-dialog .p-dialog-footer {
  padding: 12px 24px !important;
  border-top: 1px solid #f0f0f0 !important;
  background: white !important;
}

.create-task-modal-dialog.p-dialog .p-dialog-footer .create-task-ai-btn.p-button {
  background: linear-gradient(135deg, #9333ea, #7c3aed) !important;
  border-color: #7c3aed !important;
}

.create-task-modal-dialog.p-dialog .p-dialog-footer .create-task-ai-btn.p-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #7e22ce, #6d28d9) !important;
  border-color: #6d28d9 !important;
}
</style>
