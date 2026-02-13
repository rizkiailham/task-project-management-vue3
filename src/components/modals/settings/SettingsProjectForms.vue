<script setup>
/**
 * SettingsProjectForms - Project form builder settings.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore, useUserStore } from '@/stores'
import * as projectApi from '@/api/project.api'
import FormInput from '@/components/ui/FormInput.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import UserMultiSearchDropdown from '@/components/user/UserMultiSearchDropdown.vue'
import ToggleSwitch from 'primevue/toggleswitch'
import Avatar from 'primevue/avatar'
import { Link2, MoreHorizontal, Plus, Lock, ChevronDown, Check, Trash } from 'lucide-vue-next'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const userStore = useUserStore()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)
const isLoading = ref(false)
const loadedFormId = ref(null)
const addPropertyMenuRef = ref(null)
const addPropertyInlineMenuRef = ref(null)
const propertySearch = ref('')
const projectStatusOptions = ref([])
let loadToken = 0

const DEFAULT_FORM_NAME = 'Default - Create task'
const STATUS_PROGRESS_OPTIONS = [
  { id: '0', status: 'todo', progress: 0, defaultColor: '#9ca3af' },
  { id: '25', status: 'in_progress', progress: 25, defaultColor: '#14b8a6' },
  { id: '50', status: 'in_progress', progress: 50, defaultColor: '#a855f7' },
  { id: '75', status: 'in_progress', progress: 75, defaultColor: '#f97316' },
  { id: '100', status: 'done', progress: 100, defaultColor: '#22c55e' }
]

const actionOptions = [
  { label: 'Create task', value: 'create-task' },
  { label: 'Add comment', value: 'add-comment' },
  { label: 'Send to agent', value: 'send-agent' },
  { label: 'Send to skill', value: 'send-skill' }
]
const FIELD_KEY_DUPLICATE_SEPARATOR = '__'

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
    options: []
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
    options: [],
    defaultValue: ''
  },
  {
    key: 'assignee',
    label: 'Assignee',
    type: 'select',
    rightLabel: 'User',
    placeholder: 'Select assignee',
    options: []
  },
  {
    key: 'subscribers',
    label: 'Subscribers',
    type: 'multiselect',
    rightLabel: 'User',
    placeholder: 'Select subscribers',
    options: []
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
    options: []
  }
]

function createField(key) {
  const property = propertyCatalog.find((item) => item.key === key)
  if (!property) return null
  const options = getFieldOptions(key, property.options || [])
  let defaultValue = property.defaultValue ?? (property.type === 'multiselect' ? [] : '')
  if (key === 'status') {
    defaultValue = options[0]?.value || ''
  }
  if (key === 'assignee' || key === 'supervisor') {
    defaultValue = null
  }
  if (key === 'subscribers') {
    defaultValue = []
  }
  return {
    id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: property.key,
    label: property.label,
    type: property.type,
    rightLabel: property.rightLabel,
    placeholder: property.placeholder,
    options,
    locked: Boolean(property.locked),
    required: false,
    visible: true,
    value: defaultValue
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  const isJsonObject = trimmed.startsWith('{') && trimmed.endsWith('}')
  const isJsonArray = trimmed.startsWith('[') && trimmed.endsWith(']')
  if (!isJsonObject && !isJsonArray) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

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
  return STATUS_PROGRESS_OPTIONS.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveStatusIconProps(icon) {
  const iconValue = normalizeStatusIconValue(icon)
  const option = STATUS_PROGRESS_OPTIONS.find((item) => item.id === iconValue) || STATUS_PROGRESS_OPTIONS[0]
  return {
    status: option.status,
    progress: option.progress,
    color: option.defaultColor
  }
}

function mapProjectColumnsToStatusOptions(columns) {
  return toArray(columns)
    .slice()
    .sort((a, b) => (Number(a?.index) || 0) - (Number(b?.index) || 0))
    .map((column) => {
      const iconProps = resolveStatusIconProps(column?.icon)
      return {
        label: column?.name || 'Status',
        value: column?.id || column?.name,
        ...iconProps
      }
    })
    .filter((option) => option.value)
}

function normalizeOption(option) {
  if (option === null || option === undefined) return null
  if (typeof option !== 'object') {
    return {
      label: String(option),
      value: option
    }
  }
  if (Array.isArray(option)) return null
  const nextValue = option.value ?? option.id ?? option.key ?? option.slug ?? option.name ?? option.label
  if (nextValue === null || nextValue === undefined || nextValue === '') return null
  return {
    ...option,
    label: option.label ?? option.name ?? option.email ?? String(nextValue),
    value: nextValue
  }
}

function mergeOptionsByValue(...optionGroups) {
  const merged = new Map()
  optionGroups
    .flatMap((group) => toArray(group))
    .forEach((item) => {
      const option = normalizeOption(item)
      if (!option) return
      const key = String(option.value)
      if (!merged.has(key)) {
        merged.set(key, option)
        return
      }
      merged.set(key, {
        ...merged.get(key),
        ...option,
        value: merged.get(key).value
      })
    })
  return Array.from(merged.values())
}

function extractOptionValue(entry) {
  const parsed = parseMaybeJson(entry)
  const option = normalizeOption(parsed)
  if (option) return option.value
  return parsed
}

function normalizeSingleOptionValue(value) {
  const parsed = parseMaybeJson(value)
  const option = normalizeOption(parsed)
  if (option) return option.value
  if (parsed === null || parsed === undefined) return ''
  return parsed
}

function normalizeMultiOptionValues(value) {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => extractOptionValue(entry))
      .filter((entry) => entry !== null && entry !== undefined && entry !== '')
  }
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    if (!trimmed) return []
    return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean)
  }
  if (parsed === null || parsed === undefined || parsed === '') return []
  const single = extractOptionValue(parsed)
  if (single === null || single === undefined || single === '') return []
  return [single]
}

function normalizeUserSelectionValue(value) {
  const parsed = parseMaybeJson(value)
  if (parsed === null || parsed === undefined || parsed === '') return null

  if (typeof parsed === 'string' || typeof parsed === 'number') {
    const resolved = resolveUserById(parsed)
    if (resolved) return resolved
    const fallback = String(parsed)
    return {
      id: fallback,
      name: fallback,
      email: '',
      initials: fallback.charAt(0),
      avatarUrl: ''
    }
  }

  if (typeof parsed === 'object' && !Array.isArray(parsed)) {
    const normalized = normalizeOption(parsed)
    if (!normalized) return null
    const resolved = resolveUserById(normalized.value)
    if (resolved) return resolved
    const displayName = parsed.name || normalized.label || parsed.email || String(normalized.value)
    return {
      id: normalized.value,
      name: displayName,
      email: parsed.email || '',
      initials: parsed.initials || displayName.charAt(0),
      avatarUrl: parsed.avatarUrl || parsed.avatar || ''
    }
  }

  return null
}

function extractSelectedOptionsFromValue(fieldKey, value) {
  const parsed = parseMaybeJson(value)
  if (fieldKey === 'tags' || fieldKey === 'status') {
    const option = normalizeOption(parsed)
    return option ? [option] : []
  }
  if (fieldKey === 'subscribers') {
    const entries = Array.isArray(parsed) ? parsed : [parsed]
    return entries.map((entry) => normalizeOption(parseMaybeJson(entry))).filter(Boolean)
  }
  return []
}

function getFieldOptions(fieldKey, fallbackOptions = [], selectedOptions = []) {
  if (fieldKey === 'status') {
    return mergeOptionsByValue(selectedOptions, projectStatusOptions.value, fallbackOptions)
  }
  if (fieldKey === 'tags') {
    return mergeOptionsByValue(selectedOptions, getProjectTagOptions(), fallbackOptions)
  }
  if (fieldKey === 'subscribers') {
    return mergeOptionsByValue(selectedOptions, getUserOptions(), fallbackOptions)
  }
  return mergeOptionsByValue(selectedOptions, fallbackOptions)
}

function toApiOptionObject(value, options = []) {
  const normalizedValue = extractOptionValue(value)
  if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') return null
  const fromOptions = mergeOptionsByValue(options).find((option) => String(option.value) === String(normalizedValue))
  if (fromOptions) return fromOptions
  const normalized = normalizeOption(value)
  if (normalized) return normalized
  return {
    label: String(normalizedValue),
    value: normalizedValue
  }
}

function unwrapResponseData(response) {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data
  }
  return response
}

function getObjectList(response) {
  const source = unwrapResponseData(response)
  if (Array.isArray(source)) return source
  if (Array.isArray(source?.data)) return source.data
  if (Array.isArray(source?.items)) return source.items
  if (Array.isArray(source?.forms)) return source.forms
  if (source?.form && typeof source.form === 'object') return [source.form]
  if (source?.projectForm && typeof source.projectForm === 'object') return [source.projectForm]
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

function resolveFieldKeyFromApi(rawKey, fallback = '') {
  const normalizedKey = String(rawKey || '').trim()
  if (!normalizedKey) return fallback
  if (normalizedKey === 'name' || normalizedKey === 'title') return 'title'

  const hasCatalogMatch = propertyCatalog.some((item) => item.key === normalizedKey)
  if (hasCatalogMatch) return normalizedKey

  const normalizedCandidates = [
    normalizedKey.replace(/__\d+$/, ''),
    normalizedKey.replace(/_\d+$/, ''),
    normalizedKey.replace(/-\d+$/, '')
  ]

  const matched = normalizedCandidates.find((candidate) =>
    propertyCatalog.some((item) => item.key === candidate)
  )

  return matched || normalizedKey
}

function resolveFieldBaseKey(field) {
  return resolveFieldKeyFromApi(field?.key || '', field?.key || '')
}

function createUniqueApiFieldKey(field, countsByBaseKey) {
  const baseKey = resolveFieldBaseKey(field)
  if (baseKey === 'title') return 'name'

  const currentCount = countsByBaseKey.get(baseKey) || 0
  const nextCount = currentCount + 1
  countsByBaseKey.set(baseKey, nextCount)

  if (nextCount === 1) return baseKey
  return `${baseKey}${FIELD_KEY_DUPLICATE_SEPARATOR}${nextCount}`
}

function normalizeFieldValue(type, value) {
  if (type === 'multiselect') {
    return normalizeMultiOptionValues(value)
  }
  return value ?? ''
}

function getProjectIdFromForm(form) {
  return form?.projectId || form?.project?.id || form?.project?.projectId || ''
}

function getPersistedFormId(form) {
  return form?.id || form?.formId || form?.slug || null
}

function normalizeDefaultValueForApi(field) {
  const rawValue = field?.value

  if (field?.key === 'assignee' || field?.key === 'supervisor') {
    const selectedUser = normalizeUserSelectionValue(rawValue)
    if (!selectedUser) return ''
    return JSON.stringify({
      id: selectedUser.id,
      value: selectedUser.id,
      label: selectedUser.name || selectedUser.email || String(selectedUser.id),
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      initials: selectedUser.initials || '',
      avatarUrl: selectedUser.avatarUrl || ''
    })
  }

  if (field?.key === 'tags') {
    const selectedTag = toApiOptionObject(rawValue, field?.options)
    return selectedTag ? JSON.stringify(selectedTag) : ''
  }

  if (field?.key === 'status') {
    const selectedStatus = toApiOptionObject(rawValue, field?.options)
    return selectedStatus ? JSON.stringify(selectedStatus) : ''
  }

  if (field?.key === 'subscribers') {
    const selectedValues = normalizeMultiOptionValues(rawValue)
    const selectedUsers = selectedValues
      .map((entry) => toApiOptionObject(entry, field?.options))
      .filter(Boolean)
    return selectedUsers.length > 0 ? JSON.stringify(selectedUsers) : ''
  }

  if (Array.isArray(rawValue)) {
    const hasObjectEntry = rawValue.some((entry) => entry && typeof entry === 'object')
    if (hasObjectEntry) {
      return JSON.stringify(rawValue)
    }
    return rawValue
      .map((entry) => {
        if (entry === null || entry === undefined) return ''
        if (typeof entry === 'object') return String(entry.value ?? entry.id ?? entry.label ?? '')
        return String(entry)
      })
      .filter(Boolean)
      .join(',')
  }

  if (rawValue === null || rawValue === undefined) return ''
  if (typeof rawValue === 'object') return JSON.stringify(rawValue)
  return String(rawValue)
}

/**
 * Resolve a user ID to a user object from the userStore.
 */
function resolveUserById(userId) {
  if (!userId) return null
  const id = String(userId)
  const user = userStore.users.find(u => String(u.id) === id)
  if (!user) return null
  return {
    id: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name,
    email: user.email || '',
    initials: (user.firstName || user.name || '?').charAt(0),
    avatarUrl: user.avatar
  }
}

function getUserOptions() {
  return userStore.users.map((user) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name || String(user.id)
    return {
      id: user.id,
      value: user.id,
      label: name,
      name,
      email: user.email || '',
      initials: (user.firstName || user.name || name || '?').charAt(0),
      avatarUrl: user.avatar || ''
    }
  })
}

/**
 * Get the current project tags as select options.
 */
function getProjectTagOptions() {
  const pid = projectId.value
  if (!pid) return []
  const tags = projectStore.projectTags[pid] || []
  return tags.map(tag => ({
    label: tag.name,
    value: tag.name,
    color: tag.color
  }))
}

function buildFieldFromApi(rawField, index = 0) {
  const rawKey = rawField?.key || rawField?.slug || rawField?.fieldKey || `field-${index + 1}`
  const key = resolveFieldKeyFromApi(rawKey, `field-${index + 1}`)
  const catalogField = propertyCatalog.find((item) => item.key === key)
  const type = rawField?.type || catalogField?.type || 'text'
  const rawValue = rawField?.value === undefined ? rawField?.defaultValue : rawField?.value
  const parsedValue = parseMaybeJson(rawValue)
  const selectedOptions = extractSelectedOptionsFromValue(key, parsedValue)

  const optionsFromApi = toArray(rawField?.options)
  const options = getFieldOptions(
    key,
    optionsFromApi.length > 0 ? optionsFromApi : (catalogField?.options || []),
    selectedOptions
  )

  let value = normalizeFieldValue(type, parsedValue)
  if (key === 'assignee' || key === 'supervisor') {
    value = normalizeUserSelectionValue(parsedValue)
  } else if (key === 'tags' || key === 'status') {
    value = normalizeSingleOptionValue(parsedValue)
  } else if (key === 'subscribers') {
    value = normalizeMultiOptionValues(parsedValue)
  }

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

function getStatusOption(value, options = projectStatusOptions.value) {
  return toArray(options).find((option) => String(option?.value) === String(value))
}

function createTitleField() {
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

function createDefaultFields() {
  return [createTitleField()]
}

const formState = ref({
  name: DEFAULT_FORM_NAME,
  description: '',
  access: 'private',
  boardId: '',
  actionId: 'create-task'
})
const formFields = ref(createDefaultFields())
const savedSnapshot = ref('')

const boardOptions = computed(() => {
  if (!projectId.value) return []
  const items = projectStore.getProjectItems(projectId.value) || []
  const mapped = items.map((item) => ({
    label: item?.name || item?.slug || 'Board',
    value: item?.id
  })).filter((item) => item.value)
  return mapped
})

function getDefaultBoardId() {
  return boardOptions.value[0]?.value || ''
}

function resolveProjectItemId() {
  const current = formState.value.boardId
  if (current && boardOptions.value.some((option) => String(option.value) === String(current))) {
    return current
  }
  return getDefaultBoardId()
}

const privateLink = computed(() => {
  const pid = projectId.value
  if (!pid) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://desidia.app'
  return `${origin}/forms?project_id=${encodeURIComponent(pid)}`
})

const availableProperties = computed(() => {
  const keyword = propertySearch.value.trim().toLowerCase()
  return propertyCatalog.filter((property) => {
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
    description: formState.value.description?.trim() || '',
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
    name: DEFAULT_FORM_NAME,
    description: '',
    access: 'private',
    boardId: getDefaultBoardId(),
    actionId: actionOptions[0].value
  }
  formFields.value = createDefaultFields()
  propertySearch.value = ''
  savedSnapshot.value = createSnapshot()
}

function applyApiForm(form) {
  loadedFormId.value = getPersistedFormId(form)

  const nextBoardId = form?.boardId || form?.projectItemId || form?.board?.id || getDefaultBoardId()
  const nextActionId = normalizeActionId(form?.actionId || form?.action || form?.actionType)
  formState.value = {
    name: form?.name || form?.title || DEFAULT_FORM_NAME,
    description: form?.description || '',
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

async function resolveExistingFormId() {
  if (!projectId.value) return null
  const response = await projectApi.getProjectForms({ projectId: projectId.value })
  const forms = getObjectList(response)
    .filter((item) => String(getProjectIdFromForm(item)) === String(projectId.value))
    .sort((a, b) => {
      const ia = Number(a?.index ?? 0)
      const ib = Number(b?.index ?? 0)
      return ia - ib
    })
  return getPersistedFormId(forms[0])
}

function createTitleFieldPayload() {
  return {
    key: 'name',
    label: 'Title',
    isShow: true,
    isRequired: true,
    defaultValue: ''
  }
}

async function createInitialFormWithTitleField() {
  if (!projectId.value) return null
  const name = formState.value.name?.trim() || DEFAULT_FORM_NAME
  const data = {
    projectId: projectId.value,
    name,
    description: formState.value.description?.trim() || name,
    isPrivate: true,
    action: 'create',
    customFields: [createTitleFieldPayload()]
  }
  const projectItemId = resolveProjectItemId()
  if (projectItemId) {
    data.projectItemId = projectItemId
  }

  const response = await projectApi.createProjectForm(data)
  const responseData = unwrapResponseData(response)
  return responseData?.saved || responseData?.form || responseData?.projectForm || responseData
}

async function loadFormFromApi() {
  if (!projectId.value) {
    projectStatusOptions.value = []
    resetToDefault()
    return
  }

  const token = ++loadToken
  isLoading.value = true
  try {
    const [, , , columns] = await Promise.all([
      projectStore.fetchProjectItems(projectId.value),
      projectStore.fetchProjectTags(projectId.value),
      userStore.users.length === 0 ? userStore.fetchUsers({ limit: 50 }) : Promise.resolve(),
      projectStore.fetchProjectColumns(projectId.value).catch(() => [])
    ])
    projectStatusOptions.value = mapProjectColumnsToStatusOptions(columns)
    const response = await projectApi.getProjectForms({ projectId: projectId.value })
    if (token !== loadToken) return

    const forms = getObjectList(response)
      .filter((item) => String(getProjectIdFromForm(item)) === String(projectId.value))
      .sort((a, b) => {
        const ia = Number(a?.index ?? 0)
        const ib = Number(b?.index ?? 0)
        return ia - ib
      })
    const selected = forms[0]

    if (selected) {
      applyApiForm(selected)
    } else {
      const created = await createInitialFormWithTitleField()
      if (token !== loadToken) return
      if (created) {
        applyApiForm(created)
      } else {
        resetToDefault()
      }
    }
  } catch (error) {
    if (token !== loadToken) return
    projectStatusOptions.value = []
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
    const fieldKeyCounts = new Map()
    const data = {
      projectId: projectId.value,
      name: formState.value.name.trim(),
      description: formState.value.description?.trim() || formState.value.name.trim(),
      isPrivate: toApiIsPrivate(formState.value.access),
      action: toApiAction(formState.value.actionId),
      customFields: formFields.value.map((field) => {
        return {
          key: createUniqueApiFieldKey(field, fieldKeyCounts),
          label: field.label,
          isShow: Boolean(field.visible),
          isRequired: Boolean(field.required),
          defaultValue: normalizeDefaultValueForApi(field)
        }
      })
    }
    const projectItemId = resolveProjectItemId()
    if (projectItemId) {
      data.projectItemId = projectItemId
    }

    let response
    let targetFormId = loadedFormId.value
    if (!targetFormId) {
      targetFormId = await resolveExistingFormId()
      if (targetFormId) {
        loadedFormId.value = targetFormId
      }
    }

    if (targetFormId) {
      response = await projectApi.updateProjectForm(targetFormId, data)
    } else {
      response = await projectApi.createProjectForm(data)
    }

    const responseData = unwrapResponseData(response)
    const returned = responseData?.saved || responseData?.form || responseData?.projectForm || responseData
    const returnedFormId = getPersistedFormId(returned)
    if (returnedFormId) {
      loadedFormId.value = returnedFormId
    }
    if (typeof returned?.description === 'string') {
      formState.value.description = returned.description
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

watch(projectStatusOptions, () => {
  formFields.value.forEach((field) => {
    if (field.key !== 'status') return
    const selectedOptions = extractSelectedOptionsFromValue('status', field.value)
    field.options = getFieldOptions('status', field.options, selectedOptions)
    field.value = normalizeSingleOptionValue(field.value)
    if (!field.value && field.options.length > 0) {
      field.value = field.options[0].value
    }
  })
}, { deep: true, immediate: true })

// Keep tags field options in sync with project tags
watch(() => projectStore.projectTags[projectId.value], () => {
  formFields.value.forEach(field => {
    if (field.key === 'tags') {
      const selectedOptions = extractSelectedOptionsFromValue('tags', field.value)
      field.options = getFieldOptions('tags', field.options, selectedOptions)
      field.value = normalizeSingleOptionValue(field.value)
    }
  })
}, { deep: true })

watch(() => userStore.users, () => {
  const userOptions = getUserOptions()
  formFields.value.forEach((field) => {
    if (field.key === 'subscribers') {
      const selectedOptions = extractSelectedOptionsFromValue('subscribers', field.value)
      field.options = mergeOptionsByValue(selectedOptions, userOptions, field.options)
      field.value = normalizeMultiOptionValues(field.value)
    }

    if (field.key === 'assignee' || field.key === 'supervisor') {
      if (
        typeof field.value === 'string' ||
        typeof field.value === 'number' ||
        (field.value && typeof field.value === 'object' && !field.value.name)
      ) {
        field.value = normalizeUserSelectionValue(field.value)
      }
    }
  })
}, { deep: true, immediate: true })

watch([canSave, isSaving, hasPendingChanges], () => {
  emit('update:canSave', canSave.value)
  emit('update:isSaving', isSaving.value)
  emit('update:hasPendingChanges', hasPendingChanges.value)
}, { immediate: true })

defineExpose({ saveChanges, pendingChanges: hasPendingChanges })
</script>

<template>
  <div class="settings-form-shell">
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
              <div v-if="field.key !== 'attachments'" class="settings-form-field-row">
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
                          class="settings-form-avatar flex-shrink-0"
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
                            :status="getStatusOption(field.value, field.options)?.status || 'todo'" 
                            :progress="getStatusOption(field.value, field.options)?.progress || 0"
                            :color="getStatusOption(field.value, field.options)?.color || '#9ca3af'"
                            size="sm"
                         />
                        <span class="truncate text-xs">{{ getStatusOption(field.value, field.options)?.label || field.value }}</span>
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
                <UserMultiSearchDropdown
                  v-else-if="field.key === 'subscribers'"
                  v-model="field.value"
                  :multiple="true"
                  :projectId="projectId"
                  :options="field.options"
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

.settings-form-shell {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-form {
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  padding-bottom: 20px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
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

/* Avatar in assignee/supervisor trigger – keep it small */
.settings-form-avatar {
  width: 18px !important;
  height: 18px !important;
  min-width: 18px;
  font-size: 9px !important;
  background-color: var(--p-primary-100, #dbeafe);
  color: var(--p-primary-700, #1d4ed8);
  font-weight: 600;
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
