<script setup>
/**
 * RegisterView - User registration page
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
const authStore = useAuthStore()
const uiStore = useUIStore()

// Form validation schema
const validationSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain a lowercase letter')
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/[0-9]/, 'Password must contain a number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match')
})

// Form setup
const { handleSubmit, errors, meta } = useForm({
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
    serverError.value = 'Please accept the terms and conditions'
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
    
    uiStore.showSuccess('Account created successfully!', 'Welcome to Desidia')
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
        <h2 class="text-3xl font-bold">Start your productivity journey</h2>
        <p class="mt-4 text-lg opacity-90">
          Join thousands of teams using Desidia to manage their work more efficiently.
        </p>

        <!-- Stats -->
        <div class="mt-12 grid grid-cols-3 gap-6">
          <div>
            <div class="text-3xl font-bold">10K+</div>
            <div class="text-sm opacity-75">Active Users</div>
          </div>
          <div>
            <div class="text-3xl font-bold">500K+</div>
            <div class="text-sm opacity-75">Tasks Completed</div>
          </div>
          <div>
            <div class="text-3xl font-bold">99.9%</div>
            <div class="text-sm opacity-75">Uptime</div>
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
            <span class="text-2xl font-bold text-gray-900">Desidia</span>
          </div>
        </div>

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Create your account</h1>
          <p class="mt-2 text-base text-gray-600">
            Get started with your free account
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
              Full name
            </label>
            <InputText
              id="name"
              v-model="name"
              type="text"
              placeholder="John Doe"
              class="w-full"
              :class="{ 'p-invalid': nameError }"
              autocomplete="name"
            />
            <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
          </div>

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
            <label for="password" class="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <Password
              id="password"
              v-model="password"
              placeholder="Create a strong password"
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
              Confirm password
            </label>
            <Password
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm your password"
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
              I agree to the
              <a href="#" class="text-primary-600 hover:underline font-medium">Terms of Service</a>
              and
              <a href="#" class="text-primary-600 hover:underline font-medium">Privacy Policy</a>
            </label>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            label="Create account"
            class="w-full justify-center"
            :loading="isSubmitting"
            :disabled="!meta.valid || !acceptTerms || isSubmitting"
          />
        </form>

        <!-- Sign In Link -->
        <p class="mt-8 text-center text-sm text-gray-600">
          Already have an account?
          <router-link
            :to="{ name: 'Login' }"
            class="font-semibold text-primary-600 hover:text-primary-700"
          >
            Sign in
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
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
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
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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

