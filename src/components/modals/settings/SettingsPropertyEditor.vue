<script setup>
/**
 * SettingsPropertyEditor - Generic project property editor
 *
 * Uses exactly the same CSS class names and component patterns as
 * SettingsCustomFields.vue for visual consistency.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useProjectPropertyStore, useUIStore, useUserStore } from '@/stores'
import { useConfirm } from 'primevue/useconfirm'
import { Plus, GripVertical, Pencil, Trash, Trash2, X, Check } from 'lucide-vue-next'
import { VueDraggableNext } from 'vue-draggable-next'
import ToggleSwitch from 'primevue/toggleswitch'
import FormInput from '@/components/ui/FormInput.vue'
import UserMultiSearchDropdown from '@/components/user/UserMultiSearchDropdown.vue'
import { getColumnDefinition } from '@/components/task/projectTasksGrid/taskColumnDefinitions'

const { t } = useI18n()
const projectStore = useProjectStore()
const propertyStore = useProjectPropertyStore()
const uiStore = useUIStore()
const userStore = useUserStore()
const confirm = useConfirm()

const props = defineProps({
  propertyKey: { type: String, required: true }
})

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)

// ─── Property data ──────────────────────────────────────
const property = computed(() => {
  if (!projectId.value) return null
  return propertyStore.getPropertyByKey(projectId.value, props.propertyKey)
})

// Map property key → column def id for icon lookup
const propertyKeyToColumnId = {
  status: 'status', assignee: 'assignee', priority: 'priority',
  due_date: 'dueDate', tags: 'tags', size: 'size',
  time_tracking: 'trackingTime', created: 'createdAt',
  created_by: 'createdBy', last_updated: 'updatedAt',
  last_updated_by: 'updatedBy', timezone: 'timezone'
}

const typeIcon = computed(() => {
  const colId = propertyKeyToColumnId[props.propertyKey]
  if (colId) {
    const colDef = getColumnDefinition(colId)
    if (colDef?.icon) return colDef.icon
  }
  return null
})

const typeLabel = computed(() => {
  const type = property.value?.type
  if (!type) return ''
  const labels = {
    select: 'Select', multiselect: 'Multiselect', user: 'User',
    date: 'Date', text: 'Text', number: 'Number',
    checkbox: 'Checkbox', boolean: 'Checkbox'
  }
  return labels[type] || type
})

// Editable local state
const editLabel = ref('')
const editDescription = ref('')
const editIsRequired = ref(false)
const editIsVisible = ref(true)
const editOptions = ref([])
const editDefaultValue = ref(null)

// Original snapshot for dirty check
const originalSnapshot = ref('')

function createSnapshot() {
  return JSON.stringify({
    label: editLabel.value,
    description: editDescription.value,
    isRequired: editIsRequired.value,
    isVisible: editIsVisible.value,
    options: editOptions.value,
    defaultValue: editDefaultValue.value
  })
}

const hasPendingChanges = computed(() => {
  if (!projectId.value || !property.value) return false
  return createSnapshot() !== originalSnapshot.value
})

// ─── Load property into local state ─────────────────────
function loadProperty() {
  const prop = property.value
  if (!prop) return
  editLabel.value = prop.label || ''
  editDescription.value = prop.description || ''
  editIsRequired.value = !!prop.isRequired
  editIsVisible.value = prop.isVisible !== false
  editDefaultValue.value = prop.settings?.defaultValue ?? null

  const rawOptions = prop.settings?.options || []
  editOptions.value = rawOptions.map((opt, i) => {
    if (typeof opt === 'string') {
      return { id: `opt-${i}`, value: opt, color: '' }
    }
    return { id: opt.id || `opt-${i}`, value: opt.value || '', color: opt.color || '' }
  })

  originalSnapshot.value = createSnapshot()
}

watch(() => [projectId.value, props.propertyKey], () => {
  if (projectId.value) {
    propertyStore.fetchProperties(projectId.value).then(loadProperty)
  }
}, { immediate: true })

watch(property, loadProperty)

// ─── Options editing (select / multiselect) ─────────────
const editingOptionId = ref(null)
const tempOptionValue = ref('')

const dragOptions = {
  animation: 200,
  group: 'property-options',
  disabled: false,
  ghostClass: 'ghost',
  handle: '.drag-handle'
}

function addOption() {
  const newId = `opt-${Date.now()}`
  editOptions.value.push({ id: newId, value: `Option ${editOptions.value.length + 1}`, color: '' })
  startEditOption(newId)
}

function removeOption(optId) {
  editOptions.value = editOptions.value.filter(o => o.id !== optId)
}

function startEditOption(optId) {
  const opt = editOptions.value.find(o => o.id === optId)
  if (!opt) return
  editingOptionId.value = optId
  tempOptionValue.value = opt.value
}

function cancelEditOption() {
  editingOptionId.value = null
  tempOptionValue.value = ''
}

function saveEditOption() {
  if (!editingOptionId.value) return
  const opt = editOptions.value.find(o => o.id === editingOptionId.value)
  if (opt) {
    opt.value = tempOptionValue.value.trim() || opt.value
  }
  editingOptionId.value = null
  tempOptionValue.value = ''
}

// ─── Type checks ────────────────────────────────────────
const isSelectType = computed(() => {
  const type = property.value?.type
  return type === 'select' || type === 'multiselect'
})

const isUserType = computed(() => property.value?.type === 'user')
const isDateType = computed(() => property.value?.type === 'date')
const isCheckboxType = computed(() => {
  const type = property.value?.type
  return type === 'checkbox' || type === 'boolean'
})

const isSystem = computed(() => !!property.value?.isSystem)

const isNameEmpty = computed(() => {
  const name = editLabel.value?.trim()
  return !name || name.length === 0
})

// ─── Save ───────────────────────────────────────────────
async function saveChanges() {
  const prop = property.value
  if (!prop?.id || !projectId.value) return
  isSaving.value = true
  try {
    const settings = { ...(prop.settings || {}) }

    if (isSelectType.value) {
      settings.options = editOptions.value.map(opt => ({
        value: opt.value,
        ...(opt.color ? { color: opt.color } : {})
      }))
    }

    if (editDefaultValue.value !== null && editDefaultValue.value !== undefined) {
      settings.defaultValue = editDefaultValue.value
    }

    await propertyStore.updateProperty(prop.id, {
      label: editLabel.value,
      description: editDescription.value,
      isRequired: editIsRequired.value,
      isVisible: editIsVisible.value,
      settings
    }, projectId.value)

    await propertyStore.fetchProperties(projectId.value, { force: true })
    originalSnapshot.value = createSnapshot()
    uiStore.showSuccess(t('settings.project.properties.saved', 'Property saved'))
  } catch (error) {
    uiStore.showApiError(error, t('settings.project.properties.saveError', 'Failed to save property'))
  } finally {
    isSaving.value = false
  }
}

// ─── Delete ─────────────────────────────────────────────
function handleDelete() {
  const prop = property.value
  if (!prop?.id || !projectId.value) return
  confirm.require({
    dialogType: 'delete',
    header: t('settings.project.properties.deleteTitle', { label: prop.label || 'Property' }),
    message: t('settings.project.properties.deleteConfirm', 'Are you sure you want to delete this property? This cannot be undone.'),
    accept: async () => {
      try {
        await propertyStore.deleteProperty(prop.id, projectId.value)
        uiStore.showSuccess(t('settings.project.properties.deleted', 'Property deleted'))
      } catch (error) {
        uiStore.showApiError(error, t('settings.project.properties.deleteError', 'Failed to delete property'))
      }
    }
  })
}

// ─── Sync save state to hub ─────────────────────────────
const isOptionEditing = computed(() => Boolean(editingOptionId.value))

watch([hasPendingChanges, isSaving, isOptionEditing], () => {
  emit('update:hasPendingChanges', hasPendingChanges.value)
  emit('update:isSaving', isSaving.value)
  emit('update:canSave', hasPendingChanges.value && !isSaving.value && !isOptionEditing.value && !isNameEmpty.value)
}, { immediate: true })

watch(isUserType, (val) => {
  if (val && userStore.users.length === 0) {
    userStore.fetchUsers({ limit: 50 })
  }
}, { immediate: true })

defineExpose({ saveChanges })
</script>

<template>
  <!-- No project selected -->
  <div v-if="!projectId" class="settings-project-empty">
    <div class="settings-project-empty-title">{{ t('settings.project.empty.title') }}</div>
    <p class="settings-project-empty-text">{{ t('settings.project.empty.description') }}</p>
  </div>

  <!-- Loading -->
  <div v-else-if="!property" class="settings-project-empty">
    <div class="settings-project-empty-title">{{ t('common.loading', 'Loading...') }}</div>
  </div>

  <!-- Main editor (same structure as SettingsCustomFields) -->
  <div v-else class="settings-editor-content">
    <!-- Header: Title + Delete -->
    <div class="settings-editor-header">
      <div class="settings-editor-title">{{ t('settings.project.properties.editProperty', 'Edit property') }}</div>
      <button
        v-if="!isSystem"
        type="button"
        class="settings-delete cursor-pointer"
        @click="handleDelete()"
        :title="t('settings.project.properties.deleteProperty', 'Delete property')"
      >
        <Trash class="w-4 h-4 text-red-500" />
      </button>
    </div>

    <!-- ═══ General Section ═══ -->
    <div class="settings-editor-section">
      <div class="settings-editor-section-title">{{ t('settings.project.properties.general', 'General') }}</div>

      <!-- Type display -->
      <div class="settings-editor-row">
        <span class="settings-label">{{ t('settings.project.properties.type', 'Type') }}</span>
        <div class="settings-type-pill">
          <component :is="typeIcon" v-if="typeIcon" class="w-4 h-4" />
          <span>{{ typeLabel }}</span>
        </div>
      </div>

      <!-- Name/Label -->
      <div class="settings-editor-field">
        <FormInput
          v-model="editLabel"
          :label="t('settings.project.properties.nameLabel', 'Name/Label')"
          labelClass="settings-label"
          :placeholder="t('settings.project.properties.labelPlaceholder', 'Property name')"
          class="w-full"
          :class="{ 'has-error': isNameEmpty }"
        />
        <span v-if="isNameEmpty" class="settings-error-text">
          {{ t('settings.project.properties.nameRequired', 'Name is required') }}
        </span>
      </div>

      <!-- Description -->
      <div class="settings-editor-field">
        <FormInput
          v-model="editDescription"
          as="textarea"
          :label="t('settings.project.properties.description', 'Description')"
          labelClass="settings-label"
          :placeholder="t('settings.project.properties.descriptionPlaceholder', 'Add a description...')"
          class="w-full"
        />
      </div>
    </div>

    <!-- ═══ Settings Section ═══ -->
    <div class="settings-editor-section mt-6">
      <div class="settings-editor-section-title">{{ t('settings.project.properties.settings', 'Settings') }}</div>

      <!-- Show toggle -->
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-title">{{ t('settings.project.properties.show', 'Show') }}</div>
          <div class="settings-toggle-subtitle">{{ t('settings.project.properties.showDesc', 'Show this field on task details and forms by default. Hidden fields remain visible to admins.') }}</div>
        </div>
        <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="editIsVisible" />
      </div>

      <!-- Required toggle -->
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-title">{{ t('settings.project.properties.required', 'Required') }}</div>
          <div class="settings-toggle-subtitle">{{ t('settings.project.properties.requiredDesc', 'Make this field mandatory when creating or editing tasks.') }}</div>
        </div>
        <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="editIsRequired" />
      </div>

      <!-- User type: Allow multiple + Display name -->
      <template v-if="isUserType">
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-title">{{ t('settings.project.properties.allowMultiple', 'Allow multiple') }}</div>
            <div class="settings-toggle-subtitle">{{ t('settings.project.properties.allowMultipleDesc', 'Enable this to assign multiple users to this field.') }}</div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" :modelValue="property?.settings?.isAllowMultiple || false" @update:modelValue="() => {}" />
        </div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-title">{{ t('settings.project.properties.displayName', 'Display name') }}</div>
            <div class="settings-toggle-subtitle">{{ t('settings.project.properties.displayNameDesc', "Enable this to always show the user's name rather than just their avatar.") }}</div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" :modelValue="property?.settings?.isDisplayName || false" @update:modelValue="() => {}" />
        </div>
      </template>

      <!-- Date type: Date range -->
      <template v-if="isDateType">
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-title">{{ t('settings.project.properties.dateRange', 'Date range') }}</div>
            <div class="settings-toggle-subtitle">{{ t('settings.project.properties.dateRangeDesc', 'Allow selecting a start and end date.') }}</div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" :modelValue="property?.settings?.isDateRange || false" @update:modelValue="() => {}" />
        </div>
      </template>

      <!-- Checkbox type: Default checked -->
      <template v-if="isCheckboxType">
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-title">{{ t('settings.project.properties.defaultChecked', 'Default checked') }}</div>
            <div class="settings-toggle-subtitle">{{ t('settings.project.properties.defaultCheckedDesc', 'New tasks will have this field checked by default.') }}</div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="editDefaultValue" />
        </div>
      </template>

      <!-- Select/Multiselect type: Options -->
      <template v-if="isSelectType">
        <div class="settings-editor-field">
          <div class="settings-option-header">
            <div class="settings-field-title">{{ t('settings.project.properties.options', 'Options') }}</div>
            <button
              type="button"
              class="settings-option-add-btn"
              :disabled="!!editingOptionId"
              @click="addOption()"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <VueDraggableNext
            v-model="editOptions"
            v-bind="dragOptions"
            :disabled="!!editingOptionId"
            class="flex flex-col gap-2"
          >
            <div
              v-for="opt in editOptions"
              :key="opt.id"
              class="status-row group"
              :class="{ 'is-editing': editingOptionId === opt.id }"
            >
              <div v-if="editingOptionId !== opt.id" class="drag-handle cursor-move text-gray-400 hover:text-gray-600 p-1">
                <GripVertical class="w-4 h-4" />
              </div>
              <div v-else class="w-6"></div>

              <template v-if="editingOptionId === opt.id">
                <input
                  v-model="tempOptionValue"
                  class="status-edit-input"
                  @keyup.enter="saveEditOption()"
                  @keyup.escape="cancelEditOption()"
                />
                <button type="button" class="text-green-600 hover:text-green-700 p-1" @click="saveEditOption()">
                  <Check class="w-4 h-4" />
                </button>
                <button type="button" class="text-gray-400 hover:text-gray-600 p-1" @click="cancelEditOption()">
                  <X class="w-4 h-4" />
                </button>
              </template>
              <template v-else>
                <span class="status-label">{{ opt.value }}</span>
                <div class="status-actions opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto">
                  <button type="button" class="text-gray-400 hover:text-gray-600 p-1" @click="startEditOption(opt.id)">
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button type="button" class="text-gray-400 hover:text-red-500 p-1" @click="removeOption(opt.id)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </template>
            </div>
          </VueDraggableNext>

          <div v-if="editOptions.length === 0" class="settings-list-empty">
            {{ t('settings.project.properties.noOptions', 'No options yet. Click + to add one.') }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ─── Exactly matching SettingsCustomFields.vue CSS ─── */

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

.settings-editor-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.settings-editor-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
}

.settings-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
}

.settings-delete:hover {
  background: #fef2f2;
}

.settings-editor-section {
  display: grid;
  gap: 20px;
}

.settings-editor-section-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.settings-editor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-editor-field {
  display: grid;
  gap: 6px;
}

.settings-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.settings-type-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
  background: #f9fafb;
}

.settings-error-text {
  font-size: 12px;
  color: #ef4444;
}

/* ─── Toggle rows (same as SettingsCustomFields) ─── */
.settings-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 10px;
}

.settings-toggle-row :deep(.p-toggleswitch) {
  transform: scale(0.7);
  transform-origin: right center;
}

.settings-toggle-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.settings-toggle-subtitle {
  font-size: 12px;
  color: var(--color-gray-400);
  font-weight: var(--font-weight-medium);
}

.settings-field-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

/* ─── Options ─── */
.settings-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.settings-option-add-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
  border-radius: 4px;
}

.settings-option-add-btn:hover {
  background: #f3f4f6;
  color: var(--color-gray-700);
}

.settings-option-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  transition: box-shadow 0.2s, transform 0.2s;
  min-height: 48px;
}

.status-row:hover {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-color: #e5e7eb;
}

.status-row.is-editing {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.status-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-edit-input {
  flex: 1;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  min-width: 0;
}

.status-edit-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
}

.ghost {
  opacity: 0.5;
  background: #edf2f7;
}

.settings-list-empty {
  padding: 12px 10px;
  font-size: 12px;
  color: var(--color-gray-400);
}

.has-error :deep(.p-inputtext),
.has-error :deep(textarea) {
  border-color: #ef4444;
}
</style>
