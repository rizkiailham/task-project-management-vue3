<script setup>
/**
 * SettingsProjectForms - Project form builder settings.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import * as projectApi from '@/api/project.api'
import FormInput from '@/components/ui/FormInput.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import ToggleSwitch from 'primevue/toggleswitch'
import Avatar from 'primevue/avatar'
import { Link2, MoreHorizontal, Plus, Lock, ChevronDown, Check, Trash } from 'lucide-vue-next'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)
const isLoading = ref(false)
const loadedFormId = ref(null)
const addPropertyMenuRef = ref(null)
const addPropertyInlineMenuRef = ref(null)
const propertySearch = ref('')
let loadToken = 0

const fallbackBoardOptions = [
  { label: 'DSD/Task', value: 'task-board' },
  { label: 'General', value: 'general-board' },
  { label: 'Board for tenant', value: 'tenant-board' },
  { label: 'Board for technician', value: 'technician-board' }
]

const actionOptions = [
  { label: 'Create task', value: 'create-task' },
  { label: 'Add comment', value: 'add-comment' },
  { label: 'Send to agent', value: 'send-agent' },
  { label: 'Send to skill', value: 'send-skill' }
]

const actionMenuItems = computed(() => [
  {
    id: 'open-preview',
    label: t('settings.project.forms.context.openPreview', 'Open preview'),
    action: () => uiStore.showInfo(t('settings.project.forms.messages.preview', 'Preview is not available yet.'))
  },
  {
    id: 'copy-private-link',
    label: t('settings.project.forms.context.copyPrivateLink', 'Copy private link'),
    action: () => handleCopyPrivateLink()
  },
  {
    id: 'pin-sidebar',
    label: t('settings.project.forms.context.pinOnSidebar', 'Pin on sidebar'),
    action: () => uiStore.showInfo(t('settings.project.forms.messages.pin', 'Pinned to sidebar (dummy state).'))
  },
  { type: 'divider' },
  {
    id: 'delete',
    label: t('settings.project.forms.context.delete', 'Delete'),
    action: () => uiStore.showWarning(t('settings.project.forms.messages.delete', 'Delete action is not available yet.'))
  }
])

const propertyCatalog = [
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    rightLabel: 'Text',
    placeholder: 'Write description'
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'select',
    rightLabel: 'Tags',
    placeholder: 'Select tags',
    options: [
      { label: 'Bug', value: 'bug' },
      { label: 'Enhancement', value: 'enhancement' },
      { label: 'Urgent', value: 'urgent' }
    ]
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    rightLabel: 'Priority',
    placeholder: 'Select priority',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    rightLabel: 'Status',
    placeholder: 'Select status',
    locked: true,
    options: [
      { label: 'Backlog', value: 'backlog', status: 'todo', progress: 0, color: '#9ca3af' },
      { label: 'In Progress', value: 'in-progress', status: 'in_progress', progress: 25, color: '#3b82f6' },
      { label: 'Done', value: 'done', status: 'done', progress: 100, color: '#22c55e' }
    ],
    defaultValue: 'backlog'
  },
  {
    key: 'assignee',
    label: 'Assignee',
    type: 'select',
    rightLabel: 'User',
    placeholder: 'Select assignee',
    options: [
      { label: 'John Doe', value: 'john-doe' },
      { label: 'Nina Park', value: 'nina-park' },
      { label: 'Aldo Felix', value: 'aldo-felix' }
    ]
  },
  {
    key: 'subscribers',
    label: 'Subscribers',
    type: 'multiselect',
    rightLabel: 'User',
    placeholder: 'Select subscribers',
    options: [
      { label: 'John Doe', value: 'john-doe' },
      { label: 'Nina Park', value: 'nina-park' },
      { label: 'Aldo Felix', value: 'aldo-felix' }
    ]
  },
  {
    key: 'attachments',
    label: 'Attachments',
    type: 'select',
    rightLabel: 'File',
    placeholder: 'Add attachments',
    options: [
      { label: 'Attachment required', value: 'required' },
      { label: 'Optional', value: 'optional' }
    ]
  },
  {
    key: 'custom-text',
    label: 'Custom Text',
    type: 'text',
    rightLabel: 'Text',
    placeholder: 'Please write the text'
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    type: 'select',
    rightLabel: 'User',
    placeholder: 'Select user',
    options: [
      { label: 'John Doe', value: 'john-doe' },
      { label: 'Nina Park', value: 'nina-park' },
      { label: 'Aldo Felix', value: 'aldo-felix' }
    ]
  }
]

function createField(key) {
  const property = propertyCatalog.find((item) => item.key === key)
  if (!property) return null
  return {
    id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: property.key,
    label: property.label,
    type: property.type,
    rightLabel: property.rightLabel,
    placeholder: property.placeholder,
    options: property.options || [],
    locked: Boolean(property.locked),
    required: false,
    visible: true,
    value: property.defaultValue ?? (property.type === 'multiselect' ? [] : '')
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function getObjectList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.forms)) return response.forms
  if (response?.form && typeof response.form === 'object') return [response.form]
  if (response?.projectForm && typeof response.projectForm === 'object') return [response.projectForm]
  if (response && typeof response === 'object') return [response]
  return []
}

function normalizeAccess(value) {
  if (value === 'public' || value === false) return 'public'
  return 'private'
}

function toApiIsPrivate(access) {
  return access !== 'public'
}

function normalizeActionId(value) {
  if (!value) return actionOptions[0].value
  const normalized = String(value)
  const apiToUiMap = {
    create: 'create-task',
    comment: 'add-comment',
    send_agent: 'send-agent',
    send_skill: 'send-skill'
  }
  return apiToUiMap[normalized] || normalized
}

function toApiAction(actionId) {
  const normalized = String(actionId || '').trim()
  const uiToApiMap = {
    'create-task': 'create',
    'add-comment': 'comment',
    'send-agent': 'send_agent',
    'send-skill': 'send_skill'
  }
  return uiToApiMap[normalized] || normalized || 'create'
}

function inferRightLabel(type) {
  const map = {
    text: 'Text',
    textarea: 'Text',
    number: 'Number',
    select: 'Select',
    multiselect: 'Select',
    date: 'Date',
    user: 'User'
  }
  return map[type] || 'Text'
}

function normalizeFieldValue(type, value) {
  if (type === 'multiselect') {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }
  return value ?? ''
}

function buildFieldFromApi(rawField, index = 0) {
  const rawKey = rawField?.key || rawField?.slug || rawField?.fieldKey || `field-${index + 1}`
  const key = rawKey === 'name' ? 'title' : rawKey
  const catalogField = propertyCatalog.find((item) => item.key === key)
  const type = rawField?.type || catalogField?.type || 'text'

  const optionsFromApi = toArray(rawField?.options).map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option }
    }
    return {
      ...option,
      label: option?.label ?? option?.name ?? option?.value ?? '',
      value: option?.value ?? option?.id ?? option?.label ?? option?.name ?? ''
    }
  })
  const options = optionsFromApi.length > 0 ? optionsFromApi : (catalogField?.options || [])

  let value = rawField?.value
  if (value === undefined) value = rawField?.defaultValue
  value = normalizeFieldValue(type, value)

  return {
    id: rawField?.id || `${key}-${Date.now()}-${index}`,
    key,
    label: rawField?.label || catalogField?.label || key,
    type,
    rightLabel: rawField?.rightLabel || rawField?.badge || catalogField?.rightLabel || inferRightLabel(type),
    placeholder: rawField?.placeholder || catalogField?.placeholder || '',
    options,
    locked: Boolean(rawField?.locked ?? (key === 'title') ?? catalogField?.locked),
    required: Boolean(rawField?.required ?? rawField?.isRequired ?? (key === 'title')),
    visible: rawField?.visible ?? rawField?.isShow ?? true,
    value
  }
}

function getStatusOption(value) {
  const statusField = propertyCatalog.find(p => p.key === 'status')
  return statusField?.options?.find(o => o.value === value)
}

function createDefaultFields() {
  return ['title', 'status', 'attachments', 'custom-text', 'supervisor'].map((key) => {
    if (key === 'title') {
      return {
        id: `title-${Date.now()}`,
        key: 'title',
        label: 'Title',
        type: 'text',
        rightLabel: 'Title',
        placeholder: 'Write a task name',
        options: [],
        locked: true,
        required: true,
        visible: true,
        value: ''
      }
    }
    const field = createField(key)
    if (field && key === 'status') {
      field.required = true
      field.visible = true
    }
    return field
  }).filter(Boolean)
}

const formState = ref({
  name: 'Default - Create task',
  access: 'private',
  boardId: 'task-board',
  actionId: 'create-task'
})
const formFields = ref(createDefaultFields())
const savedSnapshot = ref('')

const boardOptions = computed(() => {
  if (!projectId.value) return fallbackBoardOptions
  const items = projectStore.getProjectItems(projectId.value) || []
  const mapped = items.map((item) => ({
    label: item?.name || item?.slug || 'Board',
    value: item?.id
  })).filter((item) => item.value)
  return mapped.length > 0 ? mapped : fallbackBoardOptions
})

function getDefaultBoardId() {
  return boardOptions.value[0]?.value || fallbackBoardOptions[0]?.value || ''
}

const privateLink = computed(() => {
  const project = projectStore.currentProject
  const prefix = project?.initial || project?.name || 'project'
  return `https://desidia.app/forms/${String(prefix).trim().toLowerCase().replace(/\s+/g, '-')}/private`
})

const selectedFieldKeys = computed(() => new Set(formFields.value.map((field) => field.key)))
const availableProperties = computed(() => {
  const keyword = propertySearch.value.trim().toLowerCase()
  return propertyCatalog.filter((property) => {
    if (selectedFieldKeys.value.has(property.key)) return false
    if (!keyword) return true
    return property.label.toLowerCase().includes(keyword)
  })
})

const hasPendingChanges = computed(() => {
  if (!savedSnapshot.value) return false
  return createSnapshot() !== savedSnapshot.value
})

const canSave = computed(() => hasPendingChanges.value && !isSaving.value && !isLoading.value)

function createSnapshot() {
  return JSON.stringify({
    name: formState.value.name.trim(),
    access: formState.value.access,
    boardId: formState.value.boardId,
    actionId: formState.value.actionId,
    fields: formFields.value.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      rightLabel: field.rightLabel,
      placeholder: field.placeholder,
      required: field.required,
      visible: field.visible,
      locked: field.locked,
      value: field.value,
      options: toArray(field.options).map((option) => ({
        label: option?.label ?? '',
        value: option?.value ?? ''
      }))
    }))
  })
}

function resetToDefault() {
  loadedFormId.value = null
  formState.value = {
    name: 'Default - Create task',
    access: 'private',
    boardId: getDefaultBoardId(),
    actionId: actionOptions[0].value
  }
  formFields.value = createDefaultFields()
  propertySearch.value = ''
  savedSnapshot.value = createSnapshot()
}

function applyApiForm(form) {
  loadedFormId.value = form?.id || form?.formId || null

  const nextBoardId = form?.boardId || form?.projectItemId || form?.board?.id || getDefaultBoardId()
  const nextActionId = normalizeActionId(form?.actionId || form?.action || form?.actionType)
  formState.value = {
    name: form?.name || form?.title || 'Default - Create task',
    access: normalizeAccess(form?.access ?? form?.visibility ?? form?.sharing ?? form?.isPrivate),
    boardId: nextBoardId,
    actionId: nextActionId
  }

  const incomingFields = toArray(
    form?.customFields ||
      form?.fields ||
      form?.formFields ||
      form?.properties ||
      form?.items
  )
  const mappedFields = incomingFields.length > 0
    ? incomingFields.map((field, index) => buildFieldFromApi(field, index))
    : createDefaultFields()

  const hasTitle = mappedFields.some((field) => field.key === 'title')
  formFields.value = hasTitle ? mappedFields : [{ ...createDefaultFields()[0] }, ...mappedFields]
  propertySearch.value = ''
  savedSnapshot.value = createSnapshot()
}

async function loadFormFromApi() {
  if (!projectId.value) {
    resetToDefault()
    return
  }

  const token = ++loadToken
  isLoading.value = true
  try {
    await projectStore.fetchProjectItems(projectId.value)
    const response = await projectApi.getProjectForms({ projectId: projectId.value })
    if (token !== loadToken) return

    const forms = getObjectList(response)
      .filter((item) => String(item?.projectId || item?.project?.id || '') === String(projectId.value))
      .sort((a, b) => {
        const ia = Number(a?.index ?? 0)
        const ib = Number(b?.index ?? 0)
        return ia - ib
      })
    const selected = forms[0]

    if (selected) {
      applyApiForm(selected)
    } else {
      resetToDefault()
    }
  } catch (error) {
    if (token !== loadToken) return
    uiStore.showApiError(error, t('settings.project.forms.errors.load', 'Failed to load form settings'))
    resetToDefault()
  } finally {
    if (token === loadToken) {
      isLoading.value = false
    }
  }
}

function addPropertyField(propertyKey) {
  const field = createField(propertyKey)
  if (!field) return
  formFields.value.push(field)
  propertySearch.value = ''
  addPropertyMenuRef.value?.close?.()
  addPropertyInlineMenuRef.value?.close?.()
}

function removeField(fieldId) {
  const index = formFields.value.findIndex(f => f.id === fieldId)
  if (index !== -1) {
    formFields.value.splice(index, 1)
  }
}

async function handleCopyPrivateLink() {
  try {
    await navigator.clipboard.writeText(privateLink.value)
    uiStore.showSuccess(t('settings.project.forms.messages.linkCopied', 'Private link copied'))
  } catch {
    uiStore.showError(t('settings.project.forms.messages.linkCopyFailed', 'Failed to copy private link'))
  }
}

async function saveChanges() {
  if (!projectId.value || !hasPendingChanges.value || isSaving.value || isLoading.value) return
  isSaving.value = true
  try {
    const payload = {
      projectId: projectId.value,
      name: formState.value.name.trim(),
      description: formState.value.name.trim(),
      isPrivate: toApiIsPrivate(formState.value.access),
      action: toApiAction(formState.value.actionId),
      projectItemId: formState.value.boardId,
      customFields: formFields.value.map((field) => ({
        key: field.key === 'title' ? 'name' : field.key,
        label: field.label,
        isShow: Boolean(field.visible),
        isRequired: Boolean(field.required),
        defaultValue: Array.isArray(field.value) ? field.value.join(',') : (field.value ?? '')
      }))
    }

    let response
    if (loadedFormId.value) {
      response = await projectApi.updateProjectForm(loadedFormId.value, payload)
    } else {
      response = await projectApi.createProjectForm(payload)
    }

    const returned = response?.data || response?.form || response?.projectForm || response
    if (returned?.id || returned?.formId) {
      loadedFormId.value = returned.id || returned.formId
    }
    savedSnapshot.value = createSnapshot()
    uiStore.showApiSuccess(response, t('settings.project.forms.messages.saved', 'Form settings saved'))
    return response
  } catch (error) {
    uiStore.showApiError(error, t('settings.project.forms.errors.save', 'Failed to save form settings'))
    throw error
  } finally {
    isSaving.value = false
  }
}

watch(projectId, () => {
  loadFormFromApi()
}, { immediate: true })

watch([canSave, isSaving, hasPendingChanges], () => {
  emit('update:canSave', canSave.value)
  emit('update:isSaving', isSaving.value)
  emit('update:hasPendingChanges', hasPendingChanges.value)
}, { immediate: true })

defineExpose({ saveChanges, pendingChanges: hasPendingChanges })
</script>

<template>
  <div>
    <div v-if="!projectId" class="settings-project-empty">
      <div class="settings-project-empty-title">{{ t('settings.project.empty.title') }}</div>
      <p class="settings-project-empty-text">{{ t('settings.project.empty.description') }}</p>
    </div>

    <div v-else class="settings-form">
      <div class="settings-form-header">
        <div class="settings-form-title">{{ t('settings.project.forms.title', 'Edit form') }}</div>
        <div class="settings-form-header-actions">
          <button
            type="button"
            class="settings-form-icon-btn"
            :title="t('settings.project.forms.actions.copyPrivateLink', 'Copy private link')"
            @click="handleCopyPrivateLink"
          >
            <Link2 class="w-4 h-4" />
          </button>

          <DropdownMenu :items="actionMenuItems" position="right" width="12.5rem" variant="sidebar">
            <template #trigger>
              <button
                type="button"
                class="settings-form-icon-btn"
                :title="t('settings.project.forms.actions.more', 'More actions')"
              >
                <MoreHorizontal class="w-4 h-4" />
              </button>
            </template>
          </DropdownMenu>
        </div>
      </div>

      <div class="settings-form-field mt-4">
        <FormInput
          id="settings-form-name"
          v-model="formState.name"
          :label="t('settings.project.forms.fields.name', 'Name *')"
          :placeholder="t('settings.project.forms.placeholders.name', 'Default - Create task')"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          class="w-full"
        />
      </div>

      <div class="settings-form-section mt-6">
        <div class="settings-form-label">{{ t('settings.project.forms.fields.sharing', 'Sharing / Access') }}</div>
        <div class="settings-form-access-grid">
          <button
            type="button"
            class="settings-form-access-card"
            :class="{ 'is-selected': formState.access === 'private' }"
            @click="formState.access = 'private'"
          >
            <span class="settings-form-access-title">{{ t('settings.project.forms.access.private.title', 'Private') }}</span>
            <span class="settings-form-access-text">
              {{ t('settings.project.forms.access.private.description', 'Only registered project email addresses are allowed') }}
            </span>
          </button>

          <button
            type="button"
            class="settings-form-access-card"
            :class="{ 'is-selected': formState.access === 'public' }"
            @click="formState.access = 'public'"
          >
            <span class="settings-form-access-title">{{ t('settings.project.forms.access.public.title', 'Public') }}</span>
            <span class="settings-form-access-text">
              {{ t('settings.project.forms.access.public.description', 'Anyone who has the link can send email to this address') }}
            </span>
          </button>
        </div>
      </div>

      <div class="settings-form-grid mt-6">
        <div class="settings-form-field">
          <label class="settings-form-label">{{ t('settings.project.forms.fields.board', 'Board') }}</label>
          <FormInput
            id="settings-form-board"
            v-model="formState.boardId"
            as="select"
            :options="boardOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="settings-form-field">
          <label class="settings-form-label">{{ t('settings.project.forms.fields.action', 'Action') }}</label>
          <FormInput
            id="settings-form-action"
            v-model="formState.actionId"
            as="select"
            :options="actionOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <div class="settings-form-fields mt-6">
        <div class="settings-form-fields-head">
          <div class="settings-form-fields-title">{{ t('settings.project.forms.fields.formFields', 'Form fields') }}</div>
          <DropdownMenu ref="addPropertyMenuRef" :items="[]" position="right" width="14rem" variant="sidebar">
            <template #trigger>
              <button type="button" class="settings-form-add-icon" :title="t('settings.project.forms.actions.addProperty', 'Add property')">
                <Plus class="w-4 h-4" />
              </button>
            </template>
            <template #content>
              <div class="settings-form-property-menu">
                <input
                  v-model="propertySearch"
                  type="text"
                  class="settings-form-property-search"
                  :placeholder="t('settings.project.forms.placeholders.searchProperty', 'Search a property')"
                />
                <div class="settings-form-property-list custom-scrollbar">
                  <button
                    v-for="property in availableProperties"
                    :key="property.key"
                    type="button"
                    class="settings-form-property-item"
                    @click="addPropertyField(property.key)"
                  >
                    {{ property.label }}
                  </button>
                  <div v-if="availableProperties.length === 0" class="settings-form-property-empty">
                    {{ t('common.noResults', 'No results found') }}
                  </div>
                </div>
              </div>
            </template>
          </DropdownMenu>
        </div>

          <div v-for="field in formFields" :key="field.id" class="settings-form-field-card">
            <!-- Header: Title + Lock -->
            <div class="settings-form-field-card-head">
              <div class="settings-form-field-card-title">
                {{ field.key === 'title' ? 'Title *' : (field.label || field.key) }}
              </div>
              <div class="settings-form-field-card-title flex items-center gap-2">
                <span>{{ field.rightLabel }}</span>
                <Lock v-if="field.locked" class="w-3.5 h-3.5" />
              </div>
            </div>

            <div class="settings-form-field-card-body">
              <!-- Label Input -->
              <div class="settings-form-field-row">
                <label class="settings-form-field-label">{{ t('settings.project.forms.fields.label', 'Label') }}</label>
                <FormInput
                  v-model="field.label"
                  :id="`field-label-${field.id}`"
                  class="w-full"
                  :placeholder="t('settings.project.forms.placeholders.label', 'Enter label')"
                />
              </div>

              <!-- Default Value Input -->
              <div class="settings-form-field-row">
                <label class="settings-form-field-label">{{ t('settings.project.forms.fields.defaultValue', 'Default') }}</label>
                
                <!-- User Selector for Supervisor/User types -->
                <UserSearchDropdown
                  v-if="field.key === 'supervisor' || field.key === 'assignee'"
                  v-model="field.value"
                  :projectId="projectId"
                  class="w-full"
                >
                  <template #trigger>
                    <button type="button" class="w-full h-[32px] flex items-center justify-between px-2 bg-white border border-gray-300 rounded-md text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                      <div v-if="field.value" class="flex items-center gap-2 overflow-hidden">
                        <Avatar 
                          :image="field.value.avatarUrl || field.value.avatar" 
                          :label="!field.value.avatarUrl && !field.value.avatar ? (field.value.initials || field.value.name?.charAt(0) || '?') : undefined" 
                          shape="circle" 
                          size="small"
                          class="w-5 h-5 text-[10px] bg-primary-100 text-primary-700 font-semibold flex-shrink-0"
                        />
                        <span class="truncate text-xs">{{ field.value.name }}</span>
                      </div>
                      <span v-else class="text-gray-400 text-xs">{{ t('common.selectUser', 'Select user') }}</span>
                      <ChevronDown class="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </template>
                </UserSearchDropdown>

                <!-- Status Selector with Icons -->
                <DropdownMenu
                  v-else-if="field.key === 'status'"
                  class="w-full"
                  position="right"
                  width="18rem"
                >
                   <template #trigger>
                    <button type="button" class="w-full h-[32px] flex items-center justify-between px-2 bg-white border border-gray-300 rounded-md text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                      <div v-if="field.value" class="flex items-center gap-2 overflow-hidden">
                         <TaskProgressIcon 
                            :status="getStatusOption(field.value)?.status || 'todo'" 
                            :progress="getStatusOption(field.value)?.progress || 0"
                            :color="getStatusOption(field.value)?.color || '#9ca3af'"
                            size="sm"
                         />
                        <span class="truncate text-xs">{{ getStatusOption(field.value)?.label || field.value }}</span>
                      </div>
                      <span v-else class="text-gray-400 text-xs">{{ t('settings.project.forms.placeholders.status', 'Select status') }}</span>
                      <ChevronDown class="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </template>
                  <template #content>
                     <div class="py-1 custom-scrollbar max-h-[200px] overflow-y-auto">
                        <button
                          v-for="opt in field.options"
                          :key="opt.value"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors text-gray-700"
                          @click="field.value = opt.value"
                        >
                           <TaskProgressIcon 
                              :status="opt.status || 'todo'" 
                              :progress="opt.progress || 0"
                              :color="opt.color || '#9ca3af'"
                              size="sm"
                           />
                           <span class="flex-1 text-left">{{ opt.label }}</span>
                           <Check v-if="field.value === opt.value" class="w-3.5 h-3.5 text-primary-500" />
                        </button>
                     </div>
                  </template>
                </DropdownMenu>

                <!-- Standard Inputs for others -->
                <FormInput
                  v-else-if="field.type === 'textarea'"
                  v-model="field.value"
                  :id="`field-default-${field.id}`"
                  as="textarea"
                  rows="1"
                  autoResize
                  class="w-full"
                  :placeholder="field.placeholder"
                />
                <FormInput
                  v-else-if="field.type === 'multiselect'"
                  v-model="field.value"
                  :id="`field-default-${field.id}`"
                  as="multiselect"
                  :options="field.options"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="field.placeholder"
                />
                <FormInput
                  v-else-if="field.type === 'select'"
                  v-model="field.value"
                  :id="`field-default-${field.id}`"
                  as="select"
                  :options="field.options"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="field.placeholder"
                />
                 <FormInput
                  v-else
                  v-model="field.value"
                  :id="`field-default-${field.id}`"
                  class="w-full"
                  :placeholder="field.placeholder"
                />
              </div>

              <!-- Toggles: Visible & Required -->
              <div class="settings-form-field-toggles">
                <div class="settings-form-toggle-item">
                  <ToggleSwitch 
                    v-model="field.visible" 
                    :inputId="`visible-${field.id}`" 
                    :disabled="field.key === 'title'"
                  />
                  <label :for="`visible-${field.id}`" :class="{ 'opacity-50': field.key === 'title' }">{{ t('settings.project.forms.fields.visible', 'Visible in form') }}</label>
                </div>
                <div class="settings-form-toggle-item flex justify-between items-center w-full">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch 
                      v-model="field.required" 
                      :inputId="`required-${field.id}`" 
                      :disabled="field.key === 'title'" 
                    />
                    <label :for="`required-${field.id}`" :class="{ 'opacity-50': field.key === 'title' }">{{ t('settings.project.forms.fields.required', 'Required') }}</label>
                  </div>
                  
                  <button 
                    v-if="!field.locked"
                    type="button" 
                    class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                    @click="removeField(field.id)"
                    :title="t('common.delete', 'Delete')"
                  >
                    <Trash class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        <DropdownMenu ref="addPropertyInlineMenuRef" :items="[]" position="left" width="14rem" variant="sidebar">
          <template #trigger>
            <button type="button" class="settings-form-add-btn">
              <Plus class="w-4 h-4" />
              <span>{{ t('settings.project.forms.actions.addProperty', 'Add property') }}</span>
            </button>
          </template>
          <template #content>
            <div class="settings-form-property-menu">
              <input
                v-model="propertySearch"
                type="text"
                class="settings-form-property-search"
                :placeholder="t('settings.project.forms.placeholders.searchProperty', 'Search a property')"
              />
                <div class="settings-form-property-list custom-scrollbar">
                  <button
                    v-for="property in availableProperties"
                    :key="property.key"
                    type="button"
                    class="settings-form-property-item"
                    @click="addPropertyField(property.key)"
                  >
                    {{ property.label }}
                  </button>
                  <div v-if="availableProperties.length === 0" class="settings-form-property-empty">
                    {{ t('common.noResults', 'No results found') }}
                  </div>
                </div>
            </div>
          </template>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-project-empty {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
}

.settings-project-empty-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
}

.settings-project-empty-text {
  font-size: 12px;
  color: var(--color-gray-400);
  margin-top: 6px;
}

.settings-form {
  min-height: 0;
  max-height: none;
  overflow: visible;
  padding-right: 4px;
  padding-bottom: 20px;
}

.settings-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-form-title {
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.settings-form-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-form-icon-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: transparent;
  border: 0;
  color: var(--color-gray-500);
  cursor: pointer;
}

.settings-form-icon-btn:hover {
  background: #f3f4f6;
  color: var(--color-gray-700);
}

.settings-form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.settings-form-access-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-form-access-card {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.settings-form-access-card:hover {
  border-color: #93c5fd;
}

.settings-form-access-card.is-selected {
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 1px #3b82f6;
}

.settings-form-access-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.settings-form-access-text {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-gray-400);
  max-width: 260px;
}

.settings-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 320px);
  gap: 14px;
}

.settings-form-field {
  width: 100%;
}

.settings-form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-form-fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-form-fields-title {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

@media (max-width: 900px) {
  .settings-form-access-grid {
    grid-template-columns: 1fr;
  }

  .settings-form-grid {
    grid-template-columns: 1fr;
  }
}

.settings-form-fields-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-form-add-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--color-gray-400);
}

.settings-form-add-icon:hover {
  background: #f3f4f6;
  color: var(--color-gray-500);
}

.settings-form-field-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #f9fafb; /* Greyish background */
}

.settings-form-field-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.settings-form-field-card-title {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.settings-form-field-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-form-field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-form-field-label {
  font-size: 11px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  margin-left: 2px;
}

.settings-form-field-toggles {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.settings-form-toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-gray-700);
}

.settings-form-toggle-item label {
  cursor: pointer;
  user-select: none;
}

/* Ensure inputs inside the card are smaller */
.settings-form-field-card-body :deep(.p-inputtext),
.settings-form-field-card-body :deep(.p-textarea),
.settings-form-field-card-body :deep(.p-select-label),
.settings-form-field-card-body :deep(.p-multiselect-label) {
  font-size: 12px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  background: #ffffff;
}

/* ToggleSwitch scaling to match design (small) without breaking consistency */
.settings-form-field-card-body :deep(.p-toggleswitch) {
    transform: scale(0.8);
    transform-origin: left center;
}

.settings-form-add-btn {
  width: fit-content;
  height: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 14px;
  color: var(--color-gray-700);
  background: #ffffff;
}

.settings-form-add-btn:hover {
  background: #f9fafb;
}

.settings-form-property-menu {
  width: 100%;
}

.settings-form-property-search {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f3f4f6;
  background: transparent;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--color-gray-500);
}

.settings-form-property-search:focus {
  outline: none;
  background: #f9fafb;
}

.settings-form-property-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 0;
}

.settings-form-property-item {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-gray-700);
  transition: all 0.2s;
}

.settings-form-property-item:hover {
  background: #f3f4f6;
  color: var(--color-gray-900);
}

.settings-form-property-empty {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--color-gray-400);
  text-align: center;
}

/* Custom Scrollbar to match UserSearchDropdown */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #d1d5db;
}

@media (max-width: 900px) {
  .settings-form-access-grid {
    grid-template-columns: 1fr;
  }

  .settings-form-grid {
    grid-template-columns: 1fr;
  }
}

</style>




