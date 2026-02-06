<script setup>
/**
 * SettingsProjectImport - Project import functionality
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, AlertTriangle, Loader2 } from 'lucide-vue-next'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

const { t } = useI18n()

// State
const currentState = ref('idle') // idle, parsing, preview, importing, success
const replaceMatching = ref(true)
const showDuplicateWarning = ref(false)
const selectedFile = ref(null)
const fileInput = ref(null)

// Mock Data for Preview
const previewItems = ref([
  { id: 1, name: 'Project Mix', type: 'Board', selected: true },
  { id: 2, name: 'Client Form', type: 'Form', selected: true },
  { id: 3, name: 'Submit Form 1', type: 'Form', selected: false },
  { id: 4, name: 'Email register', type: 'Email', selected: true },
  { id: 5, name: 'Project client notes', type: 'Notes', selected: false },
  { id: 6, name: 'Data folder', type: 'Folder', selected: true },
])

const duplicateCount = ref(3) // Simulated duplicates for warning

function triggerFileSelect() {
  fileInput.value.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  selectedFile.value = file
  startParsing()
}

function startParsing() {
  currentState.value = 'parsing'
  // Simulate parsing delay
  setTimeout(() => {
    currentState.value = 'preview'
  }, 2000)
}

function handleStartImport() {
  // Simulate duplicate check logic
  // For demo, we just show the warning immediately if we are in preview
  showDuplicateWarning.value = true
}

function confirmImport() {
  showDuplicateWarning.value = false
  // Proceed with import
  console.log('Importing items:', previewItems.value.filter(i => i.selected))
  
  // Reset after success
  currentState.value = 'idle'
  selectedFile.value = null
}
</script>

<template>
  <div class="settings-editor-section relative">
    
    <!-- HEADER -->
    <div class="mb-6">
      <div class="settings-editor-section-title">
        {{ t('settings.project.menu.items.import', 'Import') }}
      </div>
      <div class="settings-toggle-subtitle mt-2 max-w-2xl">
        {{ t('settings.project.import.description', "Import data by uploading a supported file. Imported records will be created, updated or replaced if already exist accordingly within this project") }}
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="settings-editor-field">
      
      <!-- IDLE STATE -->
      <div v-if="currentState === 'idle'">
        <!-- Replace Toggle -->
        <div class="flex items-center justify-between mb-8">
          <div class="max-w-md">
            <div class="text-sm font-medium text-gray-700">
              {{ t('settings.project.import.replaceTitle', 'Existing items with matching names will be replaced.') }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ t('settings.project.import.replaceSubtitle', 'Leave unchecked to add a suffix and avoid overwriting.') }}
            </div>
          </div>
          <button 
            type="button" 
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="replaceMatching ? 'bg-blue-600' : 'bg-gray-200'"
            @click="replaceMatching = !replaceMatching"
          >
            <span 
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="replaceMatching ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <!-- File Select Button -->
         <div>
          <input ref="fileInput" type="file" class="hidden" @change="handleFileSelect" accept=".json,.csv,.zip" />
          <Button :label="t('common.selectFile', 'Select file')" @click="triggerFileSelect" />
         </div>
      </div>

      <!-- PARSING / PROGRESS STATE -->
      <div v-else-if="currentState === 'parsing'">
         <!-- Replace Toggle (Disabled/Static view) -->
        <div class="flex items-center justify-between mb-8 opacity-75 pointer-events-none">
          <div class="max-w-md">
            <div class="text-sm font-medium text-gray-700">
              {{ t('settings.project.import.replaceTitle', 'Existing items with matching names will be replaced.') }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
               {{ t('settings.project.import.replaceSubtitle', 'Leave unchecked to add a suffix and avoid overwriting.') }}
            </div>
          </div>
          <div 
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
            :class="replaceMatching ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span 
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="replaceMatching ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </div>
        </div>

        <!-- Progress Indicator -->
        <div class="flex items-center gap-3 text-sm text-gray-600">
          <Loader2 class="w-5 h-5 animate-spin text-blue-600" />
          <span>{{ t('settings.project.import.loading', 'Loading items on file') }}</span>
        </div>
      </div>

      <!-- PREVIEW STATE -->
      <div v-else-if="currentState === 'preview'">
        <!-- Replace Toggle (Static) -->
         <div class="flex items-center justify-between mb-8">
          <div class="max-w-md">
            <div class="text-sm font-medium text-gray-700">
              {{ t('settings.project.import.replaceTitle', 'Existing items with matching names will be replaced.') }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
               {{ t('settings.project.import.replaceSubtitle', 'Leave unchecked to add a suffix and avoid overwriting.') }}
            </div>
          </div>
          <button 
            type="button" 
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="replaceMatching ? 'bg-blue-600' : 'bg-gray-200'"
            @click="replaceMatching = !replaceMatching"
          >
            <span 
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="replaceMatching ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <div class="mb-2 text-sm text-gray-500 font-medium">
          {{ t('settings.project.import.chooseItems', 'Choose items to import') }}
        </div>
        
        <!-- Items List -->
        <div class="border-t border-gray-200 mb-6">
          <div 
            v-for="item in previewItems" 
            :key="item.id"
            class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-3">
              <Checkbox v-model="item.selected" :binary="true" />
              <span class="text-sm text-gray-700">{{ item.name }}</span>
            </div>
            <span class="text-sm text-gray-500 font-medium">{{ item.type }}</span>
          </div>
        </div>

        <Button :label="t('settings.project.import.start', 'Start import')" @click="handleStartImport" />
      </div>

    </div>

    <!-- DUPLICATE WARNING MODAL / POPUP -->
    <div v-if="showDuplicateWarning" class="absolute bottom-4 right-0 z-10 w-full max-w-md">
       <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4 transition-all animate-in fade-in slide-in-from-bottom-4">
         <div class="flex items-start gap-3">
           <div class="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
             <AlertTriangle class="w-5 h-5 text-yellow-600" />
           </div>
           <div class="flex-1">
             <h3 class="text-sm font-bold text-gray-900 mb-1">
               {{ t('settings.project.import.warningTitle', 'Data Replacement Warning') }}
             </h3>
             <p class="text-sm text-gray-600 mb-3">
               {{ t('settings.project.import.warningText', 'If a board item with the same name already exists, it will be replaced during import.') }}
             </p>
             <div class="flex justify-end">
               <Button 
                 :label="`${t('common.confirm', 'Confirm')} (${duplicateCount})`" 
                 size="small" 
                 severity="secondary" 
                 outlined
                 @click="confirmImport"
               />
             </div>
           </div>
         </div>
       </div>
    </div>

  </div>
</template>

<style scoped>
.settings-editor-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-height: 400px;
}

.settings-editor-section-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.08em;
}

.settings-toggle-subtitle {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}
</style>
