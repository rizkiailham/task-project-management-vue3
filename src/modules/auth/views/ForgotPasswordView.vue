<script setup>
/**
 * ForgotPasswordView - Password reset request page
 */
import { ref } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useAuthStore, useUIStore } from '@/stores'

// PrimeVue
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

const authStore = useAuthStore()
const uiStore = useUIStore()

// Form validation schema
const validationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email')
})

// Form setup
const { handleSubmit, meta } = useForm({
  validationSchema
})

const { value: email, errorMessage: emailError } = useField('email')

// Local state
const serverError = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)

// Methods
const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  serverError.value = ''
  
  try {
    await authStore.requestPasswordReset(values.email)
    isSuccess.value = true
    uiStore.showSuccess('Check your email for reset instructions')
  } catch (error) {
    serverError.value = error.message || 'Failed to send reset email'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="forgot-password-page">
    <div class="forgot-password-container">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="logo-icon mx-auto">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">Reset your password</h1>
        <p class="mt-2 text-base text-gray-600">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <!-- Success State -->
      <div v-if="isSuccess" class="form-card">
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <i class="pi pi-check text-xl text-green-600"></i>
          </div>
          <h2 class="mt-4 text-lg font-semibold text-gray-900">Check your email</h2>
          <p class="mt-2 text-sm text-gray-600">
            We've sent a password reset link to <strong>{{ email }}</strong>
          </p>
          <router-link
            :to="{ name: 'Login' }"
            class="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            ← Back to sign in
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
          <!-- Email Field -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-semibold text-gray-700">
              Email address
            </label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            />
            <small v-if="emailError" class="text-red-500">{{ emailError }}</small>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            label="Send reset link"
            class="w-full justify-center"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          />
        </form>

        <!-- Back Link -->
        <p class="mt-6 text-center text-sm text-gray-600">
          <router-link
            :to="{ name: 'Login' }"
            class="font-semibold text-primary-600 hover:text-primary-700"
          >
            ← Back to sign in
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forgot-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  background-color: #f9fafb;
  overflow: hidden;
}

.forgot-password-container {
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
</style>

