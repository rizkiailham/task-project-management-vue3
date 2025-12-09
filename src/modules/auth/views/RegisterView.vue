<script setup>
/**
 * RegisterView - User registration page
 * With localization support (en/no)
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useUIStore } from '@/stores'

// PrimeVue
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Form validation schema with localized messages
const validationSchema = computed(() => yup.object({
  name: yup
    .string()
    .required(t('auth.validation.nameRequired'))
    .min(2, t('auth.validation.nameMin')),
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
const { handleSubmit, meta } = useForm({
  validationSchema
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: email, errorMessage: emailError } = useField('email')
const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')

// Local state
const acceptTerms = ref(false)
const serverError = ref('')
const isSubmitting = ref(false)

// Methods
const onSubmit = handleSubmit(async (values) => {
  if (!acceptTerms.value) {
    serverError.value = t('auth.validation.acceptTermsRequired')
    return
  }

  isSubmitting.value = true
  serverError.value = ''

  try {
    await authStore.register({
      name: values.name,
      email: values.email,
      password: values.password
    })

    uiStore.showSuccess(t('auth.register.accountCreated'), t('auth.register.welcomeTo'))
    router.push({ name: 'Home' })
  } catch (error) {
    serverError.value = error.message || 'Registration failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="register-page">
    <!-- Left Panel - Illustration -->
    <div class="register-illustration-panel">
      <div class="max-w-md text-center text-white">
        <h2 class="text-3xl font-bold">{{ t('promo.startJourney') }}</h2>
        <p class="mt-4 text-lg opacity-90">
          {{ t('promo.joinTeams') }}
        </p>

        <!-- Stats -->
        <div class="mt-12 grid grid-cols-3 gap-6">
          <div>
            <div class="text-3xl font-bold">10K+</div>
            <div class="text-sm opacity-75">{{ t('promo.stats.activeUsers') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold">500K+</div>
            <div class="text-sm opacity-75">{{ t('promo.stats.tasksCompleted') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold">99.9%</div>
            <div class="text-sm opacity-75">{{ t('promo.stats.uptime') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel - Form -->
    <div class="register-form-panel">
      <div class="register-form-container">
        <!-- Logo -->
        <div class="mb-8">
          <div class="flex items-center gap-3">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span class="text-2xl font-bold text-gray-900">{{ t('common.appName') }}</span>
          </div>
        </div>

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">{{ t('auth.register.title') }}</h1>
          <p class="mt-2 text-base text-gray-600">
            {{ t('auth.register.subtitle') }}
          </p>
        </div>

        <!-- Error Message -->
        <Message v-if="serverError" severity="error" :closable="false" class="mb-4">
          {{ serverError }}
        </Message>

        <!-- Register Form -->
        <form @submit="onSubmit" class="space-y-5">
          <!-- Name Field -->
          <div class="space-y-2">
            <label for="name" class="block text-sm font-semibold text-gray-700">
              {{ t('auth.register.fullName') }}
            </label>
            <InputText
              id="name"
              v-model="name"
              type="text"
              :placeholder="t('auth.register.fullNamePlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': nameError }"
              autocomplete="name"
            />
            <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
          </div>

          <!-- Email Field -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-semibold text-gray-700">
              {{ t('auth.register.email') }}
            </label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.register.emailPlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': emailError }"
              autocomplete="email"
            />
            <small v-if="emailError" class="text-red-500">{{ emailError }}</small>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-gray-700">
              {{ t('auth.register.password') }}
            </label>
            <Password
              id="password"
              v-model="password"
              :placeholder="t('auth.register.passwordPlaceholder')"
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
              {{ t('auth.register.confirmPassword') }}
            </label>
            <Password
              id="confirmPassword"
              v-model="confirmPassword"
              :placeholder="t('auth.register.confirmPasswordPlaceholder')"
              :class="{ 'p-invalid': confirmPasswordError }"
              :feedback="false"
              toggleMask
              autocomplete="new-password"
              inputClass="w-full"
              class="password-input-full"
            />
            <small v-if="confirmPasswordError" class="text-red-500">{{ confirmPasswordError }}</small>
          </div>

          <!-- Terms -->
          <div class="flex items-start gap-2">
            <Checkbox v-model="acceptTerms" inputId="terms" :binary="true" class="mt-0.5" />
            <label for="terms" class="text-sm text-gray-600 cursor-pointer">
              {{ t('auth.register.acceptTerms') }}
              <a href="#" class="text-primary-600 hover:underline font-medium">{{ t('auth.register.termsOfService') }}</a>
              {{ t('common.and') }}
              <a href="#" class="text-primary-600 hover:underline font-medium">{{ t('auth.register.privacyPolicy') }}</a>
            </label>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            :label="t('auth.register.createAccount')"
            class="w-full justify-center"
            :loading="isSubmitting"
            :disabled="!meta.valid || !acceptTerms || isSubmitting"
          />
        </form>

        <!-- Sign In Link -->
        <p class="mt-8 text-center text-sm text-gray-600">
          {{ t('auth.register.hasAccount') }}
          <router-link
            :to="{ name: 'Login' }"
            class="font-semibold text-primary-600 hover:text-primary-700"
          >
            {{ t('auth.register.signIn') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

.register-illustration-panel {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50%;
  padding: 3rem;
  background: linear-gradient(135deg, #f97316 0%, #6d28d9 100%);
}

@media (min-width: 1024px) {
  .register-illustration-panel {
    display: flex;
  }
}

.register-form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding: 2rem;
  background-color: #f9fafb;
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .register-form-panel {
    width: 50%;
    padding: 3rem 4rem;
  }
}

.register-form-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f97316 0%, #7c3aed 100%);
  color: white;
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

