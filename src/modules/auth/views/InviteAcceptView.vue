<script setup>
/**
 * InviteAcceptView - Complete registration after accepting invitation
 * 
 * Public page where invited users complete their profile information
 * and set their password to join the platform.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import { getInvitation, registerFromInvite } from '@/api/user.api'
import { Pencil } from 'lucide-vue-next'
import desidiaLogo from '@/assets/desidia.svg'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()
const { t } = useI18n()

// Get token from URL
const token = route.query.token

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const invitationError = ref('')
const invitation = ref(null)

// Avatar color
const avatarColor = ref('#3b82f6')
const colors = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#a855f7', '#6366f1', '#f43f5e']
avatarColor.value = colors[Math.floor(Math.random() * colors.length)]

// Language options
const languageOptions = computed(() => ([
  { label: t('settings.languageOptions.en'), value: 'en' },
  { label: t('settings.languageOptions.no'), value: 'no' }
]))

// Form validation schema
const validationSchema = computed(() => yup.object({
  firstName: yup.string().required(t('auth.invite.validation.firstNameRequired')),
  lastName: yup.string().required(t('auth.invite.validation.lastNameRequired')),
  phone: yup.string(),
  organization: yup.string(),
  salary: yup.number().nullable(),
  language: yup.string(),
  password: yup.string()
    .required(t('auth.validation.passwordRequired'))
    .min(8, t('auth.validation.passwordMin')),
  confirmPassword: yup.string()
    .required(t('auth.validation.confirmPasswordRequired'))
    .oneOf([yup.ref('password')], t('auth.validation.passwordsMustMatch'))
}))

const { handleSubmit, meta, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    firstName: '',
    lastName: '',
    phone: '',
    organization: '',
    salary: null,
    language: 'en',
    password: '',
    confirmPassword: ''
  }
})

const { value: firstName, errorMessage: firstNameError } = useField('firstName')
const { value: lastName, errorMessage: lastNameError } = useField('lastName')
const { value: phone } = useField('phone')
const { value: organization } = useField('organization')
const { value: salary } = useField('salary')
const { value: language } = useField('language')
const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

// Avatar initial
const avatarInitial = computed(() => {
  if (firstName.value) {
    return firstName.value.charAt(0).toUpperCase()
  }
  return t('auth.invite.avatarFallback')
})

// Load invitation details
onMounted(async () => {
  if (!token) {
    invitationError.value = t('auth.invite.errors.noToken')
    isLoading.value = false
    return
  }

  try {
    invitation.value = await getInvitation(token)
  } catch (error) {
    invitationError.value = error?.response?.data?.message || error?.message || t('auth.invite.errors.invalid')
  } finally {
    isLoading.value = false
  }
})

// Submit handler
const onSubmit = handleSubmit(async (values) => {
  if (!token || !invitation.value) return

  isSubmitting.value = true

  try {
    const response = await registerFromInvite({
      token,
      email: invitation.value.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      organization: values.organization,
      language: values.language,
      password: values.password,
      confirmPassword: values.confirmPassword,
      customValues: {
        ...(values.salary !== null && { salary: values.salary })
      }
    })

    uiStore.showApiSuccess(response, t('auth.invite.messages.registered'))
    router.push({ name: 'Login' })
  } catch (error) {
    uiStore.showApiError(error, t('auth.invite.errors.registerFailed'))
  } finally {
    isSubmitting.value = false
  }
})

function goToLogin() {
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <!-- <div class="spinner"></div> -->
        <p class="loading-text">{{ t('auth.invite.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="invitationError" class="error-state">
        <div class="error-icon">
          <i class="pi pi-times"></i>
        </div>
        <h2 class="error-title">{{ t('auth.invite.errors.title') }}</h2>
        <p class="error-text">{{ invitationError }}</p>
        <Button :label="t('auth.invite.actions.goToLogin')" class="auth-primary" @click="goToLogin" />
      </div>

      <!-- Registration Form -->
      <div v-else>
        <!-- Logo -->
        <div class="auth-logo">
          <img :src="desidiaLogo" alt="Desidia" class="auth-logo-icon" />
        </div>

        <!-- Header -->
        <h1 class="auth-title">{{ t('auth.invite.title', { project: invitation?.projectName }) }}</h1>
        <p class="auth-subtitle">{{ t('auth.invite.subtitle') }}</p>

        <!-- Avatar -->
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div 
              class="avatar"
              :style="{ backgroundColor: avatarColor }"
            >
              {{ avatarInitial }}
            </div>
            <button type="button" class="avatar-edit-btn">
              <Pencil class="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="onSubmit" class="auth-form">
          <div class="auth-field">
            <FormInput
              id="invite-first-name"
              v-model="firstName"
              labelClass="auth-label"
              :class="{ 'p-invalid': firstNameError }"
              class="auth-input"
            >
              <template #label>
                {{ t('auth.invite.fields.firstName') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="firstNameError" class="auth-error">{{ firstNameError }}</small>
          </div>
          <div class="auth-field">
            <FormInput
              id="invite-last-name"
              v-model="lastName"
              labelClass="auth-label"
              :class="{ 'p-invalid': lastNameError }"
              class="auth-input"
            >
              <template #label>
                {{ t('auth.invite.fields.lastName') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="lastNameError" class="auth-error">{{ lastNameError }}</small>
          </div>

          <!-- Email (readonly) -->
          <div class="auth-field">
            <FormInput
              id="invite-email"
              :model-value="invitation?.email"
              :label="t('auth.invite.fields.email')"
              labelClass="auth-label"
              disabled
              class="auth-input"
            />
          </div>

          <!-- Phone -->
          <div class="auth-field">
            <FormInput
              id="invite-phone"
              v-model="phone"
              :label="t('auth.invite.fields.phone')"
              labelClass="auth-label"
              class="auth-input"
            />
          </div>

          <!-- Organization -->
          <div class="auth-field">
            <FormInput
              id="invite-organization"
              v-model="organization"
              :label="t('auth.invite.fields.organization')"
              labelClass="auth-label"
              class="auth-input"
            />
          </div>

          <!-- Salary -->
          <div class="auth-field">
            <FormInput
              id="invite-salary"
              v-model="salary"
              as="number"
              :label="t('auth.invite.fields.salary')"
              labelClass="auth-label"
              showButtons
              :min="0"
              class="auth-input-number"
            />
          </div>

          <!-- Language -->
          <div class="auth-field">
            <FormInput
              id="invite-language"
              v-model="language"
              as="select"
              :label="t('auth.invite.fields.language')"
              labelClass="auth-label"
              :options="languageOptions"
              optionLabel="label"
              optionValue="value"
              class="auth-select"
            />
          </div>

          <!-- Password Row -->
          <div class="auth-field">
            <FormInput
              id="invite-password"
              v-model="password"
              as="password"
              labelClass="auth-label"
              :class="{ 'p-invalid': passwordError }"
              :feedback="false"
              toggleMask
              inputClass="auth-input"
              class="auth-password"
            >
              <template #label>
                {{ t('auth.invite.fields.password') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="passwordError" class="auth-error">{{ passwordError }}</small>
          </div>
          <div class="auth-field">
            <FormInput
              id="invite-confirm-password"
              v-model="confirmPassword"
              as="password"
              labelClass="auth-label"
              :class="{ 'p-invalid': confirmPasswordError }"
              :feedback="false"
              toggleMask
              inputClass="auth-input"
              class="auth-password"
            >
              <template #label>
                {{ t('auth.invite.fields.confirmPassword') }} <span class="text-red-500">*</span>
              </template>
            </FormInput>
            <small v-if="confirmPasswordError" class="auth-error">{{ confirmPasswordError }}</small>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <Button
              type="button"
              :label="t('common.cancel')"
              outlined
              severity="secondary"
              class="auth-secondary"
              @click="goToLogin"
              :disabled="isSubmitting"
            />
            <Button
              type="submit"
              :label="t('auth.invite.actions.register')"
              class="auth-primary"
              :loading="isSubmitting"
              :disabled="!meta.valid || isSubmitting"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');

.auth-page {
  min-height: 100svh;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background:
    radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.08), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.12), transparent 45%),
    #f3f6fb;
  font-family: 'Manrope', sans-serif;
}

.auth-card {
  width: 100%;
  max-width: 500px;
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
  border: 1px solid #e5eaf3;
}

.auth-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #2563eb;
  
}

.auth-logo-icon {
  width: 5rem;
}

.auth-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
  text-align: center;
}

.auth-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 1.25rem;
  text-align: center;
}

/* Avatar */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.avatar-edit-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s;
}

.avatar-edit-btn:hover {
  background-color: #f9fafb;
}

/* Form */
.auth-form {
  display: grid;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.auth-field {
  display: grid;
  gap: 0.35rem;
}

.auth-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
}


.auth-input,
.auth-password :deep(input),
.auth-select :deep(.p-select-label) {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-input:focus,
.auth-password :deep(input:focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  outline: none;
}

.auth-password,
.auth-select,
.auth-input-number {
  width: 100%;
}

.auth-input-number :deep(.p-inputnumber-input) {
  border-radius: 8px 0 0 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
}

.auth-error {
  color: #ef4444;
  font-size: 0.75rem;
}

/* Buttons */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.auth-primary {
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  color: #ffffff;
}

.auth-secondary {
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-weight: 500;
  font-size: 0.9rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
}

.auth-secondary:hover {
  background: #f9fafb;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 2rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #6b7280;
  font-size: 0.9rem;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 1rem 0;
}

.error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 1rem;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-size: 1.2rem;
}

.error-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.error-text {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 1.25rem;
}
</style>
