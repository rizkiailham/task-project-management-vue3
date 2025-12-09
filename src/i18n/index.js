/**
 * Vue I18n Configuration
 * 
 * Supports English (en) and Norwegian (no) locales
 * Language preference is persisted in localStorage
 */
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import no from './locales/no.json'

/**
 * Get saved locale from localStorage or detect from browser
 * @returns {string} Locale code ('en' or 'no')
 */
function getDefaultLocale() {
  // Check localStorage first
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && ['en', 'no'].includes(savedLocale)) {
    return savedLocale
  }

  // Detect from browser
  const browserLang = navigator.language || navigator.userLanguage
  if (browserLang) {
    // Check for Norwegian variants
    if (browserLang.startsWith('nb') || browserLang.startsWith('nn') || browserLang.startsWith('no')) {
      return 'no'
    }
  }

  // Default to English
  return 'en'
}

/**
 * Available locales configuration
 */
export const AVAILABLE_LOCALES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' }
]

/**
 * Create and configure i18n instance
 */
const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    no
  },
  // Suppress warnings for missing translations in development
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  // Handle missing keys gracefully
  missing: (locale, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation: ${key} (${locale})`)
    }
    return key
  }
})

/**
 * Change the current locale and persist to localStorage
 * @param {string} locale - The locale code to switch to
 */
export function setLocale(locale) {
  if (!['en', 'no'].includes(locale)) {
    console.warn(`[i18n] Invalid locale: ${locale}`)
    return
  }
  
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  
  // Update document lang attribute for accessibility
  document.documentElement.lang = locale
}

/**
 * Get the current locale
 * @returns {string} Current locale code
 */
export function getLocale() {
  return i18n.global.locale.value
}

export default i18n

