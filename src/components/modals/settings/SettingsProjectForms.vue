<script setup>
/**
 * SettingsProjectForms - Project form builder settings (dummy data).
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import FormInput from '@/components/ui/FormInput.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { Link2, MoreHorizontal, Plus, Lock } from 'lucide-vue-next'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)
const addPropertyMenuRef = ref(null)
const addPropertyInlineMenuRef = ref(null)
const propertySearch = ref('')

const boardOptions = [
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
      { label: 'Backlog', value: 'backlog' },
      { label: 'In Progress', value: 'in-progress' },
      { label: 'Done', value: 'done' }
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
    value: property.defaultValue ?? (property.type === 'multiselect' ? [] : '')
  }
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
        value: ''
      }
    }
    return createField(key)
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

const canSave = computed(() => hasPendingChanges.value && !isSaving.value)

function createSnapshot() {
  return JSON.stringify({
    name: formState.value.name.trim(),
    access: formState.value.access,
    boardId: formState.value.boardId,
    actionId: formState.value.actionId,
    fields: formFields.value.map((field) => ({
      key: field.key,
      value: field.value
    }))
  })
}

function resetToDefault() {
  formState.value = {
    name: 'Default - Create task',
    access: 'private',
    boardId: boardOptions[0].value,
    actionId: actionOptions[0].value
  }
  formFields.value = createDefaultFields()
  propertySearch.value = ''
  savedSnapshot.value = createSnapshot()
}

function addPropertyField(propertyKey) {
  const field = createField(propertyKey)
  if (!field) return
  formFields.value.push(field)
  propertySearch.value = ''
  addPropertyMenuRef.value?.close?.()
  addPropertyInlineMenuRef.value?.close?.()
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
  if (!hasPendingChanges.value || isSaving.value) return
  isSaving.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    savedSnapshot.value = createSnapshot()
    uiStore.showSuccess(t('settings.project.forms.messages.saved', 'Form settings saved'))
  } finally {
    isSaving.value = false
  }
}

watch(projectId, () => {
  resetToDefault()
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
                <div class="settings-form-property-list">
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

        <div class="settings-form-fields-list">
          <div v-for="field in formFields" :key="field.id" class="settings-form-field-card">
            <div class="settings-form-field-card-head">
              <div class="settings-form-field-card-label">
                {{ field.label }}
                <span v-if="field.required" class="text-red-500">*</span>
              </div>
              <div class="settings-form-field-card-meta">
                <span>{{ field.rightLabel }}</span>
                <Lock v-if="field.locked" class="w-3.5 h-3.5" />
              </div>
            </div>
            <div class="settings-form-field-card-body">
              <FormInput
                v-if="field.type === 'text'"
                v-model="field.value"
                :id="`form-field-${field.id}`"
                class="w-full"
                :placeholder="field.placeholder"
              />
              <FormInput
                v-else-if="field.type === 'textarea'"
                v-model="field.value"
                :id="`form-field-${field.id}`"
                as="textarea"
                rows="2"
                class="w-full"
                :placeholder="field.placeholder"
              />
              <FormInput
                v-else-if="field.type === 'multiselect'"
                v-model="field.value"
                :id="`form-field-${field.id}`"
                as="multiselect"
                :options="field.options"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :placeholder="field.placeholder"
              />
              <FormInput
                v-else
                v-model="field.value"
                :id="`form-field-${field.id}`"
                as="select"
                :options="field.options"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :placeholder="field.placeholder"
              />
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
              <div class="settings-form-property-list">
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
  font-weight: 600;
  color: #6b7280;
}

.settings-project-empty-text {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}

.settings-form {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
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
  font-weight: 600;
  color: #111827;
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
  color: #6b7280;
  cursor: pointer;
}

.settings-form-icon-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
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
  font-weight: 600;
  color: #111827;
}

.settings-form-access-text {
  font-size: 12px;
  line-height: 1.4;
  color: #9ca3af;
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
  font-weight: 600;
  color: #374151;
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
  color: #9ca3af;
}

.settings-form-add-icon:hover {
  background: #f3f4f6;
  color: #6b7280;
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

.settings-form-field-card-label {
  font-size: 12px; /* Reduced from 13px */
  font-weight: 600;
  color: #374151;
}

.settings-form-field-card-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px; /* Reduced from 14px */
  color: #9ca3af;
}

.settings-form-field-card-body :deep(.p-select),
.settings-form-field-card-body :deep(.p-multiselect),
.settings-form-field-card-body :deep(.p-inputtext),
.settings-form-field-card-body :deep(.p-textarea) {
  width: 100%;
}

/* Ensure inputs inside the card are smaller */
.settings-form-field-card-body :deep(.p-inputtext),
.settings-form-field-card-body :deep(.p-textarea),
.settings-form-field-card-body :deep(.p-select-label),
.settings-form-field-card-body :deep(.p-multiselect-label) {
  font-size: 13px !important;
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
  color: #4b5563;
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
  border-bottom: 1px solid #e5e7eb;
  background: transparent;
  padding: 10px 12px;
  font-size: 14px;
  color: #6b7280;
}

.settings-form-property-search:focus {
  outline: none;
}

.settings-form-property-list {
  max-height: 220px;
  overflow: auto;
  padding: 6px 0;
}

.settings-form-property-item {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 14px;
  color: #374151;
}

.settings-form-property-item:hover {
  background: #e5e6ec;
}

.settings-form-property-empty {
  padding: 10px 12px;
  font-size: 12px;
  color: #9ca3af;
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
