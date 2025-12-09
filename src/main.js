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

// App
import App from './App.vue'
import router from './router'

// Create Vue app
const app = createApp(App)

// Create Pinia store
const pinia = createPinia()
app.use(pinia)

// Configure PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false
    }
  },
  ripple: true
})

// PrimeVue services
app.use(ToastService)
app.use(ConfirmationService)

// PrimeVue directives
app.directive('tooltip', Tooltip)
app.directive('ripple', Ripple)

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
