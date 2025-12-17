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
import { onBeforeUnmount } from 'vue'
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
import { useAIChatStore } from '@/stores'

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
  
  const content = editor.value.getText().trim()
  if (!content) return
  
  // Extract mentions
  const mentions = []
  editor.value.state.doc.descendants((node) => {
    if (node.type.name === 'mention') {
      mentions.push(node.attrs)
    }
  })
  
  emit('send', { content, mentions })
  editor.value.commands.clearContent()
}

function focus() {
  editor.value?.commands.focus()
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
    <!-- Editor Content -->
    <div class="editor-wrapper bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
      <EditorContent :editor="editor" />
    </div>
    
    <!-- Action Buttons -->
    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center gap-2">
        <!-- Attach File -->
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Attach file"
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
        :disabled="disabled"
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
  color: #7c3aed;
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
  accent-color: #7c3aed;
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

