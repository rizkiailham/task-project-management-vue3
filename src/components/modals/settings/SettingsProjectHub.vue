<script setup>
/**
 * SettingsProjectHub - Project settings container with sidebar navigation.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import { useConfirm } from 'primevue/useconfirm'
import SettingsProjectGeneral from '@/components/modals/settings/SettingsProjectGeneral.vue'
import SettingsProjectAccess from '@/components/modals/settings/SettingsProjectAccess.vue'
import SettingsProjectInstruction from '@/components/modals/settings/SettingsProjectInstruction.vue'
import SettingsProjectStatus from '@/components/modals/settings/SettingsProjectStatus.vue'
import SettingsProjectTags from '@/components/modals/settings/SettingsProjectTags.vue'
import SettingsProjectExport from '@/components/modals/settings/SettingsProjectExport.vue'
import SettingsProjectImport from '@/components/modals/settings/SettingsProjectImport.vue'
import SettingsProjectEmail from '@/components/modals/settings/SettingsProjectEmail.vue'
import SettingsProjectForms from '@/components/modals/settings/SettingsProjectForms.vue'
import { HelpCircle, Plus } from 'lucide-vue-next'

const { t } = useI18n()
const uiStore = useUIStore()
const confirm = useConfirm()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const menuGroups = computed(() => [
  {
    k: 'settings',
    label: t('settings.project.menu.groups.settings', 'PROJECT SETTINGS'),
    icon: HelpCircle,
    items: [
      { id: 'general', label: t('settings.project.menu.items.general') },
      { id: 'access-control', label: t('settings.project.menu.items.accessControl') },
      { id: 'instruction', label: t('settings.project.menu.items.instruction', 'Instruction') },
      { id: 'status', label: t('settings.project.menu.items.status', 'Status') },
      { id: 'tags', label: t('settings.project.menu.items.tags', 'Tags') },
      { id: 'export', label: t('settings.project.menu.items.export', 'Export') },
      { id: 'import', label: t('settings.project.menu.items.import', 'Import') }
    ]
  },
  {
    k: 'forms',
    label: t('settings.project.menu.groups.forms', 'FORMS'),
    icon: HelpCircle,
    actionIcon: Plus,
    items: [
      { id: 'form-default', label: t('settings.project.menu.items.defaultForm', 'Default - Create task') }
    ]
  },
  {
    k: 'email',
    label: t('settings.project.menu.groups.email', 'EMAIL'),
    icon: HelpCircle,
    actionIcon: Plus,
    items: [
      { id: 'email-default', label: t('settings.project.menu.items.defaultEmail', 'Default - Create task') }
    ]
  }
])

const activeSideItem = ref('general')
const generalSectionRef = ref(null)
const accessSectionRef = ref(null)
const instructionSectionRef = ref(null)
const generalCanSave = ref(false)
const generalIsSaving = ref(false)
const generalHasPendingChanges = ref(false)
const accessCanSave = ref(false)
const accessIsSaving = ref(false)
const accessHasPendingChanges = ref(false)
const instructionCanSave = ref(false)
const instructionIsSaving = ref(false)
const instructionHasPendingChanges = ref(false)
const statusSectionRef = ref(null)
const statusCanSave = ref(false)
const statusIsSaving = ref(false)
const statusHasPendingChanges = ref(false)
const tagsSectionRef = ref(null)
const tagsCanSave = ref(false)
const tagsIsSaving = ref(false)
const tagsHasPendingChanges = ref(false)
const emailSectionRef = ref(null)
const emailCanSave = ref(false)
const emailIsSaving = ref(false)
const emailHasPendingChanges = ref(false)
const formSectionRef = ref(null)
const formCanSave = ref(false)
const formIsSaving = ref(false)
const formHasPendingChanges = ref(false)
const listWidth = ref(280)
const isResizing = ref(false)
let resizeStartX = 0
let resizeStartWidth = 0

watch(() => uiStore.modalData, (data) => {
  if (data?.section !== 'project') return
  if (!data?.projectTab) return
  const tab = data.projectTab
  // Search in all groups
  const exists = menuGroups.value.some(group => group.items.some(item => item.id === tab))
  if (exists) activeSideItem.value = tab
}, { immediate: true })

function startResize(event) {
  event.preventDefault()
  isResizing.value = true
  resizeStartX = event.clientX
  resizeStartWidth = listWidth.value
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event) {
  if (!isResizing.value) return
  const nextWidth = Math.max(220, Math.min(360, resizeStartWidth + (event.clientX - resizeStartX)))
  listWidth.value = nextWidth
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  if (isResizing.value) stopResize()
})

function syncState() {
  if (activeSideItem.value === 'general') {
    emit('update:canSave', generalCanSave.value)
    emit('update:isSaving', generalIsSaving.value)
    emit('update:hasPendingChanges', generalHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'access-control') {
    emit('update:canSave', accessCanSave.value)
    emit('update:isSaving', accessIsSaving.value)
    emit('update:hasPendingChanges', accessHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'instruction') {
    emit('update:canSave', instructionCanSave.value)
    emit('update:isSaving', instructionIsSaving.value)
    emit('update:hasPendingChanges', instructionHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'status') {
    emit('update:canSave', statusCanSave.value)
    emit('update:isSaving', statusIsSaving.value)
    emit('update:hasPendingChanges', statusHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'tags') {
    emit('update:canSave', tagsCanSave.value)
    emit('update:isSaving', tagsIsSaving.value)
    emit('update:hasPendingChanges', tagsHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'email-default') {
    emit('update:canSave', emailCanSave.value)
    emit('update:isSaving', emailIsSaving.value)
    emit('update:hasPendingChanges', emailHasPendingChanges.value)
    return
  }
  if (activeSideItem.value === 'form-default') {
    emit('update:canSave', formCanSave.value)
    emit('update:isSaving', formIsSaving.value)
    emit('update:hasPendingChanges', formHasPendingChanges.value)
    return
  }
  emit('update:canSave', false)
  emit('update:isSaving', false)
  emit('update:hasPendingChanges', false)
}

watch(activeSideItem, syncState, { immediate: true })
watch([generalCanSave, generalIsSaving, generalHasPendingChanges], () => {
  if (activeSideItem.value !== 'general') return
  syncState()
})
watch([accessCanSave, accessIsSaving, accessHasPendingChanges], () => {
  if (activeSideItem.value !== 'access-control') return
  syncState()
})
  watch([instructionCanSave, instructionIsSaving, instructionHasPendingChanges], () => {
  if (activeSideItem.value !== 'instruction') return
  syncState()
})
watch([statusCanSave, statusIsSaving, statusHasPendingChanges], () => {
  if (activeSideItem.value !== 'status') return
  syncState()
})
watch([tagsCanSave, tagsIsSaving, tagsHasPendingChanges], () => {
  if (activeSideItem.value !== 'tags') return
  syncState()
})
watch([emailCanSave, emailIsSaving, emailHasPendingChanges], () => {
  if (activeSideItem.value !== 'email-default') return
  syncState()
})
watch([formCanSave, formIsSaving, formHasPendingChanges], () => {
  if (activeSideItem.value !== 'form-default') return
  syncState()
})

function saveChanges() {
  if (activeSideItem.value === 'general') {
    generalSectionRef.value?.saveChanges?.()
    return
  }
  if (activeSideItem.value === 'access-control') {
    accessSectionRef.value?.saveChanges?.()
  }
  if (activeSideItem.value === 'instruction') {
    instructionSectionRef.value?.saveChanges?.()
  }
  if (activeSideItem.value === 'status') {
    statusSectionRef.value?.saveChanges?.()
  }
  if (activeSideItem.value === 'tags') {
    tagsSectionRef.value?.saveChanges?.()
  }
  if (activeSideItem.value === 'email-default') {
    emailSectionRef.value?.saveChanges?.()
  }
  if (activeSideItem.value === 'form-default') {
    formSectionRef.value?.saveChanges?.()
  }
}

const pendingChanges = computed(() => {
  if (activeSideItem.value === 'general') return generalHasPendingChanges.value
  if (activeSideItem.value === 'access-control') return accessHasPendingChanges.value
  if (activeSideItem.value === 'instruction') return instructionHasPendingChanges.value
  if (activeSideItem.value === 'status') return statusHasPendingChanges.value
  if (activeSideItem.value === 'tags') return tagsHasPendingChanges.value
  if (activeSideItem.value === 'email-default') return emailHasPendingChanges.value
  if (activeSideItem.value === 'form-default') return formHasPendingChanges.value
  return false
})

function confirmUnsavedChanges() {
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
        resolve(true)
      },
      reject: () => {
        confirm.close()
        resolve(false)
      }
    })
  })
}

async function selectSideItem(nextItemId) {
  if (nextItemId === activeSideItem.value) return
  if (pendingChanges.value) {
    const confirmed = await confirmUnsavedChanges()
    if (!confirmed) return
  }
  activeSideItem.value = nextItemId
}

defineExpose({ saveChanges, pendingChanges })
</script>

<template>
  <div class="settings-custom" :style="{ '--settings-list-width': `${listWidth}px` }">
    <aside class="settings-list" :style="{ width: `${listWidth}px` }">
      <div class="settings-list-body pl-1">
        <div 
          v-for="group in menuGroups" 
          :key="group.k" 
          class="settings-list-group"
          :class="{ 'mt-10': group.k !== 'settings' && group.k !== 'email' }"
        >
          <div class="settings-list-header mt-2">
             <div class="settings-list-title flex items-center gap-1">
               {{ group.label }}
               <component :is="group.icon" v-if="group.icon" class="w-3.5 h-3.5" />
             </div>
             <button v-if="group.actionIcon" type="button" class="text-gray-400 hover:text-gray-700">
               <component :is="group.actionIcon" class="w-4 h-4" />
             </button>
          </div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="settings-list-row pl-3 py-1"
            :class="{ 'is-selected': activeSideItem === item.id }"
            @click="selectSideItem(item.id)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </aside>

    <div class="settings-divider" @mousedown="startResize"></div>

    <div class="settings-editor">
      <div v-if="activeSideItem === 'general'">
        <SettingsProjectGeneral
          ref="generalSectionRef"
          @update:canSave="generalCanSave = $event"
          @update:isSaving="generalIsSaving = $event"
          @update:hasPendingChanges="generalHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'access-control'">
        <SettingsProjectAccess
          ref="accessSectionRef"
          @update:canSave="accessCanSave = $event"
          @update:isSaving="accessIsSaving = $event"
          @update:hasPendingChanges="accessHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'instruction'">
        <SettingsProjectInstruction
          ref="instructionSectionRef"
          @update:canSave="instructionCanSave = $event"
          @update:isSaving="instructionIsSaving = $event"
          @update:hasPendingChanges="instructionHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'status'" class="settings-section-wrapper">
        <SettingsProjectStatus
          ref="statusSectionRef"
          @update:canSave="statusCanSave = $event"
          @update:isSaving="statusIsSaving = $event"
          @update:hasPendingChanges="statusHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'tags'" class="settings-section-wrapper">
        <SettingsProjectTags
          ref="tagsSectionRef"
          @update:canSave="tagsCanSave = $event"
          @update:isSaving="tagsIsSaving = $event"
          @update:hasPendingChanges="tagsHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'export'" class="settings-section-wrapper">
        <SettingsProjectExport />
      </div>
      <div v-else-if="activeSideItem === 'import'" class="settings-section-wrapper">
        <SettingsProjectImport />
      </div>
      <div v-else-if="activeSideItem === 'email-default'" class="settings-section-wrapper">
        <SettingsProjectEmail
          ref="emailSectionRef"
          @update:canSave="emailCanSave = $event"
          @update:isSaving="emailIsSaving = $event"
          @update:hasPendingChanges="emailHasPendingChanges = $event"
        />
      </div>
      <div v-else-if="activeSideItem === 'form-default'" class="settings-section-wrapper">
        <SettingsProjectForms
          ref="formSectionRef"
          @update:canSave="formCanSave = $event"
          @update:isSaving="formIsSaving = $event"
          @update:hasPendingChanges="formHasPendingChanges = $event"
        />
      </div>
      <div v-else class="settings-project-placeholder">
        <div class="settings-project-empty-title">{{ t('settings.modal.comingSoon') }}</div>
        <p class="settings-project-empty-text">{{ t('settings.modal.comingSoonDescription') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-custom {
  display: grid;
  grid-template-columns: auto 12px 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
}

.settings-custom::before {
  content: '';
  position: absolute;
  left: calc(12px + var(--settings-list-width, 280px));
  right: 0;
  bottom: 0;
  height: var(--settings-footer-height, 72px);
  background: #ffffff;
  pointer-events: none;
}

.settings-custom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--settings-footer-height, 72px);
  height: 1px;
  background: #e5e7eb;
  pointer-events: none;
}

.settings-list {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  background: #ffffff;
  min-width: 0;
  height: 100%;
  min-height: 240px;
  max-height: 100%;
  box-sizing: border-box;
  position: relative;
}

.settings-list::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #ffffff;
  pointer-events: none;
}

.settings-list-header {
  padding: 12px 12px 8px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.settings-list-title {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-400);
  text-transform: uppercase;
}

.settings-list-body {
  flex-direction: column;
  overflow: auto;
  padding-bottom: calc(18px + var(--settings-footer-height, 72px));
  width: 100%;
  display: flex;
  gap: 2px;
}

.settings-list-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  border-radius: 8px;
  color: var(--color-gray-700);
  text-align: left;
  min-height: 30px;
  width: 100%;
}

.settings-list-row:hover {
  background: #f3f4f6;
}

.settings-list-row.is-selected {
  background: #e5e7eb;
  color: var(--color-gray-900);
}

.settings-divider {
  width: 12px;
  position: relative;
  cursor: col-resize;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.settings-divider::before {
  content: '';
  width: 1px;
  background: #f3f4f6;
  height: 100%;
}

.settings-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 28px;
  padding-top: 50px;
  padding-bottom: calc(30px + var(--settings-footer-height, 72px));
  height: 100%;
  overflow: auto;
  min-width: 0; /* Allow flexbox shrinking */
  flex: 1 1 0; /* Take remaining space but can shrink */
}

/* Wrapper for section content - forces overflow containment */
.settings-section-wrapper {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.settings-project-placeholder {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
}

.settings-project-empty-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
}

.settings-project-empty-text {
  font-size: 12px;
  color: var(--color-gray-400);
  margin-top: 6px;
}

@media (max-width: 900px) {
  .settings-custom {
    grid-template-columns: 1fr;
  }

  .settings-divider {
    display: none;
  }

  .settings-editor {
    padding: 18px 16px;
  }

  .settings-custom::before {
    left: 0;
  }
}
</style>





