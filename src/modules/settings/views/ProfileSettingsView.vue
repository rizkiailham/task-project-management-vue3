<script setup>
/**
 * ProfileSettingsView - User profile settings
 */
import { ref, computed } from 'vue'
import { useAuthStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import FileUpload from 'primevue/fileupload'

const authStore = useAuthStore()
const uiStore = useUIStore()

const user = computed(() => authStore.user)
const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().required('Email is required').email('Invalid email format')
})

const { handleSubmit, meta } = useForm({
  validationSchema,
  initialValues: {
    name: user.value?.name || '',
    email: user.value?.email || ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: email, errorMessage: emailError } = useField('email')

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await authStore.updateProfile(values)
    uiStore.showSuccess('Profile updated successfully')
  } catch (error) {
    uiStore.showError('Failed to update profile')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
      
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
          <Button label="Change Avatar" outlined size="small" />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>
      </div>

      <form @submit="onSubmit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <InputText 
            v-model="name" 
            class="w-full"
            :class="{ 'p-invalid': nameError }"
          />
          <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <InputText 
            v-model="email" 
            type="email"
            class="w-full"
            :class="{ 'p-invalid': emailError }"
          />
          <small v-if="emailError" class="text-red-500">{{ emailError }}</small>
        </div>

        <div class="flex justify-end pt-4">
          <Button 
            type="submit" 
            label="Save Changes" 
            :loading="isLoading"
            :disabled="!meta.valid"
          />
        </div>
      </form>
    </div>
  </div>
</template>

