<script setup>
/**
 * NotificationSettingsView - Notification preferences
 */
import { ref } from 'vue'
import { useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'

// PrimeVue
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const uiStore = useUIStore()
const { t } = useI18n()

// Notification preferences
const preferences = ref({
  email: {
    taskAssigned: true,
    taskCompleted: true,
    taskCommented: true,
    taskDueSoon: true,
    projectInvited: true,
    weeklyDigest: false
  },
  push: {
    taskAssigned: true,
    taskCompleted: false,
    taskCommented: true,
    taskDueSoon: true,
    projectInvited: true
  },
  inApp: {
    taskAssigned: true,
    taskCompleted: true,
    taskCommented: true,
    taskDueSoon: true,
    projectInvited: true,
    mentions: true
  }
})

const isLoading = ref(false)

async function savePreferences() {
  isLoading.value = true
  try {
    // TODO: Save to API
    await new Promise(resolve => setTimeout(resolve, 500))
    uiStore.showSuccess(t('settings.notification.messages.saved'))
  } catch (error) {
    uiStore.showError(t('settings.notification.errors.save'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Email Notifications -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('settings.notification.sections.email') }}</h2>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.taskAssigned.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.taskAssigned.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskAssigned" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.taskCompleted.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.taskCompleted.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskCompleted" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.comments.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.comments.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskCommented" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.dueSoon.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.dueSoon.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskDueSoon" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.weeklyDigest.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.weeklyDigest.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.email.weeklyDigest" />
        </div>
      </div>
    </div>

    <!-- In-App Notifications -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('settings.notification.sections.inApp') }}</h2>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.taskAssigned.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.taskAssigned.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.taskAssigned" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.mentions.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.mentions.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.mentions" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ t('settings.notification.items.comments.title') }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('settings.notification.items.comments.description') }}</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.taskCommented" />
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end">
      <Button 
        :label="t('settings.notification.actions.save')" 
        :loading="isLoading"
        @click="savePreferences"
      />
    </div>
  </div>
</template>
