<script setup>
/**
 * SocialAuthCallbackView - Handle OAuth callback results
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useUIStore } from '@/stores'
import { get } from '@/api/httpClient'
import Button from 'primevue/button'
import desidiaLogo from '@/assets/desidia.svg'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const isSubmitting = ref(true)
const hasError = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => route.query.redirect || '/app')
const provider = computed(() => route.params.provider || route.query.provider || '')

function getQueryValue(keys) {
  for (const key of keys) {
    const value = route.query[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

async function handleTokenLogin(accessToken, refreshToken) {
  await authStore.completeSocialLogin({
    accessToken,
    refreshToken: refreshToken || undefined
  })
  router.replace(redirectPath.value)
}

async function handleCodeExchange(code, state) {
  const providerValue = provider.value
  if (!providerValue) {
    throw new Error(t('auth.social.missingProvider'))
  }
  const response = await get(`/auth/${providerValue}/callback`, {
    code,
    state
  })
  if (!response?.accessToken) {
    throw new Error(t('auth.social.missingToken'))
  }
  await handleTokenLogin(response.accessToken, response.refreshToken)
}

onMounted(async () => {
  const error = getQueryValue(['error', 'error_description', 'errorMessage', 'message'])
  if (error) {
    hasError.value = true
    errorMessage.value = error
    isSubmitting.value = false
    return
  }

  const accessToken = getQueryValue(['accessToken', 'access_token', 'token'])
  const refreshToken = getQueryValue(['refreshToken', 'refresh_token'])
  const code = getQueryValue(['code'])
  const state = getQueryValue(['state'])

  try {
    if (accessToken) {
      await handleTokenLogin(accessToken, refreshToken)
      return
    }

    if (code) {
      await handleCodeExchange(code, state)
      return
    }

    throw new Error(t('auth.social.missingToken'))
  } catch (errorValue) {
    hasError.value = true
    const message = errorValue?.response?.data?.message || errorValue?.message || t('auth.social.loginFailed')
    errorMessage.value = message
    uiStore.showApiError(errorValue, message)
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
      <h1 class="auth-title">{{ t('auth.social.title') }}</h1>

      <div v-if="isSubmitting" class="auth-loading">
        {{ t('auth.social.processing') }}
      </div>

      <div v-else-if="hasError" class="auth-error-state">
        <p class="auth-error-text">{{ errorMessage }}</p>
        <Button
          :label="t('auth.social.backToLogin')"
          class="auth-primary"
          @click="router.replace({ name: 'Login' })"
        />
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
  margin: 0 auto 1.25rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #2563eb;
}

.auth-logo-icon {
  width: 6rem;
}

.auth-title {
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.25rem;
}

.auth-loading {
  font-size: 0.95rem;
  color: #6b7280;
}

.auth-error-state {
  display: grid;
  gap: 1rem;
}

.auth-error-text {
  color: #ef4444;
  font-size: 0.9rem;
}

.auth-primary {
  width: 100%;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: 1px solid transparent;
  box-sizing: border-box;
  color: #ffffff;
}
</style>
