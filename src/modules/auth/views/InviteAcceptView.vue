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
import { useUIStore } from '@/stores'
import { getInvitation, registerFromInvite } from '@/api/user.api'
import { Pencil } from 'lucide-vue-next'

// PrimeVue
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()

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
const languageOptions = [
  { label: 'English', value: 'English' },
  { label: 'Norwegian', value: 'Norwegian' }
]

// Form validation schema
const validationSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  phone: yup.string(),
  organization: yup.string(),
  unit: yup.number().nullable(),
  department: yup.string(),
  language: yup.string(),
  password: yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
  confirmPassword: yup.string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match')
})

const { handleSubmit, meta, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    firstName: '',
    lastName: '',
    phone: '',
    organization: '',
    unit: null,
    department: '',
    language: 'English',
    password: '',
    confirmPassword: ''
  }
})

const { value: firstName, errorMessage: firstNameError } = useField('firstName')
const { value: lastName, errorMessage: lastNameError } = useField('lastName')
const { value: phone } = useField('phone')
const { value: organization } = useField('organization')
const { value: unit } = useField('unit')
const { value: department } = useField('department')
const { value: language } = useField('language')
const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

// Avatar initial
const avatarInitial = computed(() => {
  if (firstName.value) {
    return firstName.value.charAt(0).toUpperCase()
  }
  return 'U'
})

// Load invitation details
onMounted(async () => {
  if (!token) {
    invitationError.value = 'No invitation token provided'
    isLoading.value = false
    return
  }

  try {
    invitation.value = await getInvitation(token)
  } catch (error) {
    invitationError.value = error?.message || 'Invalid or expired invitation'
  } finally {
    isLoading.value = false
  }
})

// Submit handler
const onSubmit = handleSubmit(async (values) => {
  if (!token || !invitation.value) return

  isSubmitting.value = true

  try {
    await registerFromInvite({
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
        ...(values.unit !== null && { unit: values.unit }),
        ...(values.department && { department: values.department })
      }
    })

    uiStore.showSuccess('Registration successful! Please log in.')
    router.push({ name: 'Login' })
  } catch (error) {
    uiStore.showError(error?.message || 'Failed to complete registration')
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
        <div class="spinner"></div>
        <p class="loading-text">Validating invitation...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="invitationError" class="error-state">
        <div class="error-icon">
          <i class="pi pi-times"></i>
        </div>
        <h2 class="error-title">Invalid Invitation</h2>
        <p class="error-text">{{ invitationError }}</p>
        <Button label="Go to Login" class="auth-primary" @click="goToLogin" />
      </div>

      <!-- Registration Form -->
      <div v-else>
        <!-- Logo -->
        <div class="auth-logo">
          <svg viewBox="0 0 24 24" class="auth-logo-icon" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>

        <!-- Header -->
        <h1 class="auth-title">You are invited to join {{ invitation?.projectName }}</h1>
        <p class="auth-subtitle">Complete your details to continue.</p>

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
          <!-- Name Row -->
          <div class="form-row">
            <div class="auth-field">
              <label class="auth-label">
                First name <span class="auth-required">*</span>
              </label>
              <InputText
                v-model="firstName"
                :class="{ 'p-invalid': firstNameError }"
                class="auth-input"
              />
              <small v-if="firstNameError" class="auth-error">{{ firstNameError }}</small>
            </div>
            <div class="auth-field">
              <label class="auth-label">
                Last name <span class="auth-required">*</span>
              </label>
              <InputText
                v-model="lastName"
                :class="{ 'p-invalid': lastNameError }"
                class="auth-input"
              />
              <small v-if="lastNameError" class="auth-error">{{ lastNameError }}</small>
            </div>
          </div>

          <!-- Email (readonly) -->
          <div class="auth-field">
            <label class="auth-label">Email</label>
            <InputText
              :value="invitation?.email"
              disabled
              class="auth-input"
            />
          </div>

          <!-- Phone -->
          <div class="auth-field">
            <label class="auth-label">Phone</label>
            <InputText v-model="phone" class="auth-input" />
          </div>

          <!-- Organization -->
          <div class="auth-field">
            <label class="auth-label">Organization</label>
            <InputText v-model="organization" class="auth-input" />
          </div>

          <!-- Custom fields row -->
          <div class="form-row">
            <div class="auth-field">
              <label class="auth-label">Unit</label>
              <InputNumber
                v-model="unit"
                showButtons
                :min="0"
                class="auth-input-number"
              />
            </div>
            <div class="auth-field">
              <label class="auth-label">Department</label>
              <InputText v-model="department" class="auth-input" />
            </div>
          </div>

          <!-- Language -->
          <div class="auth-field">
            <label class="auth-label">Preferred language</label>
            <Select
              v-model="language"
              :options="languageOptions"
              optionLabel="label"
              optionValue="value"
              class="auth-select"
            />
          </div>

          <!-- Password Row -->
          <div class="form-row">
            <div class="auth-field">
              <label class="auth-label">
                Password <span class="auth-required">*</span>
              </label>
              <Password
                v-model="password"
                :class="{ 'p-invalid': passwordError }"
                :feedback="false"
                toggleMask
                inputClass="auth-input"
                class="auth-password"
              />
              <small v-if="passwordError" class="auth-error">{{ passwordError }}</small>
            </div>
            <div class="auth-field">
              <label class="auth-label">
                Confirm Password <span class="auth-required">*</span>
              </label>
              <Password
                v-model="confirmPassword"
                :class="{ 'p-invalid': confirmPasswordError }"
                :feedback="false"
                toggleMask
                inputClass="auth-input"
                class="auth-password"
              />
              <small v-if="confirmPasswordError" class="auth-error">{{ confirmPasswordError }}</small>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <Button
              type="button"
              label="Cancel"
              class="auth-secondary"
              @click="goToLogin"
              :disabled="isSubmitting"
            />
            <Button
              type="submit"
              label="Register"
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
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.05));
}

.auth-logo-icon {
  width: 28px;
  height: 28px;
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

.auth-required {
  color: #ef4444;
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
