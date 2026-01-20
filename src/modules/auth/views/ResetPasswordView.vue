<script setup>
/**
 * ResetPasswordView - Set new password page
 * With localization support (en/no)
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import desidiaLogo from '@/assets/desidia.svg'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

// Get token/email from URL (supports base64 payload in query string)
const token = ref('')

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
    .matches(/[a-z]/, t('auth.validation.passwordLowercase'))
    .matches(/[A-Z]/, t('auth.validation.passwordUppercase'))
    .matches(/[0-9]/, t('auth.validation.passwordNumber')),
  confirmPassword: yup
    .string()
    .required(t('auth.validation.confirmPasswordRequired'))
    .oneOf([yup.ref('password')], t('auth.validation.passwordsMustMatch'))
}))

// Form setup
const { handleSubmit, meta, setFieldValue } = useForm({
  validationSchema
})

const { value: email, errorMessage: emailError } = useField('email')
const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

function parseResetPayload() {
  const queryToken = route.query.token
  const queryEmail = route.query.email

  if (typeof queryToken === 'string') {
    token.value = queryToken
  }
  if (typeof queryEmail === 'string') {
    setFieldValue('email', queryEmail)
  }

  const queryKeys = Object.keys(route.query || {})
  const hasSingleEncodedParam = queryKeys.length === 1 && route.query[queryKeys[0]] === ''

  if (hasSingleEncodedParam) {
    const rawEncoded = queryKeys[0]
    parseBase64Params(rawEncoded)
    return
  }

  if (!token.value && !email.value) {
    const rawSearch = window.location.search?.slice(1) || ''
    if (rawSearch) {
      parseBase64Params(rawSearch)
    }
  }
}

function parseBase64Params(rawValue) {
  try {
    const normalized = decodeURIComponent(rawValue).replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    const params = new URLSearchParams(decoded)
    const decodedToken = params.get('token')
    const decodedEmail = params.get('email')
    if (decodedToken) {
      token.value = decodedToken
    }
    if (decodedEmail) {
      setFieldValue('email', decodedEmail)
    }
  } catch (error) {
    // Ignore invalid payloads and let standard query params handle it.
  }
}

onMounted(() => {
  parseResetPayload()
})

// Local state
const isSubmitting = ref(false)

// Methods
const onSubmit = handleSubmit(async (values) => {
  if (!token.value) {
    toast.add({
      severity: 'error',
      summary: t('auth.resetPassword.invalidLinkTitle'),
      detail: t('auth.resetPassword.invalidLink'),
      life: 6000
    })
    return
  }

  isSubmitting.value = true

  try {
    await authStore.resetPassword({
      email: values.email,
      token: token.value,
      password: values.password,
      confirmPassword: values.confirmPassword
    })

    toast.add({
      severity: 'success',
      summary: t('auth.resetPassword.resetSuccessTitle'),
      detail: t('auth.resetPassword.passwordResetSuccess'),
      life: 4000
    })
    router.push({ name: 'Login' })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('auth.resetPassword.resetFailedTitle'),
      detail: error?.response?.data?.message || error?.message || t('auth.resetPassword.resetFailed'),
      life: 6000
    })
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
      <h1 class="auth-title">{{ t('auth.resetPassword.title') }}</h1>

      <div v-if="!token" class="auth-success">
        <div class="auth-error-icon">
          <i class="pi pi-times"></i>
        </div>
        <h2 class="auth-success-title">{{ t('auth.resetPassword.invalidLink') }}</h2>
        <p class="auth-success-text">
          {{ t('auth.resetPassword.linkExpired') }}
        </p>
        <router-link :to="{ name: 'ForgotPassword' }" class="auth-link">
          {{ t('auth.resetPassword.requestNewLink') }}
        </router-link>
      </div>

      <div v-else>
        <form @submit="onSubmit" class="auth-form">
          <div class="auth-field">
            <FormInput
              id="email"
              v-model="email"
              type="email"
              labelClass="auth-label"
              :placeholder="t('auth.resetPassword.emailPlaceholder')"
              class="auth-input"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            >
              <template #label>
                {{ t('auth.resetPassword.email') }} <span class="text-red-500">*</span>
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
              :placeholder="t('auth.resetPassword.newPasswordPlaceholder')"
              :class="{ 'p-invalid': passwordError }"
              toggleMask
              autocomplete="new-password"
              inputClass="auth-input"
              class="auth-password"
            >
              <template #label>
                {{ t('auth.resetPassword.newPassword') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="passwordError" class="auth-error">{{ passwordError }}</small>
          </div>

          <div class="auth-field">
            <FormInput
              id="confirmPassword"
              v-model="confirmPassword"
              as="password"
              labelClass="auth-label"
              :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
              :class="{ 'p-invalid': confirmPasswordError }"
              :feedback="false"
              toggleMask
              autocomplete="new-password"
              inputClass="auth-input"
              class="auth-password"
            >
              <template #label>
                {{ t('auth.resetPassword.confirmPassword') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="confirmPasswordError" class="auth-error">{{ confirmPasswordError }}</small>
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

.auth-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
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

.auth-link {
  color: #2563eb;
  font-weight: 600;
  font-size: 0.85rem;
}

.auth-footer {
  margin-top: 1.25rem;
  text-align: center;
}

.auth-success {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.5rem;
}

.auth-error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
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
