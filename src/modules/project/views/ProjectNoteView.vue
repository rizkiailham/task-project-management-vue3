<script setup>
/**
 * ProjectNoteView - View for displaying and editing project notes
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import NotionEditor from '@/components/editor/NotionEditor.vue'
import { Plus, Sparkles } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const route = useRoute()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t } = useI18n()

// Immediate sync of route param to store to ensure sidebar highlight is correct
if (route.params.itemId) {
  projectStore.selectProjectItem(route.params.itemId)
}

// Props (from router params)
const projectId = computed(() => route.params.projectId)
const itemId = computed(() => route.params.itemId)

// State
const note = ref(null)
const isLoading = ref(false)
const isEditing = ref(false)
const localContent = ref('')
const noteTitle = ref('')
const saveTimeout = ref(null)

// Note items (assumes note item stores content in 'content' or 'description' field)
// Based on typical implementation, specialized items might have a specific data structure.
// For now, we assume standard project item structure with a 'content' field for the note body.

async function fetchNote() {
  if (!projectId.value || !itemId.value) return
  
  isLoading.value = true
  try {
    if (itemId.value.startsWith('dummy-')) {
      // Handle dummy data
      const dummyNotes = [
        { id: 'dummy-1', name: 'Astral Voyage', type: 'note', content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet efficitur ex, nec laoreet diam.</p>' },
        { id: 'dummy-2', name: 'Saturn Orbit', type: 'note', content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet efficitur ex, nec laoreet diam.</p>' },
        { id: 'dummy-3', name: 'Terrestrial Journey', type: 'note', content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet efficitur ex, nec laoreet diam.</p>' },
        { id: 'dummy-4', name: 'Third Rock', type: 'note', content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet efficitur ex, nec laoreet diam.</p>' },
        { id: 'dummy-5', name: 'Mercury Rising', type: 'note', content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet efficitur ex, nec laoreet diam.</p>' }
      ]
      const found = dummyNotes.find(d => d.id === itemId.value)
      if (found) {
        note.value = found
        noteTitle.value = found.name
        localContent.value = found.content
        return
      }
    }

    // We can use getProjectItems to find the item in local state if loaded, or fetch fresh
    await projectStore.fetchProjectItems(projectId.value)
    const items = projectStore.getProjectItems(projectId.value)
    const found = items.find(i => i.id === itemId.value)
    
    if (found) {
      note.value = found
      noteTitle.value = found.name
      // Assuming 'content' field holds the HTML/JSON for the note
      localContent.value = found.content || ''
    } else {
      // Handle 404
      uiStore.showError('Note not found')
    }
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

watch([projectId, itemId], fetchNote, { immediate: true })

// Editor Methods
function isContentEmpty(html) {
  const raw = (html ?? '').trim()
  if (!raw) return true
  // Simple check - existing NotionEditor check is more robust but this suffices for "Empty State" toggle
  const text = raw.replace(/<[^>]*>/g, '').trim()
  return text.length === 0
}

const showEmptyState = computed(() => {
  return !isLoading.value && note.value && isContentEmpty(localContent.value) && !isEditing.value
})

function startEditing() {
  isEditing.value = true
}

function handleContentUpdate(content) {
  localContent.value = content
  
  if (saveTimeout.value) clearTimeout(saveTimeout.value)
  saveTimeout.value = setTimeout(() => {
    saveNote()
  }, 1000)
}

function handleTitleUpdate() {
  saveNoteTitle()
}

async function saveNote() {
  if (!note.value) return
  try {
    await projectStore.updateProjectItem(projectId.value, itemId.value, { content: localContent.value })
  } catch (error) {
    console.error('Failed to save note content', error)
  }
}

async function saveNoteTitle() {
  if (!note.value) return
  const newName = noteTitle.value.trim()
  if (!newName || newName === note.value.name) return
  
  try {
    await projectStore.updateProjectItem(projectId.value, itemId.value, { name: newName })
    note.value.name = newName
  } catch (error) {
    uiStore.showApiError(error)
  }
}

onUnmounted(() => {
  if (saveTimeout.value) clearTimeout(saveTimeout.value)
})

</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header (Only show if not empty state or if we want persistent header) -->
    <!-- The design shows "Admina / Notes" in Topbar, checking if we need local header -->
    <!-- We will keep the title editor visible when editing/viewing content -->
    
    <div v-if="note" class="flex-none px-8 pt-8 pb-4">
      <InputText
        v-model="noteTitle"
        class="text-4xl font-bold text-gray-900 !border-none !p-0 !bg-transparent !shadow-none !ring-0 !outline-none w-full placeholder:text-gray-300 focus:!ring-0 focus:!border-none focus:!shadow-none focus:!outline-none"
        placeholder="Note title"
        unstyled
        @blur="handleTitleUpdate"
        @keydown.enter="handleTitleUpdate"
      />
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto px-8 pb-8">
      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center items-center h-full">
        <i class="pi pi-spinner pi-spin text-2xl text-gray-400"></i>
      </div>

      <!-- Editor -->
      <div v-else-if="note" class="max-w-4xl mx-auto">
        <NotionEditor
          :model-value="localContent"
          placeholder="Write description '/' for assistant"
          :editable="true"
          :borderless="true"
          @update:model-value="handleContentUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  min-height: 300px;
  font-size: 16px;
  line-height: 1.6;
}
:deep(.p-inputtext:enabled:focus) {
  box-shadow: none;
}
</style>
