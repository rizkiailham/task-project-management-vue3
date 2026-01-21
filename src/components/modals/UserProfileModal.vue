<script setup>
/**
 * UserProfileModal - Read-only user profile modal.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore, useUserStore } from '@/stores'
import { getUser } from '@/api/user.api'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  entry: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

const { t } = useI18n()
const uiStore = useUIStore()
const userStore = useUserStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isLoading = ref(false)
const user = ref(null)

const userId = computed(() => (props.entry?.type === 'user' ? props.entry.id : null))

function formatValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return value
}

function getCustomFieldKey(field) {
  return field?.key || field?.id || field?.label || ''
}

function normalizeCustomValuesSource(values) {
  if (!values) return {}
  if (Array.isArray(values)) {
    return values.reduce((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc
      const key =
        entry.key ||
        entry.fieldKey ||
        entry.customFieldKey ||
        entry.customFieldId ||
        entry.fieldId ||
        entry.id ||
        entry.label
      if (!key) return acc
      acc[key] = entry.value ?? entry.values ?? entry.data ?? entry.selection
      return acc
    }, {})
  }
  if (values.customValues && typeof values.customValues === 'object') {
    return values.customValues
  }
  if (Array.isArray(values.customFieldValues)) {
    return normalizeCustomValuesSource(values.customFieldValues)
  }
  return values
}

function getCustomFieldValue(source, field) {
  if (!source || typeof source !== 'object') return undefined
  if (field?.key && source[field.key] !== undefined) return source[field.key]
  if (field?.id && source[field.id] !== undefined) return source[field.id]
  if (field?.label && source[field.label] !== undefined) return source[field.label]
  return undefined
}

function normalizeCustomFieldValue(field, value) {
  if (value === undefined) return undefined
  if (field.type === 'checkbox' || field.type === 'boolean') {
    return !!value
  }
  if (field.type === 'multiselect' || (field.type === 'user' && field.settings?.isAllowMultiple)) {
    if (Array.isArray(value)) return value
    if (value === null || value === '') return []
    return [value]
  }
  if (field.type === 'date' && field.settings?.isDateRange) {
    if (value && typeof value === 'object') {
      return {
        start: value.start || value.from || value.begin || '',
        end: value.end || value.to || value.until || ''
      }
    }
    return { start: '', end: '' }
  }
  if (value && typeof value === 'object' && value.value !== undefined) {
    return value.value
  }
  return value
}

function formatCustomFieldDisplay(field, value) {
  if (value === undefined || value === null || value === '') return '-'
  if (field.type === 'checkbox' || field.type === 'boolean') {
    return value ? t('common.yes') : t('common.no')
  }
  if (field.type === 'date' && field.settings?.isDateRange) {
    const start = value?.start || ''
    const end = value?.end || ''
    return start && end ? `${start} - ${end}` : start || end || '-'
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (item && typeof item === 'object' ? item.label || item.name || item.value || item.id : item))
      .filter(Boolean)
      .join(', ') || '-'
  }
  if (value && typeof value === 'object') {
    return value.label || value.name || value.value || value.id || '-'
  }
  return value
}

function formatEntityList(items) {
  if (!Array.isArray(items) || items.length === 0) return '-'
  return items
    .map(item => item?.name || item?.label || item?.title || item?.id || item)
    .filter(Boolean)
    .join(', ')
}

function formatRoleName(role) {
  if (!role) return '-'
  return role?.name || role?.label || role?.value || role
}

const fallbackNameParts = computed(() => (props.entry?.name || '').trim().split(/\s+/))
const displayFirstName = computed(() =>
  formatValue(user.value?.firstName || fallbackNameParts.value[0])
)
const displayLastName = computed(() =>
  formatValue(user.value?.lastName || fallbackNameParts.value.slice(1).join(' '))
)
const displayEmail = computed(() => formatValue(user.value?.email || props.entry?.email))
const displayPhone = computed(() => formatValue(user.value?.phone))
const displayLanguage = computed(() => formatValue(user.value?.language))
const displayOrganization = computed(() => formatValue(user.value?.organization))
const displayRole = computed(() =>
  formatValue(formatRoleName(user.value?.role || props.entry?.role))
)
const displayProjects = computed(() => formatEntityList(user.value?.projects))
const displayGroups = computed(() => formatEntityList(user.value?.groups))
const displayStatus = computed(() => (
  user.value?.isActive === undefined || user.value?.isActive === null
    ? '-'
    : (user.value.isActive ? t('common.yes') : t('common.no'))
))

const avatarUrl = computed(() =>
  user.value?.avatar || user.value?.avatarUrl || user.value?.avatar_url || ''
)
const avatarColor = computed(() => user.value?.avatarColor || '#3b82f6')
const avatarInitials = computed(() => {
  const first = (displayFirstName.value || '').trim()
  const last = (displayLastName.value || '').trim()
  const firstInitial = first ? first.charAt(0) : ''
  const lastInitial = last ? last.charAt(0) : ''
  const initials = `${firstInitial}${lastInitial}`.trim()
  return initials || t('users.avatarFallback')
})

const customFields = computed(() => {
  const definitions = (userStore.customFieldDefinitions || []).filter(
    (field) => field?.isShow !== false
  )
  const source = normalizeCustomValuesSource(user.value?.customValues || user.value)
  return definitions.map((field) => {
    const key = getCustomFieldKey(field)
    const resolvedValue = normalizeCustomFieldValue(field, getCustomFieldValue(source, field))
    return {
      id: field.id || key,
      label: field.label || key,
      value: formatCustomFieldDisplay(field, resolvedValue)
    }
  })
})

watch([() => props.visible, userId], async ([isVisible, id]) => {
  if (!isVisible) {
    user.value = null
    return
  }

  if (!id) {
    user.value = null
    return
  }

  isLoading.value = true
  try {
    await userStore.fetchCustomFieldDefinitions()
    user.value = await getUser(id)
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="t('settings.project.profile.title')"
    width="640px"
    maxWidth="96vw"
  >
    <div v-if="isLoading" class="user-profile-loading">
      {{ t('common.loading') }}
    </div>
    <div v-else class="user-profile">
      <div class="user-profile-header">
        <div class="user-profile-avatar" :style="{ backgroundColor: avatarColor }">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayFirstName" />
          <span v-else>{{ avatarInitials }}</span>
        </div>
        <div>
          <div class="user-profile-name">{{ displayFirstName }} {{ displayLastName }}</div>
          <div class="user-profile-email">{{ displayEmail }}</div>
        </div>
      </div>

      <div class="user-profile-section">
        <div class="user-profile-section-title">{{ t('users.sections.info') }}</div>
        <div class="user-profile-grid">
          <FormInput
            id="user-profile-first-name"
            :modelValue="displayFirstName"
            :label="t('users.fields.firstName')"
            disabled
          />
          <FormInput
            id="user-profile-last-name"
            :modelValue="displayLastName"
            :label="t('users.fields.lastName')"
            disabled
          />
          <FormInput
            id="user-profile-email"
            :modelValue="displayEmail"
            :label="t('users.fields.email')"
            disabled
          />
          <FormInput
            id="user-profile-phone"
            :modelValue="displayPhone"
            :label="t('users.fields.phone')"
            disabled
          />
          <FormInput
            id="user-profile-language"
            :modelValue="displayLanguage"
            :label="t('users.fields.language')"
            disabled
          />
          <FormInput
            id="user-profile-organization"
            :modelValue="displayOrganization"
            :label="t('users.fields.organization')"
            disabled
          />
        </div>
      </div>

      <div class="user-profile-section">
        <div class="user-profile-section-title">{{ t('users.sections.projectAccess') }}</div>
        <div class="user-profile-grid">
          <FormInput
            id="user-profile-role"
            :modelValue="displayRole"
            :label="t('users.fields.role')"
            disabled
          />
          <FormInput
            id="user-profile-projects"
            as="textarea"
            :modelValue="displayProjects"
            :label="t('users.fields.projects')"
            rows="2"
            disabled
          />
          <FormInput
            id="user-profile-groups"
            as="textarea"
            :modelValue="displayGroups"
            :label="t('users.fields.groups')"
            rows="2"
            disabled
          />
          <FormInput
            id="user-profile-status"
            :modelValue="displayStatus"
            :label="t('users.fields.active')"
            disabled
          />
        </div>
      </div>

      <div v-if="customFields.length" class="user-profile-section">
        <div class="user-profile-section-title">{{ t('users.sections.customFields') }}</div>
        <div class="user-profile-grid">
          <div
            v-for="field in customFields"
            :key="field.id"
            class="user-profile-field"
          >
            <div class="user-profile-field-label">{{ field.label }}</div>
            <div class="user-profile-field-value">{{ field.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button
          type="button"
          :label="t('common.close')"
          outlined
          severity="secondary"
          @click="dialogVisible = false"
        />
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.user-profile {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.user-profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-profile-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}

.user-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.user-profile-email {
  font-size: 12px;
  color: #6b7280;
}

.user-profile-loading {
  font-size: 12px;
  color: #9ca3af;
}

.user-profile-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-profile-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.user-profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.user-profile-field {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
}

.user-profile-field-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.user-profile-field-value {
  margin-top: 4px;
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
}

@media (max-width: 640px) {
  .user-profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
