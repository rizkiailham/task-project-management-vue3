<script setup>
/**
 * SettingsCustomFields - Custom user fields editor.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import FormInput from '@/components/ui/FormInput.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import ToggleSwitch from 'primevue/toggleswitch'
import { CircleHelp, Plus, Type, Hash, CheckSquare, ListFilter, Calendar, User, Trash2 } from 'lucide-vue-next'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import * as customFieldApi from '@/api/customField.api'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:canSave', 'update:isSaving'])

const uiStore = useUIStore()
const { t } = useI18n()
const typeOptions = computed(() => ([
  { id: 'text', label: t('settings.customFields.types.text'), badge: t('settings.customFields.badges.text') },
  { id: 'number', label: t('settings.customFields.types.number'), badge: t('settings.customFields.badges.number') },
  { id: 'checkbox', label: t('settings.customFields.types.checkbox'), badge: t('settings.customFields.badges.boolean') },
  { id: 'select', label: t('settings.customFields.types.select'), badge: t('settings.customFields.badges.select') },
  { id: 'multiselect', label: t('settings.customFields.types.multiselect'), badge: t('settings.customFields.badges.multiselect') },
  { id: 'date', label: t('settings.customFields.types.date'), badge: t('settings.customFields.badges.date') },
  { id: 'user', label: t('settings.customFields.types.user'), badge: t('settings.customFields.badges.user') }
]))

const numberFormatOptions = computed(() => ([
  { id: 'number', label: t('settings.customFields.numberFormats.number') },
  { id: 'percentage', label: t('settings.customFields.numberFormats.percentage') },
  { id: 'currency', label: t('settings.customFields.numberFormats.currency') }
]))

const currencyOptions = [
  { id: 'NOK', label: 'NOK' },
  { id: 'IDR', label: 'IDR' },
  { id: 'USD', label: 'USD' }
]

const optionColors = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6',
  '#0ea5e9', '#14b8a6', '#eab308', '#ec4899', '#6366f1'
]

const customFields = ref([])
const selectedFieldId = ref(null)
const isLoadingFields = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteModal = ref(false)
const pendingDeleteId = ref(null)
const pendingDeleteLabel = ref('')

const listWidth = ref(280)
const isResizing = ref(false)
let resizeStartX = 0
let resizeStartWidth = 0

const selectedField = computed(() =>
  customFields.value.find((field) => field.id === selectedFieldId.value)
)

const selectedFieldName = computed({
  get: () => selectedField.value?.label || '',
  set: (value) => {
    if (selectedField.value) selectedField.value.label = value
  }
})

const selectedFieldDescription = computed({
  get: () => selectedField.value?.description || '',
  set: (value) => {
    if (selectedField.value) selectedField.value.description = value
  }
})

const selectedFieldType = computed({
  get: () => selectedField.value?.type || typeOptions.value[0].id,
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.type = value
    ensureFieldSettings(selectedField.value)
  }
})

const selectedFieldVisible = computed({
  get: () => selectedField.value?.isShow ?? true,
  set: (value) => {
    if (selectedField.value) selectedField.value.isShow = value
  }
})

const selectedFieldNumberFormat = computed({
  get: () => selectedField.value?.settings?.numberFormat || 'number',
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.settings = {
      ...selectedField.value.settings,
      numberFormat: value
    }
  }
})

const selectedFieldCurrency = computed({
  get: () => selectedField.value?.settings?.currencySign || 'NOK',
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.settings = {
      ...selectedField.value.settings,
      currencySign: value
    }
  }
})

const selectedFieldAllowMultiple = computed({
  get: () => selectedField.value?.settings?.isAllowMultiple ?? false,
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.settings = {
      ...selectedField.value.settings,
      isAllowMultiple: value
    }
  }
})

const selectedFieldDisplayName = computed({
  get: () => selectedField.value?.settings?.isDisplayName ?? false,
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.settings = {
      ...selectedField.value.settings,
      isDisplayName: value
    }
  }
})

const selectedFieldDateRange = computed({
  get: () => selectedField.value?.settings?.isDateRange ?? false,
  set: (value) => {
    if (!selectedField.value) return
    selectedField.value.settings = {
      ...selectedField.value.settings,
      isDateRange: value
    }
  }
})

const selectedTypeBadge = computed(() => {
  return typeOptions.value.find((option) => option.id === selectedFieldType.value)?.badge || t('settings.customFields.badges.text')
})

const showNumberFormat = computed(() => selectedFieldType.value === 'number')
const showCurrencySign = computed(() => showNumberFormat.value && selectedFieldNumberFormat.value === 'currency')
const showOptionsEditor = computed(() => ['select', 'multiselect'].includes(selectedFieldType.value))
const showUserSettings = computed(() => selectedFieldType.value === 'user')
const showDateSettings = computed(() => selectedFieldType.value === 'date')

const selectedFieldOptions = computed(() => selectedField.value?.settings?.options || [])

const isNameEmpty = computed(() => {
  const name = selectedField.value?.label?.trim()
  return !name || name.length === 0
})

const canSave = computed(() => Boolean(selectedField.value) && !isSaving.value && !isNameEmpty.value)

const addTypeMenuItems = computed(() =>
  typeOptions.value.map((option) => ({
    id: option.id,
    label: option.label,
    icon: getFieldTypeIcon(option.id),
    action: () => addCustomField(option.id)
  }))
)

const typeMenuItems = computed(() =>
  typeOptions.value.map((option) => ({
    id: option.id,
    label: option.label,
    icon: getFieldTypeIcon(option.id),
    action: () => {
      selectedFieldType.value = option.id
    }
  }))
)
const typeLabelById = computed(() => {
  const entries = typeOptions.value.map((option) => [option.id, option.label])
  return Object.fromEntries(entries)
})

function startResize(event) {
  event.preventDefault()
  isResizing.value = true
  resizeStartX = event.clientX
  resizeStartWidth = listWidth.value
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event) {
  if (!isResizing.value) return
  const nextWidth = Math.max(220, Math.min(360, resizeStartWidth + (event.clientX - resizeStartX)))
  listWidth.value = nextWidth
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function selectField(fieldId) {
  selectedFieldId.value = fieldId
}

function getFieldTypeIcon(type) {
  const iconMap = {
    text: Type,
    number: Hash,
    checkbox: CheckSquare,
    select: ListFilter,
    multiselect: ListFilter,
    date: Calendar,
    user: User
  }
  return iconMap[type] || Type
}

function addCustomField(type) {
  const nextIndex = customFields.value.length + 1
  const newField = {
    id: `custom-${nextIndex}`,
    key: '',
    label: t('settings.customFields.newFieldLabel', { index: nextIndex }),
    type,
    description: '',
    isShow: true,
    settings: {},
    isNew: true
  }
  ensureFieldSettings(newField)
  customFields.value.push(newField)
  selectedFieldId.value = newField.id
}

function ensureFieldSettings(field) {
  if (!field.settings) field.settings = {}
  if (field.type === 'number') {
    if (!field.settings.numberFormat) field.settings.numberFormat = 'number'
    if (!field.settings.currencySign) field.settings.currencySign = 'NOK'
  }

  if (field.type === 'user') {
    field.settings.isAllowMultiple = field.settings.isAllowMultiple ?? false
    field.settings.isDisplayName = field.settings.isDisplayName ?? false
  }

  if (field.type === 'date') {
    field.settings.isDateRange = field.settings.isDateRange ?? false
  }

  if (['select', 'multiselect'].includes(field.type)) {
    if (!Array.isArray(field.settings.options)) field.settings.options = []
  }
}

function normalizeOptions(options) {
  const normalized = []
  const parentMap = new Map()
  let colorIndex = 0

  const nextColor = () => optionColors[colorIndex++ % optionColors.length]

  ;(Array.isArray(options) ? options : []).forEach((option) => {
    const value = String(option)
    const parts = value.split(' / ')
    const parentLabel = parts[0]?.trim()
    const childLabel = parts[1]?.trim()

    if (!parentLabel) return

    let parent = parentMap.get(parentLabel)
    if (!parent) {
      parent = {
        id: `opt-${parentLabel.toLowerCase().replace(/\\s+/g, '-')}`,
        label: parentLabel,
        color: nextColor(),
        children: []
      }
      parentMap.set(parentLabel, parent)
      normalized.push(parent)
    }

    if (childLabel) {
      parent.children.push({
        id: `opt-${parentLabel.toLowerCase().replace(/\\s+/g, '-')}-${childLabel.toLowerCase().replace(/\\s+/g, '-')}`,
        label: childLabel,
        color: nextColor(),
        children: []
      })
    }
  })

  return normalized
}

function mapFieldFromApi(field) {
  const settings = field.settings || {}
  const type = field.type === 'boolean' ? 'checkbox' : (field.type || 'text')
  return {
    id: field.id,
    key: field.key || '',
    label: field.label || '',
    description: field.description || '',
    type,
    isShow: field.isShow ?? true,
    settings: {
      numberFormat: settings.numberFormat,
      currencySign: settings.currencySign,
      isAllowMultiple: settings.isAllowMultiple,
      isDisplayName: settings.isDisplayName,
      isDateRange: settings.isDateRange,
      options: normalizeOptions(settings.options)
    }
  }
}

function flattenOptions(options) {
  const flattened = []
  options.forEach((option) => {
    flattened.push(option.label)
    option.children?.forEach((child) => {
      flattened.push(`${option.label} / ${child.label}`)
    })
  })
  return flattened
}

function buildPayload(field) {
  const apiType = field.type === 'checkbox' ? 'boolean' : field.type
  const payload = {
    label: field.label?.trim() || '',
    type: apiType,
    description: field.description || '',
    isShow: field.isShow ?? true,
    settings: {}
  }

  if (field.type === 'number') {
    payload.settings.numberFormat = field.settings.numberFormat || 'number'
    payload.settings.currencySign = field.settings.currencySign || 'NOK'
  }

  if (['select', 'multiselect'].includes(field.type)) {
    payload.settings.options = flattenOptions(field.settings.options || [])
  }

  if (field.type === 'user') {
    payload.settings.isAllowMultiple = !!field.settings.isAllowMultiple
    payload.settings.isDisplayName = !!field.settings.isDisplayName
  }

  if (field.type === 'date') {
    payload.settings.isDateRange = !!field.settings.isDateRange
  }

  return payload
}

async function fetchCustomFields() {
  isLoadingFields.value = true
  try {
    const response = await customFieldApi.getCustomFields()
    const list = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : response?.data?.data || []
    customFields.value = list.map(mapFieldFromApi)
    selectedFieldId.value = customFields.value[0]?.id || null
  } catch (error) {
    uiStore.showApiError(error, t('settings.customFields.errors.load'))
  } finally {
    isLoadingFields.value = false
  }
}

async function saveSelectedField() {
  if (!selectedField.value) return
  const fieldRef = selectedField.value
  isSaving.value = true
  emit('update:isSaving', true)
  try {
    const payload = buildPayload(fieldRef)
    if (fieldRef.isNew) {
      const response = await customFieldApi.createCustomField(payload)
      const savedField = response?.saved || response?.data?.saved || response?.data || response
      if (savedField?.id) {
        Object.assign(fieldRef, mapFieldFromApi(savedField))
        fieldRef.isNew = false
        selectedFieldId.value = savedField.id
      }
      uiStore.showApiSuccess(response, t('settings.customFields.messages.created'))
    } else {
      const response = await customFieldApi.updateCustomField(fieldRef.id, payload)
      uiStore.showApiSuccess(response, t('settings.customFields.messages.updated'))
    }
  } catch (error) {
    uiStore.showApiError(error, t('settings.customFields.errors.save'))
  } finally {
    isSaving.value = false
    emit('update:isSaving', false)
  }
}

async function deleteSelectedField() {
  if (!selectedField.value) return
  pendingDeleteId.value = selectedField.value.id
  pendingDeleteLabel.value = selectedField.value.label || t('settings.customFields.labels.customField')
  showDeleteModal.value = true
}

async function confirmDeleteSelectedField() {
  if (!pendingDeleteId.value) return
  const fieldId = pendingDeleteId.value
  const targetField = customFields.value.find((field) => field.id === fieldId)
  const isNewField = !targetField || targetField.isNew
  if (isNewField) {
    customFields.value = customFields.value.filter((field) => field.id !== fieldId)
    selectedFieldId.value = customFields.value[0]?.id || null
    showDeleteModal.value = false
    pendingDeleteId.value = null
    pendingDeleteLabel.value = ''
    return
  }

  isDeleting.value = true
  try {
    const response = await customFieldApi.deleteCustomField(fieldId)
    customFields.value = customFields.value.filter((field) => field.id !== fieldId)
    selectedFieldId.value = customFields.value[0]?.id || null
    uiStore.showApiSuccess(response, t('settings.customFields.messages.deleted'))
    showDeleteModal.value = false
    pendingDeleteId.value = null
    pendingDeleteLabel.value = ''
  } catch (error) {
    uiStore.showApiError(error, t('settings.customFields.errors.delete'))
  } finally {
    isDeleting.value = false
  }
}

function cancelDeleteSelectedField() {
  showDeleteModal.value = false
  pendingDeleteId.value = null
  pendingDeleteLabel.value = ''
}

function addOption(parentId = null) {
  if (!selectedField.value) return
  const option = {
    id: `opt-${Date.now()}`,
    label: t('settings.customFields.options.new'),
    color: optionColors[Math.floor(Math.random() * optionColors.length)],
    children: []
  }
  if (parentId) {
    const parent = selectedField.value.settings.options.find((item) => item.id === parentId)
    if (parent) {
      parent.children.push(option)
      return
    }
  }
  selectedField.value.settings.options.push(option)
}

function updateOptionLabel(option, value) {
  option.label = value
}

function blurOptionLabel(option) {
  const trimmed = (option.label || '').trim()
  option.label = trimmed || t('settings.customFields.options.new')
}

function getOptionSize(option) {
  const text = option.label || ''
  return text ? text.length : 1
}

function removeOption(optionId, parentId = null) {
  if (!selectedField.value) return
  if (parentId) {
    const parent = selectedField.value.settings.options.find((item) => item.id === parentId)
    if (!parent) return
    parent.children = parent.children.filter((child) => child.id !== optionId)
    return
  }
  selectedField.value.settings.options = selectedField.value.settings.options.filter((opt) => opt.id !== optionId)
}

function getOptionMenuItems(option, parentId = null, allowSubItem = true) {
  const items = []
  if (allowSubItem) {
    items.push({
      id: 'add-subitem',
      label: t('settings.customFields.options.addSubItem'),
      action: () => addOption(option.id)
    })
  }
  items.push({
    id: 'delete',
    label: t('common.delete'),
    action: () => removeOption(option.id, parentId)
  })
  return items
}

watch(
  () => isSaving.value,
  (value) => emit('update:isSaving', value),
  { immediate: true }
)

watch(
  () => canSave.value,
  (value) => emit('update:canSave', value),
  { immediate: true }
)

watch(
  () => [props.visible, props.active],
  ([visible, active]) => {
    if (visible && active) {
      fetchCustomFields()
    }
  },
  { immediate: true }
)

defineExpose({ saveSelectedField })

onUnmounted(() => {
  if (isResizing.value) stopResize()
})
</script>

<template>
  <div class="settings-custom" :style="{ '--settings-list-width': `${listWidth}px` }">
    <div class="settings-list" :style="{ width: `${listWidth}px` }">
      <div class="settings-list-header">
        <div>
          <div class="settings-list-title">
            {{ t('settings.customFields.title') }}
            <CircleHelp class="inline-block ml-1 w-3.5 h-3.5 text-gray-400" />
          </div>
          
        </div>
        <DropdownMenu :items="addTypeMenuItems" position="right" width="12rem">
          <template #trigger>
              <Plus class="w-4 h-4" />
          </template>
        </DropdownMenu>
      </div>

      <div class="settings-list-body pl-1">
        <div v-if="isLoadingFields" class="settings-list-empty">
          {{ t('settings.customFields.loading') }}
        </div>
        <div v-else-if="customFields.length === 0" class="settings-list-empty">
          {{ t('settings.customFields.empty') }}
        </div>
        <template v-else>
          <button
            v-for="field in customFields"
            :key="field.id"
            type="button"
            class="settings-list-row pl-3 py-1"
            :class="{ 'is-selected': field.id === selectedFieldId }"
            @click="selectField(field.id)"
          >
            <component :is="getFieldTypeIcon(field.type)" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span class="settings-list-name">{{ field.label }}</span>
          </button>
        </template>
      </div>
    </div>

    <div class="settings-divider" @mousedown="startResize"></div>

    <div class="settings-editor">
      <div class="settings-editor-header">
        <div class="settings-editor-title">{{ t('settings.customFields.editorTitle') }}</div>
        <button
          v-if="selectedField"
          type="button"
          class="settings-delete cursor-pointer"
          :disabled="isDeleting"
          @click="deleteSelectedField"
          :title="t('settings.customFields.actions.deleteField')"
          aria-label="Delete field"
        >
          <Trash2 class="w-4 h-4 text-red-500" />
        </button>
      </div>

      <div class="settings-editor-section">
        <div class="settings-editor-section-title">{{ t('settings.customFields.sections.general') }}</div>
        <div class="settings-editor-row">
          <span class="settings-label">{{ t('settings.customFields.fields.type') }}</span>
          <div class="settings-type-pill">
            <component :is="getFieldTypeIcon(selectedFieldType)" class="w-4 h-4" />
            {{ selectedTypeBadge }}
          </div>
        </div>
        <div class="settings-editor-field">
          <FormInput
            v-model="selectedFieldName"
            :label="t('settings.customFields.fields.nameLabel')"
            labelClass="settings-label"
            :placeholder="t('settings.customFields.placeholders.name')"
            class="w-full"
            :class="{ 'has-error': isNameEmpty && selectedField }"
          />
          <span v-if="isNameEmpty && selectedField" class="settings-error-text">
            {{ t('settings.customFields.errors.nameRequired') }}
          </span>
        </div>
        <div class="settings-editor-field">
          <FormInput
            v-model="selectedFieldDescription"
            as="textarea"
            :label="t('settings.customFields.fields.description')"
            labelClass="settings-label"
            :placeholder="t('settings.customFields.placeholders.description')"
            class="w-full"
          />
        </div>
      </div>

      <div class="settings-editor-section mt-6">
        <div class="settings-editor-section-title">{{ t('settings.customFields.sections.settings') }}</div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-title">{{ t('settings.customFields.fields.show') }}</div>
            <div class="settings-toggle-subtitle">
              {{ t('settings.customFields.help.show') }}
            </div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="selectedFieldVisible" />
        </div>
        <div v-if="showNumberFormat" class="settings-editor-field settings-inline-row">
          <div>
            <div class="settings-field-title">{{ t('settings.customFields.fields.numberFormat') }}</div>
            <div class="settings-field-subtitle">{{ t('settings.customFields.help.numberFormat') }}</div>
          </div>
          <FormInput
            v-model="selectedFieldNumberFormat"
            as="select"
            :options="numberFormatOptions"
            optionLabel="label"
            optionValue="id"
            :dense="true"
            class="settings-inline-input min-w-[140px]"
          />
        </div>
        <div v-if="showCurrencySign" class="settings-editor-field settings-inline-row">
          <div>
            <div class="settings-field-title">{{ t('settings.customFields.fields.currencySign') }}</div>
          </div>
          <FormInput
            v-model="selectedFieldCurrency"
            as="select"
            :options="currencyOptions"
            optionLabel="label"
            optionValue="id"
            class="settings-inline-input min-w-[140px]"
          />
        </div>
        <div v-if="showOptionsEditor" class="settings-editor-field">
          <div class="settings-option-header">
            <div class="settings-field-title">{{ t('settings.customFields.fields.options') }}</div>
            <button type="button" class="settings-option-add-btn" @click="addOption()">
              <Plus class="w-4 h-4" />
            </button>
          </div>
          <div class="settings-option-list">
            <div
              v-for="option in selectedFieldOptions"
              :key="option.id"
              class="settings-option-group"
            >
              <div class="settings-option-row">
                <div class="settings-option-pill" :style="{ backgroundColor: option.color }">
                  <input
                    class="settings-option-input text-center"
                    :value="option.label"
                    :style="{ width: `${(option.label?.length || 1) * 0.53 + 0.5}em` }"
                    @input="updateOptionLabel(option, $event.target.value)"
                    @blur="blurOptionLabel(option)"
                  />
                </div>
                <DropdownMenu
                  :items="getOptionMenuItems(option)"
                  position="right"
                  width="14rem"
                  :closeOnSelect="true"
                  contentPosition="before"
                >
                  <template #trigger>
                    <button type="button" class="settings-option-menu">...</button>
                  </template>
                  <template #content>
                    <div class="settings-option-color">
                      <ColorPicker v-model="option.color" />
                    </div>
                    <div class="settings-option-divider"></div>
                  </template>
                </DropdownMenu>
              </div>
              <div
                v-for="child in option.children"
                :key="child.id"
                class="settings-option-row settings-option-row--child"
              >
                <div class="settings-option-pill" :style="{ backgroundColor: child.color }">
                  <input
                    class="settings-option-input"
                    :value="child.label"
                    :style="{ width: `${(child.label?.length || 1) * 0.65 + 0.5}em` }"
                    @input="updateOptionLabel(child, $event.target.value)"
                    @blur="blurOptionLabel(child)"
                  />
                </div>
                <DropdownMenu
                  :items="getOptionMenuItems(child, option.id, false)"
                  position="right"
                  width="14rem"
                  :closeOnSelect="true"
                  contentPosition="before"
                >
                  <template #trigger>
                    <button type="button" class="settings-option-menu">...</button>
                  </template>
                  <template #content>
                    <div class="settings-option-color">
                      <ColorPicker v-model="child.color" />
                    </div>
                    <div class="settings-option-divider"></div>
                  </template>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <button type="button" class="settings-option-add" @click="addOption()">
            {{ t('settings.customFields.actions.newOption') }}
          </button>
        </div>
        <div v-if="showUserSettings" class="settings-toggle-row">
          <div>
            <div class="settings-field-title">{{ t('settings.customFields.fields.allowMultiple') }}</div>
            <div class="settings-toggle-subtitle">
              {{ t('settings.customFields.help.allowMultiple') }}
            </div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="selectedFieldAllowMultiple" />
        </div>
        <div v-if="showUserSettings" class="settings-toggle-row">
          <div>
            <div class="settings-field-title">{{ t('settings.customFields.fields.displayName') }}</div>
            <div class="settings-toggle-subtitle">
              {{ t('settings.customFields.help.displayName') }}
            </div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="selectedFieldDisplayName" />
        </div>
        <div v-if="showDateSettings" class="settings-toggle-row">
          <div>
            <div class="settings-field-title">{{ t('settings.customFields.fields.dateRange') }}</div>
            <div class="settings-toggle-subtitle">
              {{ t('settings.customFields.help.dateRange') }}
            </div>
          </div>
          <ToggleSwitch class="min-w-[40px] max-h-[26px]" v-model="selectedFieldDateRange" />
        </div>
      </div>

    </div>

    <DeleteConfirmModal
      v-model:visible="showDeleteModal"
      :title="t('settings.customFields.delete.title', { label: pendingDeleteLabel })"
      :message="t('settings.customFields.delete.message')"
      :loading="isDeleting"
      @confirm="confirmDeleteSelectedField"
      @cancel="cancelDeleteSelectedField"
    />
  </div>
</template>

<style scoped>
.settings-custom {
  display: grid;
  grid-template-columns: auto 12px 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
}

.settings-custom::before {
  content: '';
  position: absolute;
  left: calc(12px + var(--settings-list-width, 280px));
  right: 0;
  bottom: 0;
  height: var(--settings-footer-height, 72px);
  background: #ffffff;
  pointer-events: none;
}

.settings-custom::after {
  content: '';
  position: absolute;
  left: calc(12px + var(--settings-list-width, 280px));
  right: 0;
  bottom: var(--settings-footer-height, 72px);
  height: 1px;
  background: #e5e7eb;
  pointer-events: none;
}

.settings-list {
  display: flex;
  /* padding-left: 15px; */
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 240px;
  max-height: 100%;
  box-sizing: border-box;
  position: relative;
}

.settings-list::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #ffffff;
  pointer-events: none;
}

.settings-list-header {
  padding: 19px;
  padding-bottom: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.settings-list-title {
  font-size: 12px;
  font-weight: 600;
  color: #9CA3af;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
}

.settings-list-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.settings-add-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.settings-add-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-list-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.settings-list-row {
  display: grid;
  grid-template-columns: 1fr 90px;
  gap: 12px;
  font-size: 12px;
  color: #374151;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
}

.settings-list-row--head {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.08em;
}

.settings-list-row:hover {
  background: #f9fafb;
}

.settings-list-row.is-selected {
  background: #eef2ff;
  color: #1f2937;
  font-weight: 600;
}

.settings-list-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.settings-list-empty {
  padding: 12px 10px;
  font-size: 12px;
  color: #9ca3af;
}

.settings-divider {
  width: 12px;
  position: relative;
  cursor: col-resize;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.settings-divider::before {
  content: '';
  width: 1px;
  background: #e5e7eb;
  height: 100%;
}

.settings-editor {
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.settings-editor-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.settings-editor-section {
  display: grid;
  gap: 12px;
}

.settings-editor-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.settings-type-pill {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.settings-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 10px;
}

.settings-inline-row {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.settings-inline-input {
  width: 180px;
  min-width: 180px;
}

.settings-inline-input :deep(.p-inputtext),
.settings-inline-input :deep(.p-dropdown),
.settings-inline-input :deep(.p-multiselect) {
  width: 100%;
}

.settings-toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.settings-toggle-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.settings-field-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.settings-field-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

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
  color: #6b7280;
  border-radius: 4px;
}

.settings-option-add-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-option-add {
  font-size: 12px;
  color: #6b7280;
  text-align: left;
  padding: 0;
  margin-top: 8px;
}

.settings-option-add:hover {
  color: #111827;
}

.settings-option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.settings-option-row--child {
  margin-left: 20px;
}

.settings-option-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  width: fit-content;
  max-width: 200px;
}

.settings-option-input {
  border: none;
  background: transparent;
  font-size: 12px;
  color: #ffffff;
  font-weight: 600;
  line-height: 1;
  padding: 0;
  min-width: 1ch;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-option-input:focus {
  outline: none;
}

.settings-option-menu {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 24px;
}

.settings-option-color {
  padding: 8px;
}

.settings-option-divider {
  border-top: 1px solid #f3f4f6;
  margin: 4px 0;
}

.settings-switch-row {
  display: flex;
  justify-content: flex-end;
}

.settings-delete {
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
  text-align: left;
}

@media (max-width: 1100px) {
  .settings-custom {
    grid-template-columns: 1fr;
  }

  .settings-divider {
    display: none;
  }

  .settings-list {
    width: 100% !important;
  }
}
</style>
