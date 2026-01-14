<script setup>
/**
 * TipTapChatEditor - TipTap-based chat input with @ mention and / slash command support
 *
 * Features:
 * - Rich text editing
 * - @ mention for Skills and Tasks
 * - / slash commands for formatting
 * - Send on Enter, new line on Shift+Enter
 * - Placeholder text
 */
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import tippy from 'tippy.js'
import MentionList from '@/components/editor/MentionList.vue'
import SlashCommandList from '@/components/editor/SlashCommandList.vue'
import { useAIChatStore, useUIStore } from '@/stores'

const props = defineProps({
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send', 'update:content'])

const { t } = useI18n()
const aiChatStore = useAIChatStore()
const uiStore = useUIStore()

const MAX_FILES = 5
const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
const FILE_ACCEPT = Array.from(ALLOWED_MIME_TYPES).join(',')

const fileInputRef = ref(null)
const attachments = ref([])
const isUploading = ref(false)
const uploadError = ref('')

// Slash command suggestion configuration
const slashSuggestion = {
  char: '/',
  command: ({ editor, range, props }) => {
    props.action(editor)
    editor.chain().focus().deleteRange(range).run()
  },
  items: ({ query }) => [query],
  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(SlashCommandList, {
          props,
          editor: props.editor
        })

        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'top-start',
          animation: 'shift-away',
          theme: 'slash-command'
        })
      },
      onUpdate(props) {
        component.updateProps(props)
        if (!props.clientRect) return
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect })
      },
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0]?.hide()
          return true
        }
        return component.ref?.onKeyDown?.(props.event)
      },
      onExit() {
        popup[0]?.destroy()
        component.destroy()
      }
    }
  }
}

// Mention suggestion configuration
const mentionSuggestion = {
  char: '@',
  items: ({ query }) => {
    const skills = aiChatStore.skills.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase())
    ).map(s => ({ ...s, type: 'skill' }))
    const tasks = aiChatStore.recentTasks.filter(t =>
      t.title.toLowerCase().includes(query.toLowerCase())
    ).map(t => ({ ...t, type: 'task' }))
    return [...skills, ...tasks].slice(0, 10)
  },
  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(MentionList, {
          props,
          editor: props.editor
        })

        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'top-start',
          animation: 'shift-away',
          theme: 'mention'
        })
      },
      onUpdate(props) {
        component.updateProps(props)
        if (!props.clientRect) return
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect })
      },
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0]?.hide()
          return true
        }
        return component.ref?.onKeyDown?.(props.event)
      },
      onExit() {
        popup[0]?.destroy()
        component.destroy()
      }
    }
  }
}

// Create custom slash command extension
const SlashCommand = Mention.extend({
  name: 'slashCommand'
}).configure({
  HTMLAttributes: { class: 'slash-command' },
  suggestion: slashSuggestion,
  renderLabel: () => ''
})

// Initialize TipTap Editor
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Placeholder.configure({
      placeholder: props.placeholder || t('aiChat.typeMessage')
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    SlashCommand,
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: mentionSuggestion,
      renderLabel({ node }) {
        return `@${node.attrs.label}`
      }
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[40px] px-3 py-2'
    },
    handleKeyDown: (_view, event) => {
      // Send on Enter (without Shift)
      if (event.key === 'Enter' && !event.shiftKey) {
        // Don't send if mention or slash command popup is open
        const hasPopupOpen = document.querySelector('.tippy-box[data-theme="mention"], .tippy-box[data-theme="slash-command"]')
        if (hasPopupOpen) return false

        event.preventDefault()
        handleSend()
        return true
      }
      return false
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:content', editor.getHTML())
  }
})

// Methods
function handleSend() {
  if (!editor.value || props.disabled) return
  if (isUploading.value) return

  const content = editor.value.getText().trim()
  const hasAttachments = attachments.value.length > 0
  if (!content && !hasAttachments) return
  
  // Extract mentions
  const mentions = []
  editor.value.state.doc.descendants((node) => {
    if (node.type.name === 'mention') {
      mentions.push(node.attrs)
    }
  })
  
  emit('send', { content, mentions, attachments: attachments.value })
  editor.value.commands.clearContent()
  attachments.value = []
  uploadError.value = ''
}

function focus() {
  editor.value?.commands.focus()
}

function openFilePicker() {
  if (props.disabled || isUploading.value) return
  fileInputRef.value?.click()
}

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}

async function handleFileSelection(event) {
  const input = event.target
  const selected = Array.from(input.files || [])
  input.value = ''
  uploadError.value = ''

  if (selected.length === 0) return

  const remainingSlots = Math.max(0, MAX_FILES - attachments.value.length)
  if (remainingSlots === 0) {
    uploadError.value = `You can attach up to ${MAX_FILES} files.`
    return
  }

  const valid = []
  for (const file of selected.slice(0, remainingSlots)) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      uploadError.value = `Unsupported file type: ${file.name}`
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      uploadError.value = `File too large (max 20MB): ${file.name}`
      continue
    }
    valid.push(file)
  }

  if (valid.length === 0) return

  isUploading.value = true
  try {
    const uploaded = await aiChatStore.uploadChatFiles(valid)
    attachments.value = [...attachments.value, ...uploaded]
  } catch (error) {
    uploadError.value = error?.message || 'Failed to upload files'
    uiStore.showApiError(error || uploadError.value, 'Failed to upload files')
  } finally {
    isUploading.value = false
  }
}

// Cleanup
onBeforeUnmount(() => {
  editor.value?.destroy()
})

// Expose methods
defineExpose({ focus, handleSend })
</script>

<template>
  <div class="tiptap-chat-editor">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      :accept="FILE_ACCEPT"
      @change="handleFileSelection"
    />

    <!-- Editor Content -->
    <div class="editor-wrapper bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
      <EditorContent :editor="editor" />
    </div>

    <!-- Attachments -->
    <div v-if="attachments.length" class="mt-2 flex flex-wrap gap-2">
      <div
        v-for="(file, index) in attachments"
        :key="file.id || `${file.name}-${index}`"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
      >
        <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
        </svg>
        <span class="max-w-[140px] truncate">{{ file.name }}</span>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          @click="removeAttachment(index)"
          aria-label="Remove attachment"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <p v-if="uploadError" class="mt-2 text-xs text-red-500">{{ uploadError }}</p>

    <!-- Action Buttons -->
    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center gap-2">
        <!-- Attach File -->
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach file"
          :disabled="disabled || isUploading || attachments.length >= MAX_FILES"
          @click="openFilePicker"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>
        
        <!-- Microphone -->
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Voice input"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
      </div>
      
      <!-- Send Button -->
      <button
        @click="handleSend"
        :disabled="disabled || isUploading"
        class="flex items-center justify-center w-9 h-9 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg hover:from-primary-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        title="Send message"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<style>
/* TipTap Editor Styles */
.tiptap-chat-editor .ProseMirror {
  min-height: 40px;
  max-height: 200px;
  overflow-y: auto;
}

.tiptap-chat-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.tiptap-chat-editor .mention {
  background-color: #ede9fe;
  color: #F97316;
  border-radius: 4px;
  padding: 0 4px;
  font-weight: 500;
}

/* Task List Styles */
.tiptap-chat-editor ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.tiptap-chat-editor ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.tiptap-chat-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  accent-color: #F97316;
}

.tiptap-chat-editor ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  color: #9ca3af;
}

/* Tippy themes for dropdowns */
.tippy-box[data-theme~='mention'],
.tippy-box[data-theme~='slash-command'] {
  background-color: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

.tippy-box[data-theme~='mention'] .tippy-content,
.tippy-box[data-theme~='slash-command'] .tippy-content {
  padding: 0;
}
</style>

