<script setup>
/**
 * SettingsProjectExport - Project export functionality
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const { t } = useI18n()

const isExporting = ref(false)

async function handleExport() {
  isExporting.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    // In a real app, this would trigger a download or show a notification
    console.log('Export triggered')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="settings-editor-section">
    <div class="settings-project-header mb-6">
      <div class="settings-project-title">
        {{ t('settings.project.menu.items.export', 'Export') }}
      </div>
      <div class="settings-project-description max-w-2xl">
        {{ t('settings.project.export.description', "Export all project data for backup or analysis. The file will download automatically once ready, and you'll be notified by email.") }}
      </div>
    </div>

    <div class="settings-editor-field">
      <Button 
        type="button" 
        :label="isExporting ? t('common.processing', 'Processing...') : t('settings.project.export.button', 'Export project data')"
        :loading="isExporting"
        @click="handleExport"
      />
    </div>
  </div>
</template>

<style scoped>
.settings-editor-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.settings-project-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-project-title {
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.settings-project-description {
  font-size: 12px;
  color: var(--color-gray-500);
  line-height: 1.5;
  font-weight: var(--font-weight-medium);
}
</style>





