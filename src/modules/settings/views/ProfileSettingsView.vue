<script setup>
/**
 * ProfileSettingsView - User profile settings
 */
import { ref, computed } from 'vue'
import { useAuthStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import FileUpload from 'primevue/fileupload'

const authStore = useAuthStore()
const uiStore = useUIStore()
const { t } = useI18n()

const user = computed(() => authStore.user)
const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  firstName: yup.string().required(t('users.validation.firstNameRequired')).min(2, t('settings.profileView.validation.firstNameMin')),
  lastName: yup.string().required(t('users.validation.lastNameRequired')).min(2, t('settings.profileView.validation.lastNameMin'))
})

const { handleSubmit, meta } = useForm({
  validationSchema,
  initialValues: {
    firstName: user.value?.firstName || user.value?.name?.split(' ')[0] || '',
    lastName: user.value?.lastName || user.value?.name?.split(' ').slice(1).join(' ') || ''
  }
})

const { value: firstName, errorMessage: firstNameError } = useField('firstName')
const { value: lastName, errorMessage: lastNameError } = useField('lastName')

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const response = await authStore.updateProfile({
      firstName: values.firstName,
      lastName: values.lastName
    })
    uiStore.showApiSuccess(response, t('settings.profileView.messages.updated'))
  } catch (error) {
    uiStore.showApiError(error, t('settings.profileView.errors.update'))
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
      <h2 class="mb-6 text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('settings.profile') }}</h2>
      
      <!-- Avatar -->
      <div class="mb-6 flex items-center gap-4">
        <Avatar 
          :label="authStore.userInitials"
          :image="user?.avatar"
          shape="circle"
          size="xlarge"
          class="bg-primary-100 text-primary-700"
        />
        <div>
          <Button :label="t('settings.profileView.actions.changeAvatar')" outlined size="small" />
          <p class="mt-1 text-xs text-gray-500 dark-edit:text-gray-400">
            {{ t('settings.profileView.avatarHelp') }}
          </p>
        </div>
      </div>

      <form @submit="onSubmit" class="space-y-4">
        <div>
          <FormInput
            id="profile-first-name"
            v-model="firstName" 
            :label="t('users.fields.firstName')"
            labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
            class="w-full"
            :class="{ 'p-invalid': firstNameError }"
          />
          <small v-if="firstNameError" class="text-red-500">{{ firstNameError }}</small>
        </div>

        <div>
          <FormInput
            id="profile-last-name"
            v-model="lastName" 
            :label="t('users.fields.lastName')"
            labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
            class="w-full"
            :class="{ 'p-invalid': lastNameError }"
          />
          <small v-if="lastNameError" class="text-red-500">{{ lastNameError }}</small>
        </div>

        <div>
          <FormInput
            id="profile-email"
            :model-value="user?.email || ''"
            type="email"
            :label="t('settings.profileView.fields.emailAddress')"
            labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
            class="w-full"
            disabled
          />
        </div>

        <div class="flex justify-end pt-4">
          <Button 
            type="submit" 
            :label="t('common.saveChanges')" 
            :loading="isLoading"
            :disabled="!meta.valid"
          />
        </div>
      </form>
    </div>
  </div>
</template>
