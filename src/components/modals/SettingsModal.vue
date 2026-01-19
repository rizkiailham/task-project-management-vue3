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
import { X } from 'lucide-vue-next'

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
    dialogClass="settings-dialog"
    class="settings-modal"
  >
    <div class="settings-body">
      <div
        @click="closeModal"
        class="cursor-pointer settings-top-cancel"
        :title="t('common.cancel')"
        aria-label="Close settings"
      >
        <X class="w-4 h-4" />
      </div>
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
  position: relative;
}

.settings-content {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
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

.settings-top-cancel {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 2;
}

.settings-modal :deep(.p-dialog) {
  height: var(--settings-modal-height, 90vh);
  max-height: var(--settings-modal-height, 90vh);
  min-height: var(--settings-modal-height, 90vh);
  display: flex;
  flex-direction: column;
  position: relative;
}

.settings-modal :deep(.p-dialog-header) {
  display: none;
}

.settings-modal :deep(.p-dialog .p-dialog-content) {
  flex: 1;
  padding: 0 !important;
  overflow: hidden;
}

.settings-modal :deep(.p-dialog-footer) {
  padding: 10px 16px;
  position: absolute;
  bottom: 0;
  left: 220px;
  right: 0;
  background: #ffffff;
  border-top: none;
  z-index: 2;
  height: var(--settings-footer-height, 72px);
  min-height: var(--settings-footer-height, 72px);
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .settings-body {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Non-scoped override for settings modal dialog content padding */
.settings-dialog.p-dialog {
  position: relative;
  --settings-footer-height: 58px;
  --settings-modal-height: 90vh;
  height: var(--settings-modal-height);
  max-height: var(--settings-modal-height);
  min-height: var(--settings-modal-height);
}

.settings-dialog.p-dialog .p-dialog-content {
  padding: 0 !important;
  height: 100%;
}

.settings-dialog.p-dialog .p-dialog-header {
  display: none !important;
}

.settings-dialog.p-dialog .p-dialog-footer {
  padding: 10px 16px !important;
  position: absolute;
  bottom: 0;
  left: 220px;
  right: 0;
  background: #ffffff;
  border-top: none;
  z-index: 2;
  height: var(--settings-footer-height, 72px);
  min-height: var(--settings-footer-height, 72px);
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .settings-modal :deep(.p-dialog-footer) {
    left: 0;
  }

  .settings-dialog.p-dialog .p-dialog-footer {
    left: 0;
  }
}
</style>
