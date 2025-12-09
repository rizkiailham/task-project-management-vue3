<script setup>
/**
 * ForgotPasswordView - Password reset request page
 * With localization support (en/no)
 */
import { ref, computed } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useUIStore } from '@/stores'

// PrimeVue
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Form validation schema with localized messages
const validationSchema = computed(() => yup.object({
  email: yup
    .string()
    .required(t('auth.validation.emailRequired'))
    .email(t('auth.validation.emailInvalid'))
}))

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
    uiStore.showSuccess(t('auth.forgotPassword.checkEmail'))
  } catch (error) {
    serverError.value = error.message || t('auth.forgotPassword.failedToSend')
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
        <h1 class="mt-4 text-2xl font-bold text-gray-900">{{ t('auth.forgotPassword.title') }}</h1>
        <p class="mt-2 text-base text-gray-600">
          {{ t('auth.forgotPassword.subtitle') }}
        </p>
      </div>

      <!-- Success State -->
      <div v-if="isSuccess" class="form-card">
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <i class="pi pi-check text-xl text-green-600"></i>
          </div>
          <h2 class="mt-4 text-lg font-semibold text-gray-900">{{ t('auth.forgotPassword.checkEmail') }}</h2>
          <p class="mt-2 text-sm text-gray-600">
            {{ t('auth.forgotPassword.resetLinkSent') }} <strong>{{ email }}</strong>
          </p>
          <router-link
            :to="{ name: 'Login' }"
            class="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            ← {{ t('auth.forgotPassword.backToSignIn') }}
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
              {{ t('auth.forgotPassword.email') }}
            </label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.forgotPassword.emailPlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            />
            <small v-if="emailError" class="text-red-500">{{ emailError }}</small>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            :label="t('auth.forgotPassword.sendResetLink')"
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
            ← {{ t('auth.forgotPassword.backToSignIn') }}
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
  background: linear-gradient(135deg, #f97316 0%, #7c3aed 100%);
  color: white;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>

