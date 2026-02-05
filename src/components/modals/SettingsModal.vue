<script setup>
/**
 * SettingsModal - Centralized settings hub modal.
 *
 * Provides scalable navigation for settings categories with
 * a dedicated custom fields editor view.
 */
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore, useProjectStore } from '@/stores'
import BaseModal from '@/components/ui/BaseModal.vue'
import SettingsSidebar from '@/components/modals/settings/SettingsSidebar.vue'
import SettingsCustomFields from '@/components/modals/settings/SettingsCustomFields.vue'
import SettingsProjectHub from '@/components/modals/settings/SettingsProjectHub.vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { X, Plus } from 'lucide-vue-next'

const uiStore = useUIStore()
const projectStore = useProjectStore()
const { t } = useI18n()
const confirm = useConfirm()

const isVisible = computed({
  get: () => uiStore.activeModal === 'settings',
  set: (val) => {
    if (!val) uiStore.closeModal()
  }
})

const navGroups = computed(() => {
  const groups = [
    {
      title: t('settings.modal.groups.account', 'ACCOUNT'),
      items: [
        { id: 'profile', label: t('settings.modal.items.profile', 'Profile') },
        { id: 'notifications', label: t('settings.modal.items.notifications', 'Notifications') }
      ]
    },
    {
      title: t('settings.modal.groups.preferences', 'PREFERENCES'),
      items: [
        { id: 'properties', label: t('settings.modal.items.properties', 'Properties') },
        { id: 'custom-fields', label: t('settings.modal.items.userFields', 'User Fields') }
      ]
    },
    {
      title: t('settings.modal.groups.ai', 'AI'),
      items: [
        { id: 'assistants', label: t('settings.modal.items.assistants', 'Assistants') },
        { id: 'ai-models', label: t('settings.modal.items.aiModels', 'AI Models') },
        { id: 'prompt-library', label: t('settings.modal.items.promptLibrary', 'Prompt Library') },
        { id: 'skills-tools', label: t('settings.modal.items.skills', 'Skills') },
        { id: 'integrations', label: t('settings.modal.items.integrations', 'Integrations') },
        { id: 'api-access', label: t('settings.modal.items.apiAccess', 'API Access') },
        { id: 'webhooks', label: t('settings.modal.items.webhooks', 'Webhooks') }
      ]
    }
  ]

  const projectItems = projectStore.projects
    .filter(p => p.name && p.name.trim() !== '')
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map(p => ({
      id: `project-${p.id}`,
      label: p.name,
      type: 'project',
      projectId: p.id
    }))

  groups.push({
    title: t('settings.modal.groups.projects', 'PROJECTS'),
    action: {
      icon: Plus,
      handler: () => handleCreateProject()
    },
    items: projectItems
  })

  return groups
})

const activeSection = ref('custom-fields')
const customFieldsRef = ref(null)
const projectAccessRef = ref(null)
const canSave = ref(false)
const isSaving = ref(false)
const hasPendingChanges = ref(false)
const availableSections = computed(() => navGroups.value.flatMap(group => group.items.map(item => item.id)))

function handleCreateProject() {
  uiStore.closeModal()
  // Tiny delay to allow modal close animation
  setTimeout(() => {
    projectStore.currentProject = null
    uiStore.openModal('settings', { section: 'project', projectTab: 'general' }) // Re-open but this logic might need adjustment if we want a dedicated create modal or stay in settings.
    // Actually, usually "Create Project" might be its own modal or a specific state. 
    // For now, mirroring existing behavior if any, or just notifying.
    // The previous implementation used `uiStore.openModal('settings', { section: 'project', projectTab: 'general' })` to create.
    // If we are ALREADY in settings, we might just want to switch to a 'new-project' state.
    // But simplest is reuse existing flow:
    // If we want to create a NEW project, the SettingsProjectHub handles it if currentProject is null? 
    // Let's assume for now we select a specific 'new' section or handle it.
    // Based on `Sidebar.vue`: `projectStore.currentProject = null; uiStore.openModal('settings', { section: 'project', projectTab: 'general' })`
    selectSection('project-new') 
  }, 100)
}


function setActiveSectionFromModalData(data) {
  if (!data?.section) return
  
  // Handle 'project' section request (from Sidebar "Project Settings")
  if (data.section === 'project') {
    // If we have a current project, select it
    if (projectStore.currentProjectId) {
      activeSection.value = `project-${projectStore.currentProjectId}`
    } else {
       // If no project selected but requested project settings, maybe show first project or special state
       // Or if creating new project
       activeSection.value = 'project-new' // We'll need to handle this in template
       projectStore.currentProject = null
    }
    canSave.value = hasPendingChanges.value
    isSaving.value = false
    return
  }

  if (!availableSections.value.includes(data.section)) return
  activeSection.value = data.section
  
  if (data.section !== 'custom-fields') {
    canSave.value = false
    isSaving.value = false
  }
}

function confirmUnsavedChanges(options = {}) {
  const { closeOnAccept = false } = options
  return new Promise((resolve) => {
    confirm.require({
      message: t('settings.project.unsaved.confirm'),
      header: t('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t('common.confirm'),
      rejectLabel: t('common.cancel'),
      acceptClass: 'p-button-primary p-button-sm',
      rejectClass: 'p-button-outlined p-button-secondary p-button-sm',
      accept: () => {
        confirm.close()
        if (closeOnAccept) {
          uiStore.closeModal()
        }
        resolve(true)
      },
      reject: () => {
        confirm.close()
        resolve(false)
      }
    })
  })
}

async function selectSection(sectionId) {
  if (hasPendingChanges.value && sectionId !== activeSection.value) {
    const confirmLeave = await confirmUnsavedChanges()
    if (!confirmLeave) return
    hasPendingChanges.value = false
  }
  
  activeSection.value = sectionId

  if (sectionId.startsWith('project-')) {
    const projectId = sectionId.replace('project-', '')
    if (projectId === 'new') {
        projectStore.currentProject = null
    } else {
        await projectStore.selectProject(projectId)
    }
    canSave.value = hasPendingChanges.value
    isSaving.value = false
    return
  }

  if (sectionId !== 'custom-fields') {
    canSave.value = false
    isSaving.value = false
  }
}

async function closeModal() {
  if (hasPendingChanges.value) {
    const confirmClose = await confirmUnsavedChanges({ closeOnAccept: true })
    if (!confirmClose) return
    return
  }
  uiStore.closeModal()
}

function handleSave() {
  if (activeSection.value === 'custom-fields') {
    customFieldsRef.value?.saveSelectedField?.()
  }
  if (activeSection.value.startsWith('project-')) {
    projectAccessRef.value?.saveChanges?.()
  }
}

watch([isVisible, () => uiStore.modalData], ([visible, data]) => {
  if (!visible) return
  setActiveSectionFromModalData(data)
})

onMounted(() => {
    // Ensure projects are loaded
    if (projectStore.projects.length === 0) {
        projectStore.fetchProjects()
    }
})
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
        <SettingsProjectHub
          v-if="activeSection.startsWith('project-')"
          ref="projectAccessRef"
          @update:canSave="canSave = $event"
          @update:isSaving="isSaving = $event"
          @update:hasPendingChanges="hasPendingChanges = $event"
        />
        <SettingsCustomFields
          v-else-if="activeSection === 'custom-fields'"
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
