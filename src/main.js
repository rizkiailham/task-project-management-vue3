/**
 * Desidia v2 - Main Entry Point
 *
 * Task Management SaaS Application with AI Features
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Styles
import './style.css'
import 'primeicons/primeicons.css'

// PrimeVue
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import Ripple from 'primevue/ripple'

// I18n
import i18n from './i18n'

// App
import App from './App.vue'
import router from './router'

// Create Vue app
const app = createApp(App)

// Create Pinia store
const pinia = createPinia()
app.use(pinia)

// Configure PrimeVue with Orange theme
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false
    }
  },
  ripple: true,
  pt: {
    // Global Pass Through options to customize primary color to orange
    button: {
      root: ({ props }) => ({
        class: props.severity === undefined || props.severity === 'primary'
          ? '!bg-orange-500 hover:!bg-orange-600 !border-orange-500 hover:!border-orange-600'
          : ''
      })
    }
  }
})

// PrimeVue services
app.use(ToastService)
app.use(ConfirmationService)

// PrimeVue directives
app.directive('tooltip', Tooltip)
app.directive('ripple', Ripple)

// I18n - Internationalization
app.use(i18n)

// Vue Router
app.use(router)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Vue component:', instance)
  console.error('Error info:', info)

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Example: errorTracker.capture(err, { component: instance, info })
  }
}

// Mount app
app.mount('#app')
