<script setup>
/**
 * UserProfileModal - Read-only user profile modal.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
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

@media (max-width: 640px) {
  .user-profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
