<script setup>
/**
 * PublicProjectFormView - Public project form renderer (/forms?project_id=...)
 * Dark-themed public form matching the project's blue primary colour.
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Avatar from 'primevue/avatar'
import UserMultiSearchDropdown from '@/components/user/UserMultiSearchDropdown.vue'
import * as projectApi from '@/api/project.api'
import { ClipboardCopy, FileText, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()

const isLoading = ref(false)
const loadError = ref('')
const selectedForm = ref(null)
const fields = ref([])
const formValues = ref({})
const isPayloadCopied = ref(false)
const isSubmitting = ref(false)
let loadToken = 0

const FIELD_KEY_DUPLICATE_SEPARATOR = '__'

const projectId = computed(() => {
  const fromSnakeCase = route.query.project_id
  const fromCamelCase = route.query.projectId
  const rawValue = fromSnakeCase ?? fromCamelCase ?? ''
  if (Array.isArray(rawValue)) return String(rawValue[0] || '').trim()
  return String(rawValue || '').trim()
})

const visibleFields = computed(() => fields.value.filter((field) => field.visible !== false))

const isPrivateForm = computed(() => {
  const form = selectedForm.value
  if (!form) return false

  if (typeof form?.isPrivate === 'boolean') return form.isPrivate
  if (typeof form?.isPrivate === 'number') return form.isPrivate !== 0
  if (typeof form?.isPrivate === 'string') {
    const normalized = form.isPrivate.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }

  const accessValue = String(form?.access || form?.visibility || form?.sharing || '').toLowerCase()
  if (!accessValue) return true
  return accessValue !== 'public'
})

const headerTitle = computed(() => {
  if (selectedForm.value?.name) return selectedForm.value.name
  return t('forms.public.title', 'Project Form')
})

const headerDescription = computed(() => selectedForm.value?.description || '')

const formPayload = computed(() => {
  const payload = {}

  visibleFields.value.forEach((field) => {
    const value = formValues.value[field.key]
    if (field.type === 'multiselect') {
      payload[field.key] = normalizeMultiOptionValues(value)
        .map((entry) => toSerializableOption(entry, field.options))
        .filter((entry) => entry !== null && entry !== undefined && entry !== '')
      return
    }

    if (field.type === 'select') {
      payload[field.key] = toSerializableOption(value, field.options)
      return
    }

    if (field.type === 'checkbox' || field.type === 'boolean') {
      payload[field.key] = normalizeBooleanValue(value)
      return
    }

    payload[field.key] = value ?? ''
  })

  return {
    projectId: projectId.value,
    formId: selectedForm.value?.id || selectedForm.value?.formId || selectedForm.value?.slug || null,
    action: selectedForm.value?.action || selectedForm.value?.actionId || null,
    data: payload
  }
})

/* ─── Helpers ─────────────────────────────────────────── */

function toArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  const isObject = trimmed.startsWith('{') && trimmed.endsWith('}')
  const isArray = trimmed.startsWith('[') && trimmed.endsWith(']')
  if (!isObject && !isArray) return value

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
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

  const value = option.value ?? option.id ?? option.key ?? option.slug ?? option.name ?? option.label
  if (value === null || value === undefined || value === '') return null

  return {
    ...option,
    label: option.label ?? option.name ?? option.email ?? String(value),
    value
  }
}

function mergeOptionsByValue(...groups) {
  const merged = new Map()

  groups
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

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    return lowered === 'true' || lowered === '1' || lowered === 'yes'
  }
  return Boolean(value)
}

function resolveBaseFieldKey(rawKey) {
  const normalizedKey = String(rawKey || '').trim()
  if (!normalizedKey) return ''
  if (normalizedKey === 'name' || normalizedKey === 'title') return 'title'

  const candidates = [
    normalizedKey.replace(/__\d+$/, ''),
    normalizedKey.replace(/_\d+$/, ''),
    normalizedKey.replace(/-\d+$/, '')
  ]

  const stripped = candidates.find((candidate) => candidate && candidate !== normalizedKey)
  return stripped || normalizedKey
}

function inferFieldType(rawField, baseKey, options) {
  const explicitType = String(rawField?.type || '').trim().toLowerCase()
  if (explicitType) {
    if (explicitType === 'boolean') return 'checkbox'
    return explicitType
  }

  if (baseKey === 'description') return 'textarea'
  if (baseKey === 'subscribers') return options.length > 0 ? 'multiselect' : 'text'
  if (['tags', 'priority', 'status', 'assignee', 'supervisor', 'attachments'].includes(baseKey)) {
    return options.length > 0 ? 'select' : 'text'
  }

  return 'text'
}

function createLocalFieldKey(rawKey, index, usedKeys) {
  const candidate = String(rawKey || `field-${index + 1}`)
  if (!usedKeys.has(candidate)) {
    usedKeys.add(candidate)
    return candidate
  }

  let suffix = 2
  let nextKey = `${candidate}${FIELD_KEY_DUPLICATE_SEPARATOR}${suffix}`
  while (usedKeys.has(nextKey)) {
    suffix += 1
    nextKey = `${candidate}${FIELD_KEY_DUPLICATE_SEPARATOR}${suffix}`
  }
  usedKeys.add(nextKey)
  return nextKey
}

function createFieldFromApi(rawField, index, usedKeys) {
  const rawKey = rawField?.key || rawField?.slug || rawField?.fieldKey || `field-${index + 1}`
  const key = createLocalFieldKey(rawKey, index, usedKeys)
  const baseKey = resolveBaseFieldKey(rawKey)
  const defaultValue = rawField?.defaultValue === undefined ? rawField?.value : rawField?.defaultValue
  const parsedDefault = parseMaybeJson(defaultValue)

  const options = mergeOptionsByValue(
    toArray(rawField?.options),
    Array.isArray(parsedDefault) ? parsedDefault : [parsedDefault]
  )

  const type = inferFieldType(rawField, baseKey, options)
  let value = parsedDefault
  if (type === 'multiselect') {
    value = normalizeMultiOptionValues(parsedDefault)
  } else if (type === 'select') {
    value = normalizeSingleOptionValue(parsedDefault)
  } else if (type === 'checkbox' || type === 'boolean') {
    value = normalizeBooleanValue(parsedDefault)
  } else if (value === null || value === undefined) {
    value = ''
  }

  return {
    id: rawField?.id || `${key}-${index}`,
    key,
    rawKey,
    baseKey,
    label: rawField?.label || baseKey || key,
    type,
    required: Boolean(rawField?.isRequired ?? rawField?.required ?? baseKey === 'title'),
    visible: rawField?.isShow ?? rawField?.visible ?? true,
    options,
    value
  }
}

function getObjectList(response) {
  const source = response?.data !== undefined ? response.data : response
  if (Array.isArray(source)) return source
  if (Array.isArray(source?.data)) return source.data
  if (Array.isArray(source?.items)) return source.items
  if (Array.isArray(source?.forms)) return source.forms
  if (source?.form && typeof source.form === 'object') return [source.form]
  if (source?.projectForm && typeof source.projectForm === 'object') return [source.projectForm]
  return []
}

function getProjectIdFromForm(form) {
  return form?.projectId || form?.project?.id || form?.project?.projectId || ''
}

function toSerializableOption(value, options = []) {
  const normalizedValue = extractOptionValue(value)
  if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') return ''

  const matched = mergeOptionsByValue(options).find(
    (option) => String(option.value) === String(normalizedValue)
  )
  if (matched) return matched

  const parsed = parseMaybeJson(value)
  const normalized = normalizeOption(parsed)
  if (normalized) return normalized

  return normalizedValue
}

function applyForm(form) {
  selectedForm.value = form || null
  const usedKeys = new Set()

  const incomingFields = toArray(
    form?.customFields ||
      form?.fields ||
      form?.formFields ||
      form?.properties ||
      form?.items
  )

  const mappedFields = incomingFields.map((field, index) => createFieldFromApi(field, index, usedKeys))
  fields.value = mappedFields

  const nextValues = {}
  mappedFields.forEach((field) => {
    nextValues[field.key] = field.value
  })
  formValues.value = nextValues
}

async function copyPayload() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(formPayload.value, null, 2))
    isPayloadCopied.value = true
    setTimeout(() => {
      isPayloadCopied.value = false
    }, 1800)
  } catch {
    isPayloadCopied.value = false
  }
}

function handleSubmit() {
  isSubmitting.value = true
  // For now, just copy the payload
  copyPayload().finally(() => {
    setTimeout(() => {
      isSubmitting.value = false
    }, 600)
  })
}

async function loadForm() {
  const pid = projectId.value
  if (!pid) {
    selectedForm.value = null
    fields.value = []
    formValues.value = {}
    loadError.value = ''
    return
  }

  const token = ++loadToken
  isLoading.value = true
  loadError.value = ''

  try {
    const response = await projectApi.getProjectForms({ projectId: pid })
    if (token !== loadToken) return

    const forms = getObjectList(response)
      .filter((item) => String(getProjectIdFromForm(item)) === String(pid))
      .sort((a, b) => Number(a?.index ?? 0) - Number(b?.index ?? 0))

    if (forms.length === 0) {
      selectedForm.value = null
      fields.value = []
      formValues.value = {}
      loadError.value = t('settings.project.forms.errors.load', 'Form not found for this project')
      return
    }

    applyForm(forms[0])
  } catch {
    if (token !== loadToken) return
    selectedForm.value = null
    fields.value = []
    formValues.value = {}
    loadError.value = t('settings.project.forms.errors.load', 'Failed to load form settings')
  } finally {
    if (token === loadToken) {
      isLoading.value = false
    }
  }
}

/* ─── Field-type helpers ──────────────────────────────── */
function isUserField(field) {
  return ['assignee', 'supervisor', 'subscribers'].includes(field.baseKey)
}

function isMultiUserField(field) {
  return field.baseKey === 'subscribers'
}

function getFieldIcon(field) {
  const iconMap = {
    title: '𝐓',
    description: '≡',
    status: '◎',
    priority: '⚡',
    assignee: '👤',
    supervisor: '👤',
    subscribers: '👥',
    tags: '🏷',
    attachments: '📎'
  }
  return iconMap[field.baseKey] || '📝'
}

watch(projectId, () => {
  loadForm()
}, { immediate: true })
</script>

<template>
  <div class="pf-page">
    <div class="pf-card">
      <!-- Coloured header bar -->
      <div class="pf-header">
        <div class="pf-header-icon">
          <FileText class="pf-header-icon-svg" />
        </div>
        <div class="pf-header-text">
          <h1 class="pf-header-title">{{ headerTitle }}</h1>
          <p v-if="headerDescription" class="pf-header-desc">{{ headerDescription }}</p>
        </div>
      </div>

      <!-- States: missing project, loading, error, private, empty -->
      <div v-if="!projectId" class="pf-state">
        <div class="pf-state-icon">🔗</div>
        <div class="pf-state-text">{{ t('forms.public.errors.missingProjectId', 'Please provide project_id in query params') }}</div>
      </div>

      <div v-else-if="isLoading" class="pf-state">
        <Loader2 class="pf-state-spinner" />
        <div class="pf-state-text">{{ t('common.loading', 'Loading') }}...</div>
      </div>

      <div v-else-if="loadError" class="pf-state pf-state--error">
        <div class="pf-state-icon">⚠️</div>
        <div class="pf-state-text">{{ loadError }}</div>
      </div>

      <div v-else-if="isPrivateForm" class="pf-state">
        <div class="pf-state-icon">🔒</div>
        <div class="pf-state-text">{{ t('forms.public.errors.privateForm', 'This form is private and cannot be accessed publicly') }}</div>
      </div>

      <div v-else-if="visibleFields.length === 0" class="pf-state">
        <div class="pf-state-icon">📋</div>
        <div class="pf-state-text">{{ t('settings.customFields.empty', 'No fields available') }}</div>
      </div>

      <!-- Form fields -->
      <form v-else class="pf-body" @submit.prevent="handleSubmit">
        <div
          v-for="field in visibleFields"
          :key="field.id"
          class="pf-field"
        >
          <!-- Checkbox -->
          <template v-if="field.type === 'checkbox' || field.type === 'boolean'">
            <div class="pf-checkbox-row">
              <Checkbox
                :modelValue="formValues[field.key]"
                :binary="true"
                :inputId="`pf-${field.id}`"
                @update:modelValue="(value) => (formValues[field.key] = value)"
              />
              <label :for="`pf-${field.id}`" class="pf-checkbox-label">
                {{ field.label }}
                <span v-if="field.required" class="pf-required">*</span>
              </label>
            </div>
          </template>

          <!-- All other fields -->
          <template v-else>
            <label class="pf-label" :for="`pf-${field.id}`">
              {{ field.label }}
              <span v-if="field.required" class="pf-required">*</span>
            </label>

            <!-- User fields: use UserMultiSearchDropdown -->
            <UserMultiSearchDropdown
              v-if="isUserField(field)"
              v-model="formValues[field.key]"
              :projectId="projectId"
              :multiple="isMultiUserField(field)"
              :options="field.options"
              :placeholder="field.label"
              :dark="true"
            >
              <template #trigger>
                <button type="button" class="pf-input pf-input--trigger">
                  <template v-if="formValues[field.key]">
                    <span class="pf-input-text">
                      {{ Array.isArray(formValues[field.key])
                        ? `${formValues[field.key].length} selected`
                        : (typeof formValues[field.key] === 'object' ? formValues[field.key]?.name : formValues[field.key]) || field.label
                      }}
                    </span>
                  </template>
                  <span v-else class="pf-input-placeholder">{{ t('common.selectUser', 'Select user') }}</span>
                  <svg class="pf-input-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </template>
            </UserMultiSearchDropdown>

            <!-- Textarea -->
            <textarea
              v-else-if="field.type === 'textarea'"
              :id="`pf-${field.id}`"
              v-model="formValues[field.key]"
              rows="3"
              class="pf-input pf-input--textarea"
              :placeholder="t('common.typeHere', 'Type here...')"
            ></textarea>

            <!-- Select -->
            <div v-else-if="field.type === 'select'" class="pf-select-wrapper">
              <select
                :id="`pf-${field.id}`"
                v-model="formValues[field.key]"
                class="pf-input pf-input--select"
              >
                <option value="" disabled>{{ t('common.select', 'Select') }}...</option>
                <option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <svg class="pf-select-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Multiselect -->
            <div v-else-if="field.type === 'multiselect'" class="pf-multiselect-wrapper">
              <div class="pf-multiselect-tags">
                <span
                  v-for="val in (Array.isArray(formValues[field.key]) ? formValues[field.key] : [])"
                  :key="val"
                  class="pf-tag"
                >
                  {{ field.options.find(o => String(o.value) === String(val))?.label || val }}
                  <button
                    type="button"
                    class="pf-tag-remove"
                    @click="formValues[field.key] = formValues[field.key].filter(v => v !== val)"
                  >×</button>
                </span>
              </div>
              <select
                class="pf-input pf-input--select"
                @change="(e) => {
                  const v = e.target.value
                  if (!v) return
                  const arr = Array.isArray(formValues[field.key]) ? [...formValues[field.key]] : []
                  if (!arr.includes(v)) arr.push(v)
                  formValues[field.key] = arr
                  e.target.value = ''
                }"
              >
                <option value="">{{ t('common.addMore', 'Add') }}...</option>
                <option
                  v-for="opt in field.options.filter(o => !(Array.isArray(formValues[field.key]) ? formValues[field.key] : []).includes(o.value))"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Default text input -->
            <input
              v-else
              :id="`pf-${field.id}`"
              v-model="formValues[field.key]"
              type="text"
              class="pf-input"
              :placeholder="field.baseKey === 'title' ? t('task.create.placeholder', 'Write a task...') : t('common.typeHere', 'Type here...')"
            />
          </template>
        </div>

        <!-- Actions -->
        <div class="pf-actions">
          <button
            type="submit"
            class="pf-submit-btn"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="pf-submit-spinner"></span>
            {{ isPayloadCopied ? t('forms.public.actions.copied', 'Copied!') : t('common.submit', 'Submit') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Footer -->
    <div class="pf-footer">
      Powered by <span class="pf-footer-brand">◇ Desidia</span>
    </div>
  </div>
</template>

<style scoped>
/* ─── Page ────────────────────────────────────────────── */
.pf-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px 24px;
  background-color: #27272A;
  position: fixed;
  inset: 0;
  overflow-y: auto;
}

/* ─── Card ────────────────────────────────────────────── */
.pf-card {
  width: 100%;
  max-width: 580px;
  background: #2f2f33;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  overflow: hidden;
}

/* ─── Header ──────────────────────────────────────────── */
.pf-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--color-primary-500, #2563eb), var(--color-primary-700, #1d4ed8));
}

.pf-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pf-header-icon-svg {
  width: 16px;
  height: 16px;
  color: #ffffff;
}

.pf-header-text {
  flex: 1;
  min-width: 0;
}

.pf-header-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.pf-header-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 2px 0 0;
  line-height: 1.4;
}

/* ─── Body (Form) ─────────────────────────────────────── */
.pf-body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ─── Field ───────────────────────────────────────────── */
.pf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pf-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 5px;
  letter-spacing: 0.01em;
}

.pf-label-icon {
  font-size: 13px;
  line-height: 1;
}

.pf-required {
  color: #f87171;
  font-weight: 700;
}

/* ─── Inputs ──────────────────────────────────────────── */
.pf-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  background: #35353a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pf-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.pf-input:focus {
  border-color: var(--color-primary-500, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
}

.pf-input--textarea {
  height: auto;
  min-height: 80px;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.5;
}

.pf-input--trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.pf-input-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.pf-input-placeholder {
  color: rgba(255, 255, 255, 0.3);
  flex: 1;
}

.pf-input-chevron {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

/* ─── Select ──────────────────────────────────────────── */
.pf-select-wrapper {
  position: relative;
}

.pf-input--select {
  appearance: none;
  padding-right: 32px;
  cursor: pointer;
}

.pf-input--select option {
  background: #35353a;
  color: #e2e8f0;
}

.pf-select-chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

/* ─── Multiselect tags ────────────────────────────────── */
.pf-multiselect-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pf-multiselect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pf-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 6px 0 8px;
  background: rgba(37, 99, 235, 0.2);
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 5px;
  font-size: 11px;
  color: #93c5fd;
  font-weight: 500;
}

.pf-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: #93c5fd;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0;
  transition: background 0.12s, color 0.12s;
}

.pf-tag-remove:hover {
  background: rgba(37, 99, 235, 0.4);
  color: #ffffff;
}

/* ─── Checkbox ────────────────────────────────────────── */
.pf-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
}

.pf-checkbox-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  user-select: none;
}

/* ─── Actions ─────────────────────────────────────────── */
.pf-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.pf-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 20px;
  background: var(--color-primary-500, #2563eb);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.pf-submit-btn:hover:not(:disabled) {
  background: var(--color-primary-600, #2563eb);
}

.pf-submit-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.pf-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pf-submit-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: pf-spin 0.6s linear infinite;
}

@keyframes pf-spin {
  to { transform: rotate(360deg); }
}

/* ─── States ──────────────────────────────────────────── */
.pf-state {
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.pf-state-icon {
  font-size: 28px;
}

.pf-state-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  max-width: 320px;
}

.pf-state--error .pf-state-text {
  color: #fca5a5;
}

.pf-state-spinner {
  width: 22px;
  height: 22px;
  color: var(--color-primary-400, #60a5fa);
  animation: pf-spin 0.8s linear infinite;
}

/* ─── Footer ──────────────────────────────────────────── */
.pf-footer {
  margin-top: 28px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
}

.pf-footer-brand {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

/* ─── Responsive ──────────────────────────────────────── */
@media (max-width: 640px) {
  .pf-page {
    padding: 20px 12px 20px;
    justify-content: flex-start;
  }

  .pf-card {
    border-radius: 12px;
  }

  .pf-header {
    padding: 14px 16px;
  }

  .pf-body {
    padding: 16px 16px 20px;
  }
}
</style>
