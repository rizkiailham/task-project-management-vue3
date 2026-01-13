<script setup>
/**
 * LoginLinkRequestView - Request magic login link
 */
import { ref, computed } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'

import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'

const authStore = useAuthStore()
const toast = useToast()

const validationSchema = computed(() => yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
}))

const { handleSubmit, meta } = useForm({ validationSchema })
const { value: email, errorMessage: emailError } = useField('email')

const isSubmitting = ref(false)
const isSuccess = ref(false)

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await authStore.requestLoginLink(values.email)
    isSuccess.value = true
    toast.add({
      severity: 'success',
      summary: 'Link sent',
      detail: 'Login link sent',
      life: 4000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Request failed',
      detail: error.message || 'Failed to send login link',
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
        <svg viewBox="0 0 24 24" class="auth-logo-icon" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h1 class="auth-title">Login with link</h1>

      <div v-if="isSuccess" class="auth-success">
        <div class="auth-success-icon">
          <i class="pi pi-check"></i>
        </div>
        <h2 class="auth-success-title">Check your email</h2>
        <p class="auth-success-text">
          We sent a login link to <strong>{{ email }}</strong>
        </p>
      </div>

      <div v-else>
        <form @submit="onSubmit" class="auth-form">
          <div class="auth-field">
            <FormInput
              id="email"
              v-model="email"
              type="email"
              labelClass="auth-label"
              placeholder="Enter your email"
              class="auth-input"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            >
              <template #label>
                Email <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="emailError" class="auth-error">{{ emailError }}</small>
          </div>

          <Button
            type="submit"
            label="Send Link"
            class="auth-primary"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          />
        </form>

        <div class="auth-footer">
          <router-link :to="{ name: 'Login' }" class="auth-link">← Back</router-link>
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
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.05));
}

.auth-logo-icon {
  width: 28px;
  height: 28px;
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
