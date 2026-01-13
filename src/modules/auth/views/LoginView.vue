<script setup>
/**
 * LoginView - User authentication page
 *
 * Features:
 * - Email/password login
 * - Form validation with VeeValidate + Yup
 * - Remember me option
 * - Social login placeholders
 * - Localization support (en/no)
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// Form validation schema with localized messages
const validationSchema = computed(() => yup.object({
  email: yup
    .string()
    .required(t('auth.validation.emailRequired'))
    .email(t('auth.validation.emailInvalid')),
  password: yup
    .string()
    .required(t('auth.validation.passwordRequired'))
    .min(8, t('auth.validation.passwordMin'))
}))

// Form setup
const { handleSubmit, meta } = useForm({
  validationSchema
})

const { value: email, errorMessage: emailError } = useField('email')
const { value: password, errorMessage: passwordError } = useField('password')

// Local state
const isSubmitting = ref(false)

// Computed
const redirectPath = computed(() => route.query.redirect || '/app')

// Methods
const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await authStore.login({
      email: values.email,
      password: values.password,
      // rememberMe: rememberMe.value
    })

    toast.add({
      severity: 'success',
      summary: t('auth.login.loginSuccessful'),
      detail: t('auth.login.welcomeBack'),
      life: 4000
    })
    router.push(redirectPath.value)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Login failed',
      detail: error.message || t('auth.login.invalidCredentials'),
      life: 6000
    })
  } finally {
    isSubmitting.value = false
  }
})

function handleSocialLogin(provider) {
  window.location.href = `${apiBaseUrl}/auth/${provider}`
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 24 24" class="auth-logo-icon" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h1 class="auth-title">Login to Desidia</h1>

      <form @submit="onSubmit" class="auth-form">
        <div class="auth-field">
          <FormInput
            id="email"
            v-model="email"
            type="email"
            labelClass="auth-label"
            :placeholder="t('auth.login.emailPlaceholder')"
            class="auth-input"
            :class="{ 'p-invalid': emailError }"
            autocomplete="email"
          >
            <template #label>
              {{ t('auth.login.email') }} <span class="text-red-500">*</span>
            </template>
          </FormInput>
          <small v-if="emailError" class="auth-error">{{ emailError }}</small>
        </div>

        <div class="auth-field">
          <FormInput
            id="password"
            v-model="password"
            as="password"
            labelClass="auth-label"
            :placeholder="t('auth.login.passwordPlaceholder')"
            :class="{ 'p-invalid': passwordError }"
            :feedback="false"
            toggleMask
            autocomplete="current-password"
            inputClass="auth-input"
            class="auth-password"
          >
            <template #label>
              {{ t('auth.login.password') }} <span class="text-red-500">*</span>
            </template>
          </FormInput>
          <small v-if="passwordError" class="auth-error">{{ passwordError }}</small>
        </div>

        <Button
          type="submit"
          label="Log In"
          class="auth-primary"
          :loading="isSubmitting"
          :disabled="!meta.valid || isSubmitting"
        />
      </form>

      <div class="auth-divider">
        <span>{{ t('auth.login.orContinueWith') }}</span>
      </div>

      <div class="auth-actions">
        <Button
          outlined
          severity="secondary"
          class="auth-secondary"
          @click="handleSocialLogin('google')"
        >
          <svg class="auth-social-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Login with Google</span>
        </Button>
        <Button
          outlined
          severity="secondary"
          class="auth-secondary"
          @click="handleSocialLogin('microsoft')"
        >
          <i class="pi pi-microsoft auth-social-ms"></i>
          <span>Login with Entra</span>
        </Button>
      </div>

      <div class="auth-footer">
        <router-link :to="{ name: 'ForgotPassword' }" class="auth-link">
          Forgot password?
        </router-link>
        <router-link :to="{ name: 'ForgotPassword' }" class="auth-link">
          Log in with link
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');

.auth-page {
  min-height: 100svh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background:
    radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.08), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.12), transparent 45%),
    #f3f6fb;
  font-family: 'Manrope', sans-serif;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  padding: 2.25rem 2.25rem 2rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
  border: 1px solid #e5eaf3;
}

.auth-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 1.25rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #2563eb;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.05));
}

.auth-logo-icon {
  width: 28px;
  height: 28px;
}

.auth-title {
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.75rem;
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.auth-field {
  display: grid;
  gap: 0.4rem;
}

.auth-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}


.auth-input,
.auth-password :deep(input) {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-input:focus,
.auth-password :deep(input:focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.auth-password {
  width: 100%;
}

.auth-password :deep(.p-password) {
  width: 100%!important;
}

.auth-error {
  color: #ef4444;
  font-size: 0.8rem;
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-remember {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth-remember-label {
  font-size: 0.85rem;
  color: #6b7280;
}

.auth-primary {
  width: 100%;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  color: #ffffff;
}

.auth-divider {
  display: grid;
  align-items: center;
  text-align: center;
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 1.5rem 0 1rem;
  position: relative;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  height: 1px;
  background: #e2e8f0;
  position: absolute;
  top: 50%;
  width: 35%;
}

.auth-divider::before {
  left: 0;
}

.auth-divider::after {
  right: 0;
}

.auth-actions {
  display: grid;
  gap: 0.75rem;
}

.auth-secondary {
  width: 100%;
  border-radius: 10px;
  padding: 0.55rem 1rem;
  justify-content: center;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #1f2937;
}

.auth-social-icon {
  width: 18px;
  height: 18px;
  margin-right: 0.6rem;
}

.auth-social-ms {
  font-size: 1rem;
  margin-right: 0.6rem;
}

.auth-link {
  color: #2563eb;
  font-weight: 600;
  font-size: 0.85rem;
}

.auth-footer {
  margin-top: 1.5rem;
  display: grid;
  gap: 0.5rem;
  text-align: center;
}
</style>
