<script setup>
/**
 * AccountSettingsView - Account security settings
 */
import { ref } from 'vue'
import { useAuthStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Password from 'primevue/password'
import Button from 'primevue/button'

const authStore = useAuthStore()
const uiStore = useUIStore()

const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain a lowercase letter')
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/[0-9]/, 'Password must contain a number'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
})

const { handleSubmit, meta, resetForm } = useForm({ validationSchema })

const { value: currentPassword, errorMessage: currentPasswordError } = useField('currentPassword')
const { value: newPassword, errorMessage: newPasswordError } = useField('newPassword')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await authStore.changePassword(values.currentPassword, values.newPassword)
    uiStore.showSuccess('Password changed successfully')
    resetForm()
  } catch (error) {
    uiStore.showError(error.message || 'Failed to change password')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
      <h2 class="mb-6 text-lg font-semibold text-gray-900 dark-edit:text-white">Change Password</h2>
      
      <form @submit="onSubmit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
            Current Password
          </label>
          <Password 
            v-model="currentPassword" 
            :feedback="false"
            toggleMask
            class="w-full"
            :class="{ 'p-invalid': currentPasswordError }"
            :pt="{ root: { class: 'w-full' }, input: { class: 'w-full' } }"
          />
          <small v-if="currentPasswordError" class="text-red-500">{{ currentPasswordError }}</small>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
            New Password
          </label>
          <Password 
            v-model="newPassword" 
            toggleMask
            class="w-full"
            :class="{ 'p-invalid': newPasswordError }"
            :pt="{ root: { class: 'w-full' }, input: { class: 'w-full' } }"
          />
          <small v-if="newPasswordError" class="text-red-500">{{ newPasswordError }}</small>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
            Confirm New Password
          </label>
          <Password 
            v-model="confirmPassword" 
            :feedback="false"
            toggleMask
            class="w-full"
            :class="{ 'p-invalid': confirmPasswordError }"
            :pt="{ root: { class: 'w-full' }, input: { class: 'w-full' } }"
          />
          <small v-if="confirmPasswordError" class="text-red-500">{{ confirmPasswordError }}</small>
        </div>

        <div class="flex justify-end pt-4">
          <Button 
            type="submit" 
            label="Change Password" 
            :loading="isLoading"
            :disabled="!meta.valid"
          />
        </div>
      </form>
    </div>

    <!-- Sessions -->
    <div class="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">Active Sessions</h2>
      <p class="text-sm text-gray-500 dark-edit:text-gray-400">
        Manage your active sessions across devices.
      </p>
      <div class="mt-4 flex items-center justify-between rounded-lg border border-gray-100 p-3 dark-edit:border-gray-700">
        <div class="flex items-center gap-3">
          <i class="pi pi-desktop text-xl text-gray-400"></i>
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">Current Session</p>
            <p class="text-xs text-gray-500 dark-edit:text-gray-400">This device</p>
          </div>
        </div>
        <span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark-edit:bg-green-900/20 dark-edit:text-green-400">
          Active
        </span>
      </div>
    </div>
  </div>
</template>

