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
import desidiaLogo from '@/assets/desidia.svg'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'

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
const isSubmitting = ref(false)
const isSuccess = ref(false)

// Methods
const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    const response = await authStore.requestPasswordReset(values.email)
    isSuccess.value = true
    uiStore.showApiSuccess(response, t('auth.forgotPassword.checkEmail'), t('auth.forgotPassword.emailSent'))
  } catch (error) {
    uiStore.showApiError(error, t('auth.forgotPassword.failedToSend'), t('auth.forgotPassword.requestFailed'))
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <img :src="desidiaLogo" alt="Desidia" class="auth-logo-icon" />
      </div>
      <h1 class="auth-title">{{ t('auth.forgotPassword.title') }}</h1>

      <div v-if="isSuccess" class="auth-success">
        <div class="auth-success-icon">
          <i class="pi pi-check"></i>
        </div>
        <h2 class="auth-success-title">{{ t('auth.forgotPassword.checkEmail') }}</h2>
        <p class="auth-success-text">
          {{ t('auth.forgotPassword.resetLinkSent') }} <strong>{{ email }}</strong>
        </p>
        <router-link :to="{ name: 'Login' }" class="auth-link">
          {{ t('auth.forgotPassword.backToSignIn') }}
        </router-link>
      </div>

      <div v-else class="mt-6">
        <form @submit="onSubmit" class="auth-form">
          <div class="auth-field">
            <FormInput
              id="email"
              v-model="email"
              type="email"
              labelClass="auth-label"
              :placeholder="t('auth.forgotPassword.emailPlaceholder')"
              class="auth-input"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            >
              <template #label>
                {{ t('auth.forgotPassword.email') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="emailError" class="auth-error">{{ emailError }}</small>
          </div>

          <Button
            type="submit"
            :label="t('common.continue')"
            class="auth-primary"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          />
        </form>

        <div class="auth-footer">
          <router-link :to="{ name: 'Login' }" class="auth-link">
            {{ t('auth.forgotPassword.backToSignIn') }}
          </router-link>
        </div>
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
  text-align: center;
}

.auth-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 1.25rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #2563eb;
  
}

.auth-logo-icon {
  width: 5rem;
}

.auth-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.3rem;
}


.auth-form {
  display: grid;
  gap: 1.1rem;
  text-align: left;
}

.auth-field {
  display: grid;
  gap: 0.4rem;
}

.auth-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}


.auth-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.auth-error {
  color: #ef4444;
  font-size: 0.8rem;
}

.auth-primary {
  width: 100%;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  color: #ffffff;
}

.auth-footer {
  margin-top: 1.25rem;
}

.auth-link {
  color: #2563eb;
  font-weight: 600;
  font-size: 0.85rem;
}

.auth-success {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.5rem;
}

.auth-success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto;
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  font-size: 1.2rem;
}

.auth-success-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
}

.auth-success-text {
  font-size: 0.88rem;
  color: #6b7280;
}
</style>
