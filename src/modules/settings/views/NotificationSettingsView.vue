<script setup>
/**
 * NotificationSettingsView - Notification preferences
 */
import { ref } from 'vue'
import { useUIStore } from '@/stores'

// PrimeVue
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const uiStore = useUIStore()

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
    uiStore.showSuccess('Notification preferences saved')
  } catch (error) {
    uiStore.showError('Failed to save preferences')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Email Notifications -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Task Assigned</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When a task is assigned to you</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskAssigned" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Task Completed</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When a task you're watching is completed</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskCompleted" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Comments</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When someone comments on your task</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskCommented" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Due Soon Reminders</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Reminder before task due date</p>
          </div>
          <ToggleSwitch v-model="preferences.email.taskDueSoon" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Weekly Digest</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Weekly summary of your tasks</p>
          </div>
          <ToggleSwitch v-model="preferences.email.weeklyDigest" />
        </div>
      </div>
    </div>

    <!-- In-App Notifications -->
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">In-App Notifications</h2>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Task Assigned</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When a task is assigned to you</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.taskAssigned" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Mentions</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When someone mentions you</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.mentions" />
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Comments</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">When someone comments on your task</p>
          </div>
          <ToggleSwitch v-model="preferences.inApp.taskCommented" />
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end">
      <Button 
        label="Save Preferences" 
        :loading="isLoading"
        @click="savePreferences"
      />
    </div>
  </div>
</template>

