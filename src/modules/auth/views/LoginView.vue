<script setup>
/**
 * LoginView - User authentication page
 * 
 * Features:
 * - Email/password login
 * - Form validation with VeeValidate + Yup
 * - Remember me option
 * - Social login placeholders
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useAuthStore, useUIStore } from '@/stores'

// PrimeVue
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Form validation schema
const validationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
})

// Form setup
const { handleSubmit, errors, meta } = useForm({
  validationSchema
})

const { value: email, errorMessage: emailError } = useField('email')
const { value: password, errorMessage: passwordError } = useField('password')

// Local state
const rememberMe = ref(false)
const serverError = ref('')
const isSubmitting = ref(false)

// Computed
const redirectPath = computed(() => route.query.redirect || '/app')

// Methods
const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  serverError.value = ''
  
  try {
    await authStore.login({
      email: values.email,
      password: values.password,
      rememberMe: rememberMe.value
    })
    
    uiStore.showSuccess('Welcome back!', 'Login successful')
    router.push(redirectPath.value)
  } catch (error) {
    serverError.value = error.message || 'Invalid email or password'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="login-page">
    <!-- Left Panel - Form -->
    <div class="login-form-panel">
      <div class="login-form-container">
        <!-- Logo -->
        <div class="mb-8">
          <div class="flex items-center gap-3">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span class="text-2xl font-bold text-gray-900">Desidia</span>
          </div>
        </div>

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p class="mt-2 text-base text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <!-- Error Message -->
        <Message v-if="serverError" severity="error" :closable="false" class="mb-4">
          {{ serverError }}
        </Message>

        <!-- Login Form -->
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

          <!-- Password Field -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <router-link
                :to="{ name: 'ForgotPassword' }"
                class="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </router-link>
            </div>
            <Password
              id="password"
              v-model="password"
              placeholder="Enter your password"
              :class="{ 'p-invalid': passwordError }"
              :feedback="false"
              toggleMask
              autocomplete="current-password"
              inputClass="w-full"
              class="password-input-full"
            />
            <small v-if="passwordError" class="text-red-500">{{ passwordError }}</small>
          </div>

          <!-- Remember Me -->
          <div class="flex items-center gap-2">
            <Checkbox v-model="rememberMe" inputId="remember" :binary="true" />
            <label for="remember" class="text-sm text-gray-600 cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            label="Sign in"
            class="w-full justify-center"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          />
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-300"></div>
          <span class="px-4 text-sm text-gray-500">or continue with</span>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <!-- Social Login -->
        <div class="grid grid-cols-2 gap-3">
          <Button
            outlined
            severity="secondary"
            class="w-full justify-center"
            @click="uiStore.showInfo('Google login coming soon')"
          >
            <svg class="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </Button>
          <Button
            outlined
            severity="secondary"
            class="w-full justify-center"
            @click="uiStore.showInfo('GitHub login coming soon')"
          >
            <i class="pi pi-github mr-2 text-lg"></i>
            <span>GitHub</span>
          </Button>
        </div>

        <!-- Sign Up Link -->
        <p class="mt-8 text-center text-sm text-gray-600">
          Don't have an account?
          <router-link
            :to="{ name: 'Register' }"
            class="font-semibold text-primary-600 hover:text-primary-700"
          >
            Sign up for free
          </router-link>
        </p>
      </div>
    </div>

    <!-- Right Panel - Illustration -->
    <div class="login-illustration-panel">
      <div class="max-w-md text-center text-white">
        <h2 class="text-3xl font-bold">Manage your tasks with AI</h2>
        <p class="mt-4 text-lg opacity-90">
          Desidia helps you organize, prioritize, and complete your work faster with intelligent task management.
        </p>

        <!-- Feature highlights -->
        <div class="mt-12 space-y-4 text-left">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <i class="pi pi-bolt"></i>
            </div>
            <span class="text-base">AI-powered task suggestions</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <i class="pi pi-users"></i>
            </div>
            <span class="text-base">Real-time team collaboration</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <i class="pi pi-chart-line"></i>
            </div>
            <span class="text-base">Insightful productivity analytics</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

.login-form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding: 2rem;
  background-color: #f9fafb;
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .login-form-panel {
    width: 50%;
    padding: 3rem 4rem;
  }
}

.login-form-container {
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
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.login-illustration-panel {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50%;
  padding: 3rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
}

@media (min-width: 1024px) {
  .login-illustration-panel {
    display: flex;
  }
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

