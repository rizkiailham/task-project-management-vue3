<script setup>
/**
 * LoginLinkVerifyView - Verify magic login token
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import desidiaLogo from '@/assets/desidia.svg'

import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const validationSchema = computed(() => yup.object({
  email: yup
    .string()
    .required(t('auth.validation.emailRequired'))
    .email(t('auth.validation.emailInvalid')),
  token: yup
    .string()
    .required(t('auth.loginLink.tokenRequired'))
}))

const { handleSubmit, meta, setFieldValue } = useForm({ validationSchema })
const { value: email, errorMessage: emailError } = useField('email')
const { value: token, errorMessage: tokenError } = useField('token')

const isSubmitting = ref(false)
const didAutoVerify = ref(false)

const redirectPath = computed(() => route.query.redirect || '/app')

onMounted(async () => {
  const presetEmail = route.query.email
  const presetToken = route.query.token
  if (typeof presetEmail === 'string') {
    setFieldValue('email', presetEmail)
  }
  if (typeof presetToken === 'string') {
    setFieldValue('token', presetToken)
  }

  if (typeof presetEmail === 'string' && typeof presetToken === 'string') {
    didAutoVerify.value = true
    await runVerify({ email: presetEmail, token: presetToken })
  }
})

async function runVerify(values) {
  isSubmitting.value = true
  try {
    await authStore.verifyLoginLink({
      email: values.email,
      token: values.token
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
      summary: t('auth.loginLink.verifyFailedTitle'),
      detail: error?.response?.data?.message || error?.message || t('auth.loginLink.verifyFailed'),
      life: 6000
    })
  } finally {
    isSubmitting.value = false
  }
}

const onSubmit = handleSubmit(async (values) => {
  await runVerify(values)
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <img :src="desidiaLogo" alt="Desidia" class="auth-logo-icon" />
      </div>
      <h1 class="auth-title">{{ t('auth.loginLink.verifyTitle') }}</h1>

      <form @submit="onSubmit" class="auth-form">
        <div class="auth-field">
          <FormInput
            id="email"
            v-model="email"
            type="email"
            labelClass="auth-label"
            :placeholder="t('auth.loginLink.emailPlaceholder')"
            class="auth-input"
            :class="{ 'p-invalid': emailError }"
            autocomplete="email"
            :disabled="didAutoVerify && isSubmitting"
          >
            <template #label>
              {{ t('auth.loginLink.email') }} <span class="text-red-500">*</span>
            </template>
          </FormInput>
          <small v-if="emailError" class="auth-error">{{ emailError }}</small>
        </div>

        <div class="auth-field">
          <FormInput
            id="token"
            v-model="token"
            labelClass="auth-label"
            :placeholder="t('auth.loginLink.tokenPlaceholder')"
            class="auth-input"
            :class="{ 'p-invalid': tokenError }"
            autocomplete="one-time-code"
            :disabled="didAutoVerify && isSubmitting"
          >
            <template #label>
              {{ t('auth.loginLink.token') }} <span class="text-red-500">*</span>
            </template>
          </FormInput>
          <small v-if="tokenError" class="auth-error">{{ tokenError }}</small>
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
  margin-bottom: 1.75rem;
}

.auth-form {
  display: grid;
  gap: 1rem;
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
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  color: #ffffff;
}

.auth-footer {
  margin-top: 1.25rem;
  text-align: center;
}

.auth-link {
  color: #2563eb;
  font-weight: 600;
  font-size: 0.85rem;
}
</style>
