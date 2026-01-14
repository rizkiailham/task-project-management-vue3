<script setup>
/**
 * SettingsModal - Centralized settings hub modal.
 *
 * Provides scalable navigation for settings categories with
 * a dedicated custom fields editor view.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import BaseModal from '@/components/ui/BaseModal.vue'
import SettingsSidebar from '@/components/modals/settings/SettingsSidebar.vue'
import SettingsCustomFields from '@/components/modals/settings/SettingsCustomFields.vue'
import Button from 'primevue/button'

const uiStore = useUIStore()
const { t } = useI18n()

const isVisible = computed({
  get: () => uiStore.activeModal === 'settings',
  set: (val) => {
    if (!val) uiStore.closeModal()
  }
})

const navGroups = computed(() => ([
  {
    title: t('settings.modal.groups.account'),
    items: [
      { id: 'profile', label: t('settings.modal.items.profile') },
      { id: 'project', label: t('settings.modal.items.project') },
      { id: 'notifications', label: t('settings.modal.items.notifications') }
    ]
  },
  {
    title: t('settings.modal.groups.preferences'),
    items: [
      { id: 'data-types', label: t('settings.modal.items.dataTypes') },
      { id: 'custom-fields', label: t('settings.modal.items.customFields') },
      { id: 'forms-builder', label: t('settings.modal.items.formsBuilder') },
      { id: 'data-import', label: t('settings.modal.items.dataImport') },
      { id: 'data-export', label: t('settings.modal.items.dataExport') }
    ]
  },
  {
    title: t('settings.modal.groups.ai'),
    items: [
      { id: 'assistants', label: t('settings.modal.items.assistants') },
      { id: 'ai-models', label: t('settings.modal.items.aiModels') },
      { id: 'prompt-library', label: t('settings.modal.items.promptLibrary') },
      { id: 'skills-tools', label: t('settings.modal.items.skillsTools') },
      { id: 'integrations', label: t('settings.modal.items.integrations') }
    ]
  },
  {
    title: t('settings.modal.groups.apiAccess'),
    items: [
      { id: 'webhooks', label: t('settings.modal.items.webhooks') }
    ]
  }
]))

const activeSection = ref('custom-fields')
const customFieldsRef = ref(null)
const canSave = ref(false)
const isSaving = ref(false)

function selectSection(sectionId) {
  activeSection.value = sectionId
}

function closeModal() {
  uiStore.closeModal()
}

function handleSave() {
  if (activeSection.value === 'custom-fields') {
    customFieldsRef.value?.saveSelectedField?.()
  }
}
</script>

<template>
  <BaseModal
    v-model:visible="isVisible"
    width="1200px"
    maxWidth="96vw"
    class="settings-modal"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-base font-semibold text-gray-900">{{ t('settings.title') }}</h2>
      </div>
    </template>

    <div class="settings-body">
      <SettingsSidebar
        :groups="navGroups"
        :activeSection="activeSection"
        @select="selectSection"
      />

      <section class="settings-content">
        <SettingsCustomFields
          v-if="activeSection === 'custom-fields'"
          ref="customFieldsRef"
          :active="activeSection === 'custom-fields'"
          :visible="isVisible"
          @update:canSave="canSave = $event"
          @update:isSaving="isSaving = $event"
        />

        <div v-else class="settings-placeholder">
          <div class="settings-placeholder-title">{{ t('settings.modal.comingSoon') }}</div>
          <p class="settings-placeholder-text">
            {{ t('settings.modal.comingSoonDescription') }}
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button
          type="button"
          :label="t('common.cancel')"
          outlined
          severity="secondary"
          class="settings-footer-cancel"
          @click="closeModal"
        />
        <Button
          type="button"
          :label="t('settings.saveChanges')"
          class="settings-footer-save"
          :loading="isSaving"
          :disabled="!canSave || isSaving"
          @click="handleSave"
        />
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.settings-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
}

.settings-content {
  background: #ffffff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  flex: 1;
}

.settings-placeholder {
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.settings-placeholder-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
}

.settings-placeholder-text {
  font-size: 12px;
}

.settings-footer-cancel {
  min-width: 110px;
}

.settings-footer-save {
  min-width: 120px;
}

.settings-modal :deep(.p-dialog) {
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.settings-modal :deep(.p-dialog-content) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

@media (max-width: 900px) {
  .settings-body {
    grid-template-columns: 1fr;
  }
}
</style>
