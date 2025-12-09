<script setup>
/**
 * RichTextEditor - CKEditor 5 wrapper component with AI features
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useAIStore, useUIStore } from '@/stores'

// PrimeVue
import Button from 'primevue/button'
import Menu from 'primevue/menu'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Start writing...'
  },
  minHeight: {
    type: String,
    default: '150px'
  },
  showAITools: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const aiStore = useAIStore()
const uiStore = useUIStore()

// State
const editorRef = ref(null)
const editorInstance = ref(null)
const isEditorReady = ref(false)
const aiMenuRef = ref(null)
const selectedText = ref('')

// AI menu items
const aiMenuItems = ref([
  {
    label: 'Improve Writing',
    icon: 'pi pi-sparkles',
    command: () => improveWriting()
  },
  {
    label: 'Make Shorter',
    icon: 'pi pi-compress',
    command: () => rewriteContent('shorter')
  },
  {
    label: 'Make Longer',
    icon: 'pi pi-expand',
    command: () => rewriteContent('longer')
  },
  {
    label: 'Fix Grammar',
    icon: 'pi pi-check',
    command: () => rewriteContent('grammar')
  },
  { separator: true },
  {
    label: 'Summarize',
    icon: 'pi pi-list',
    command: () => summarizeContent()
  }
])

// Computed
const isGenerating = computed(() => aiStore.isGenerating)

// Initialize CKEditor
onMounted(async () => {
  try {
    // Dynamic import for code splitting
    const { default: ClassicEditor } = await import('@ckeditor/ckeditor5-build-classic')
    
    if (editorRef.value) {
      editorInstance.value = await ClassicEditor.create(editorRef.value, {
        placeholder: props.placeholder,
        toolbar: [
          'heading',
          '|',
          'bold',
          'italic',
          'link',
          'bulletedList',
          'numberedList',
          '|',
          'blockQuote',
          'insertTable',
          '|',
          'undo',
          'redo'
        ]
      })

      // Set initial content
      if (props.modelValue) {
        editorInstance.value.setData(props.modelValue)
      }

      // Listen for changes
      editorInstance.value.model.document.on('change:data', () => {
        const data = editorInstance.value.getData()
        emit('update:modelValue', data)
      })

      // Listen for focus/blur
      editorInstance.value.editing.view.document.on('focus', () => {
        emit('focus')
      })

      editorInstance.value.editing.view.document.on('blur', () => {
        emit('blur')
      })

      // Track selection for AI features
      editorInstance.value.model.document.selection.on('change:range', () => {
        const selection = editorInstance.value.model.document.selection
        const range = selection.getFirstRange()
        
        if (range && !range.isCollapsed) {
          // Get selected text
          let text = ''
          for (const item of range.getItems()) {
            if (item.is('$text') || item.is('$textProxy')) {
              text += item.data
            }
          }
          selectedText.value = text
        } else {
          selectedText.value = ''
        }
      })

      isEditorReady.value = true
    }
  } catch (error) {
    uiStore.showError('Failed to load editor')
  }
})

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (editorInstance.value && editorInstance.value.getData() !== newValue) {
    editorInstance.value.setData(newValue || '')
  }
})

// Watch for disabled state
watch(() => props.disabled, (disabled) => {
  if (editorInstance.value) {
    editorInstance.value.isReadOnly = disabled
  }
})

// AI Methods
function showAIMenu(event) {
  aiMenuRef.value.toggle(event)
}

async function improveWriting() {
  const content = selectedText.value || props.modelValue
  if (!content) {
    uiStore.showWarning('Please write some content first')
    return
  }

  try {
    const result = await aiStore.improveClarity(content)
    if (result) {
      if (selectedText.value) {
        replaceSelectedText(result)
      } else {
        editorInstance.value.setData(result)
        emit('update:modelValue', result)
      }
    }
  } catch (error) {
    uiStore.showError('Failed to improve writing')
  }
}

async function rewriteContent(style) {
  const content = selectedText.value || props.modelValue
  if (!content) {
    uiStore.showWarning('Please write some content first')
    return
  }

  try {
    const result = await aiStore.rewrite(content, style)
    if (result) {
      if (selectedText.value) {
        replaceSelectedText(result)
      } else {
        editorInstance.value.setData(result)
        emit('update:modelValue', result)
      }
    }
  } catch (error) {
    uiStore.showError('Failed to rewrite content')
  }
}

async function summarizeContent() {
  const content = selectedText.value || props.modelValue
  if (!content) {
    uiStore.showWarning('Please write some content first')
    return
  }

  try {
    const result = await aiStore.summarize(content)
    if (result) {
      if (selectedText.value) {
        replaceSelectedText(result)
      } else {
        editorInstance.value.setData(result)
        emit('update:modelValue', result)
      }
    }
  } catch (error) {
    uiStore.showError('Failed to summarize content')
  }
}

function replaceSelectedText(newText) {
  if (!editorInstance.value) return
  
  editorInstance.value.model.change(writer => {
    const selection = editorInstance.value.model.document.selection
    const range = selection.getFirstRange()
    
    if (range) {
      writer.remove(range)
      writer.insertText(newText, range.start)
    }
  })
}
</script>

<template>
  <div class="rich-text-editor">
    <!-- AI Toolbar -->
    <div v-if="showAITools && isEditorReady" class="mb-2 flex items-center gap-2">
      <Button
        icon="pi pi-sparkles"
        label="AI Tools"
        text
        size="small"
        :loading="isGenerating"
        @click="showAIMenu"
      />
      <span v-if="selectedText" class="text-xs text-gray-500">
        {{ selectedText.length }} characters selected
      </span>
    </div>

    <!-- Editor Container -->
    <div 
      class="editor-container rounded-lg border border-gray-200 dark-edit:border-gray-700"
      :style="{ minHeight: minHeight }"
    >
      <div ref="editorRef"></div>
    </div>

    <!-- AI Menu -->
    <Menu ref="aiMenuRef" :model="aiMenuItems" :popup="true" />
  </div>
</template>

<style>
/* CKEditor custom styles */
.ck-editor__editable {
  min-height: v-bind(minHeight);
}

.ck.ck-editor__main > .ck-editor__editable {
  background: transparent;
}

.dark .ck.ck-editor__main > .ck-editor__editable {
  color: #e5e7eb;
}

.ck.ck-toolbar {
  border-radius: 0.5rem 0.5rem 0 0 !important;
  border-color: #e5e7eb !important;
}

.dark .ck.ck-toolbar {
  background: #374151 !important;
  border-color: #4b5563 !important;
}

.dark .ck.ck-toolbar .ck-button {
  color: #e5e7eb !important;
}

.ck.ck-editor__editable:not(.ck-editor__nested-editable).ck-focused {
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
}
</style>

