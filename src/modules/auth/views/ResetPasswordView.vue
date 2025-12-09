<script setup>
/**
 * ResetPasswordView - Set new password page
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useAuthStore, useUIStore } from '@/stores'

// PrimeVue
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Get token from URL
const token = route.query.token

// Form validation schema
const validationSchema = yup.object({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain a lowercase letter')
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/[0-9]/, 'Password must contain a number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match')
})

// Form setup
const { handleSubmit, meta } = useForm({
  validationSchema
})

const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

// Local state
const serverError = ref('')
const isSubmitting = ref(false)

// Methods
const onSubmit = handleSubmit(async (values) => {
  if (!token) {
    serverError.value = 'Invalid or missing reset token'
    return
  }
  
  isSubmitting.value = true
  serverError.value = ''
  
  try {
    await authStore.resetPassword({
      token,
      password: values.password
    })
    
    uiStore.showSuccess('Password reset successfully!')
    router.push({ name: 'Login' })
  } catch (error) {
    serverError.value = error.message || 'Failed to reset password'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="reset-password-page">
    <div class="reset-password-container">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="logo-icon mx-auto">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">Set new password</h1>
        <p class="mt-2 text-base text-gray-600">
          Create a strong password for your account
        </p>
      </div>

      <!-- Invalid Token State -->
      <div v-if="!token" class="form-card">
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <i class="pi pi-times text-xl text-red-600"></i>
          </div>
          <h2 class="mt-4 text-lg font-semibold text-gray-900">Invalid reset link</h2>
          <p class="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <router-link
            :to="{ name: 'ForgotPassword' }"
            class="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Request a new reset link
          </router-link>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="form-card">
        <!-- Error Message -->
        <Message v-if="serverError" severity="error" :closable="false" class="mb-4">
          {{ serverError }}
        </Message>

        <form @submit="onSubmit" class="space-y-5">
          <!-- Password Field -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-gray-700">
              New password
            </label>
            <Password
              id="password"
              v-model="password"
              placeholder="Create a strong password"
              :class="{ 'p-invalid': passwordError }"
              toggleMask
              autocomplete="new-password"
              inputClass="w-full"
              class="password-input-full"
            />
            <small v-if="passwordError" class="text-red-500">{{ passwordError }}</small>
          </div>

          <!-- Confirm Password Field -->
          <div class="space-y-2">
            <label for="confirmPassword" class="block text-sm font-semibold text-gray-700">
              Confirm new password
            </label>
            <Password
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm your password"
              :class="{ 'p-invalid': confirmPasswordError }"
              :feedback="false"
              toggleMask
              autocomplete="new-password"
              inputClass="w-full"
              class="password-input-full"
            />
            <small v-if="confirmPasswordError" class="text-red-500">{{ confirmPasswordError }}</small>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            label="Reset password"
            class="w-full justify-center"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reset-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  background-color: #f9fafb;
  overflow: hidden;
}

.reset-password-container {
  width: 100%;
  max-width: 420px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Fix password input width */
.password-input-full {
  width: 100%;
}

.password-input-full :deep(input) {
  width: 100%;
}

.password-input-full :deep(.p-password) {
  width: 100%;
}

.password-input-full :deep(.p-inputtext) {
  width: 100%;
}
</style>

