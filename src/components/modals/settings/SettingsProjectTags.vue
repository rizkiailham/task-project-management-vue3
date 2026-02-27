<script setup>
/**
 * SettingsProjectTags - Project tags editor
 * 
 * Manages tags via the dynamic project-properties API.
 * Tags are a system property (key: 'tags', type: 'multiselect')
 * whose settings.options define the available tags.
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore, useProjectPropertyStore } from '@/stores'
import { Plus } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'


const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const propertyStore = useProjectPropertyStore()

// The tags property definition from the API
const tagsPropertyId = ref(null)
const tags = ref([])
const originalSnapshot = ref('[]')
const hasPendingChanges = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

const optionColors = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6',
  '#0ea5e9', '#14b8a6', '#eab308', '#ec4899', '#6366f1'
]

function createSnapshot(list = tags.value) {
  return JSON.stringify(
    list.map(tag => ({
      id: tag.id,
      name: (tag.name || '').trim(),
      color: tag.color
    }))
  )
}

/**
 * Convert a property option to our local tag format.
 * API may return plain strings (e.g. "Bug") or objects ({ value, color, ... }).
 */
function normalizeTagOption(rawOption, index) {
  const option = typeof rawOption === 'string' ? { value: rawOption } : rawOption
  return {
    id: option?.id || `opt-${index}`,
    name: option?.value || option?.name || '',
    color: option?.color || optionColors[index % optionColors.length],
    projectId: projectStore.currentProjectId
  }
}

async function loadTags() {
  if (!projectStore.currentProjectId) return
  isLoading.value = true
  try {
    await propertyStore.fetchProperties(projectStore.currentProjectId, { force: true })
    
    const tagsProp = propertyStore.getPropertyByKey(projectStore.currentProjectId, 'tags')
    
    if (tagsProp) {
      tagsPropertyId.value = tagsProp.id
      const options = tagsProp.settings?.options || []
      tags.value = options.map((opt, idx) => normalizeTagOption(opt, idx))
    } else {
      tagsPropertyId.value = null
      tags.value = []
    }
    
    originalSnapshot.value = createSnapshot(tags.value)
    hasPendingChanges.value = false
  } finally {
    isLoading.value = false
  }
}

watch(() => projectStore.currentProjectId, loadTags, { immediate: true })

function addTag() {
  const color = optionColors[Math.floor(Math.random() * optionColors.length)]
  tags.value.push({
    id: `new-${Date.now()}`,
    name: t('settings.project.tags.new', 'New Tag'),
    projectId: projectStore.currentProjectId,
    color: color,
    isNew: true
  })
  hasPendingChanges.value = true
}

function updateTagName(tag, value) {
  tag.name = value
  hasPendingChanges.value = true
}


function blurTagName(tag, event) {
  const trimmed = (tag.name || '').trim()
  tag.name = trimmed || t('settings.project.tags.new', 'New Tag')
}

function removeTag(tagId) {
  tags.value = tags.value.filter(tag => tag.id !== tagId)
  hasPendingChanges.value = true
}

function getContrastColor(hex) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return '#ffffff'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#1f2937' : '#ffffff'
}

function getTagMenuItems(tag) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      action: () => removeTag(tag.id)
    }
  ]
}

async function saveChanges() {
  const projectId = projectStore.currentProjectId
  if (!projectId) return
  
  isSaving.value = true
  try {
    // Build the options array for the tags property
    const options = tags.value.map((tag, index) => ({
      value: (tag.name || '').trim() || t('settings.project.tags.new', 'New Tag'),
      color: tag.color,
      index: index + 1
    }))

    if (tagsPropertyId.value) {
      // Update existing tags property's options
      await propertyStore.updateProperty(
        tagsPropertyId.value,
        { settings: { options } },
        projectId
      )
    } else {
      // Create the tags property if it doesn't exist yet
      const created = await propertyStore.createProperty({
        projectId,
        key: 'tags',
        label: 'Tags',
        type: 'multiselect',
        isSystem: true,
        isRequired: false,
        isVisible: true,
        settings: { options }
      })
      if (created?.id) {
        tagsPropertyId.value = created.id
      }
    }

    uiStore.showApiSuccess(null, t('settings.project.tags.messages.saved', 'Tags saved successfully'))
    await loadTags()
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isSaving.value = false
  }
}

// Watch for changes to update parent
watch([hasPendingChanges, isSaving], () => {
  emit('update:hasPendingChanges', hasPendingChanges.value)
  emit('update:isSaving', isSaving.value)
  emit('update:canSave', hasPendingChanges.value && !isSaving.value)
})

defineExpose({ saveChanges })
</script>

<template>
  <div class="settings-editor-section">
    <div class="settings-project-header mb-6">
      <div class="settings-project-title">
        {{ t('settings.project.menu.items.tags', 'Tags') }}
      </div>
      <p class="settings-project-description">
        {{ t('settings.project.tags.description', 'Use tags to label and organize projects for easier filtering and discovery. Tag will be available on the item by default') }}
      </p>
    </div>

    <div class="settings-editor-field">
      <div class="settings-option-header">
        <div class="settings-field-title">{{ t('settings.customFields.fields.options', 'Options') }}</div>
        <button type="button" class="settings-option-add-btn" @click="addTag()">
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div class="settings-option-list">
        <div v-for="tag in tags" :key="tag.id" class="settings-option-group">
          <!-- Mimicking Dart.ai structure: relative flex items-center gap-1 size-full -->
          <div class="settings-option-row">
            <!-- Pill Container: h-5, rounded, border, pl-1.5 pr-0.5 -->
            <div 
              class="settings-option-pill" 
              :style="{ 
                '--tag-text-color': getContrastColor(tag.color),
                backgroundColor: tag.color, 
                borderColor: tag.color 
              }"
            >
              <div class="settings-option-grid">
                <!-- Hidden sizer for auto-width -->
                <span class="settings-option-sizer">{{ tag.name || ' ' }}</span>
                <!-- Input overlays the sizer -->
                <input
                  class="settings-option-input"
                  :value="tag.name"
                  :title="tag.name"
                  @input="updateTagName(tag, $event.target.value)"
                  @blur="blurTagName(tag, $event)"
                />
              </div>
            </div>
            
            <!-- Options Menu -->
             <DropdownMenu
              class="settings-option-menu-wrapper"
              :items="getTagMenuItems(tag)"
              position="right"
              width="14rem"
              :closeOnSelect="true"
              contentPosition="before"
            >
              <template #trigger>
                <div class="settings-option-menu-trigger">
                  <span class="sr-only">Options</span>
                  <!-- Using the SVG from the snippet or Lucide equivalent -->
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gray-400 group-hover:text-gray-600">
                    <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </div>
              </template>
              <template #content>
                <div class="settings-option-color">
                  <ColorPicker v-model="tag.color" @update:modelValue="hasPendingChanges = true" />
                </div>
                <div class="settings-option-divider"></div>
              </template>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <button type="button" class="settings-option-add" @click="addTag()">
        {{ t('settings.customFields.actions.newOption', '+ New option') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-editor-section {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
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

.settings-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.settings-field-title {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
}

.settings-option-add-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
  border-radius: 4px;
}

.settings-option-add-btn:hover {
  background: #f3f4f6;
  color: var(--color-gray-700);
}

.settings-option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
}

.settings-option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Row: flex container with overflow protection */
.settings-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

/* Pill: flex container, constrained width */
.settings-option-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  border-radius: 4px;
  border: 1px solid transparent;
  padding: 0; /* REMOVED: Let input handle padding */
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  color: var(--tag-text-color, #111827);
  overflow: hidden;
}

/* Grid wrapper for auto-sizing input */
.settings-option-grid {
  display: inline-grid;
  grid-template-columns: minmax(0, max-content);
  align-items: center;
  max-width: 100%;
  position: relative;
  height: 100%;
}

/* Both sizer and input share the same grid cell */
.settings-option-sizer,
.settings-option-input {
  grid-area: 1 / 1;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 0 6px; /* Unified padding */
  margin: 0;
  border: none;
  background: transparent;
  width: 100%;
  min-width: 0;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  box-sizing: border-box;
}

/* Sizer: Visible text layer */
.settings-option-sizer {
  visibility: visible;
  pointer-events: none;
  box-sizing: content-box;
  height: 100%;
  display: flex; /* Changed from block to flex */
  align-items: center; /* Center text vertically */
  width: max-content;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  user-select: none;
  line-height: normal; /* Reset line-height to let flex center it */
}

/* Input: Hidden by default, Visible on focus */
.settings-option-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  outline: none;
  opacity: 0;
  cursor: text;
  font-size: 12px !important;
  padding: 0 6px !important;
  border: none !important;
  box-sizing: border-box !important;
  overflow-x: auto;
  overflow-y: hidden;
  color: inherit;
  caret-color: inherit;
}

.settings-option-input:focus {
  opacity: 1;
  outline: none;
}

.settings-option-grid:focus-within .settings-option-sizer {
  visibility: hidden;
}

.settings-option-grid:focus-within .settings-option-input {
  opacity: 1;
}

.settings-option-grid:focus-within .settings-option-sizer {
  color: transparent;
}

.settings-option-input::-webkit-scrollbar {
  display: none;
}

.settings-option-input {
  scrollbar-width: none;
}



/* Menu: anchored to far right */
.settings-option-menu-wrapper {
  flex: 0 0 auto;
}

/* Menu trigger styling */
.settings-option-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid transparent;
  padding: 4px;
  min-width: 28px;
  min-height: 28px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.settings-option-menu-trigger:hover {
  background-color: #f3f4f6;
}

.settings-option-color {
  padding: 0;
}

.settings-option-divider {
  border-top: 1px solid #f3f4f6;
  margin: 4px 0;
}

.settings-option-add {
  font-size: 14px;
  color: var(--color-gray-500);
  text-align: left;
  padding: 0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-option-add:hover {
  color: var(--color-gray-700);
}
</style>





