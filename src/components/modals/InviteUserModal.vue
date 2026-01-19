<script setup>
/**
 * InviteUserModal - Invite User by Email modal form
 * 
 * Simple form to invite users via email with project assignment.
 * Users will complete their details after accepting the email invitation.
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import BaseModal from '@/components/ui/BaseModal.vue'
import { inviteUser } from '@/api/user.api'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'

const userStore = useUserStore()
const uiStore = useUIStore()
const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'invited'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// Loading state
const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  email: yup.string().required(t('users.invite.validation.emailRequired')).email(t('users.invite.validation.emailInvalid')),
  projectIds: yup.array().min(1, t('users.invite.validation.projectRequired'))
})

const { handleSubmit, resetForm } = useForm({
  validationSchema,
  initialValues: {
    email: '',
    projectIds: []
  }
})

const { value: email, errorMessage: emailError } = useField('email')
const { value: projectIds, errorMessage: projectIdsError } = useField('projectIds')

// Computed options for dropdowns
const projectOptions = computed(() => 
  userStore.availableProjects.map(p => ({ label: p.name, value: p.id }))
)

// Watch for modal opening
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    // Fetch project options
    await userStore.initializeOptions()
    resetForm()
  }
})

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const result = await inviteUser({
      email: values.email,
      projectIds: values.projectIds
    })
    
    if (result.userExists) {
      uiStore.showApiSuccess(result, t('users.invite.messages.userExists'))
    } else {
      uiStore.showApiSuccess(result, t('users.invite.messages.sent'))
    }
    
    emit('invited')
    dialogVisible.value = false
  } catch (error) {
    uiStore.showApiError(error, t('users.invite.errors.send'))
  } finally {
    isLoading.value = false
  }
})

function closeModal() {
  dialogVisible.value = false
}
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="t('users.invite.title')"
    width="450px"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :loading="isLoading"
  >
    <template #header>
      <div class="flex flex-col">
        <h2 class="text-base font-medium text-gray-900">{{ t('users.invite.title') }}</h2>
        <p class="mt-0.5 text-xs text-gray-500">
          {{ t('users.invite.subtitle') }}
        </p>
      </div>
    </template>

    <form @submit.prevent="onSubmit" class="space-y-5">
      <!-- Email Field -->
      <div class="flex flex-col">
        <FormInput
          id="invite-email"
          v-model="email"
          type="email"
          labelClass="mb-1.5 text-xs text-gray-500"
          :placeholder="t('users.invite.placeholders.email')"
          class="w-full"
          :class="{ 'p-invalid': emailError }"
        >
          <template #label>
            {{ t('users.fields.email') }} <span class="text-red-500">*</span>
          </template>
        </FormInput>
        <small v-if="emailError" class="mt-1 text-xs text-red-500">
          {{ emailError }}
        </small>
      </div>

      <!-- Project(s) Field -->
      <div class="flex flex-col">
        <label class="mb-1.5 text-xs text-gray-500">
          {{ t('users.invite.fields.projects') }} <span class="text-red-500">*</span>
        </label>
        <FormInput
          v-model="projectIds"
          as="multiselect"
          :options="projectOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('users.invite.placeholders.projects')"
          display="chip"
          filter
          filterPlaceholder="Search..."
          class="w-full"
          :class="{ 'p-invalid': projectIdsError }"
        />
        <small v-if="projectIdsError" class="mt-1 text-xs text-red-500">
          {{ projectIdsError }}
        </small>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="closeModal"
          :disabled="isLoading"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          @click="onSubmit"
          :disabled="isLoading"
        >
          <svg
            v-if="isLoading"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? t('users.invite.sending') : t('users.invite.cta') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
:deep(.p-multiselect) {
  width: 100%;
}

:deep(.p-multiselect-label) {
  padding: 10px 12px;
}
</style>
