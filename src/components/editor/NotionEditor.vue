<script setup>
/**
 * NotionEditor - Notion-style WYSIWYG editor with slash commands, mentions, and bubble toolbar
 *
 * Features:
 * - Floating bubble toolbar on text selection
 * - Slash commands (/) for formatting
 * - @ mentions for skills and tasks
 * - Rich text editing (headings, lists, quotes, etc.)
 * - Task lists with checkboxes
 * - Placeholder text
 */
import { ref, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import tippy from 'tippy.js'
import SlashCommandList from './SlashCommandList.vue'
import MentionList from './MentionList.vue'
import BubbleToolbar from './BubbleToolbar.vue'
import { useAIChatStore } from '@/stores'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  },
  minHeight: {
    type: String,
    default: '100px'
  },
  maxHeight: {
    type: String,
    default: 'none'
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  showToolbar: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const { t } = useI18n()
const aiChatStore = useAIChatStore()

// Slash command suggestion configuration
const slashSuggestion = {
  char: '/',
  command: ({ editor, range, props }) => {
    props.action(editor)
    editor.chain().focus().deleteRange(range).run()
  },
  items: ({ query }) => {
    return [query]
  },
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
          placement: 'bottom-start',
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
    )
    const tasks = aiChatStore.recentTasks.filter(t => 
      t.title.toLowerCase().includes(query.toLowerCase())
    )
    return [...skills.map(s => ({ ...s, type: 'skill' })), ...tasks.map(t => ({ ...t, type: 'task' }))].slice(0, 10)
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
          placement: 'bottom-start',
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

// Bubble menu state
const bubbleMenuRef = ref(null)
const showBubbleMenu = ref(false)
const bubbleMenuPosition = ref({ top: 0, left: 0 })
let bubbleMenuTippy = null
let isInteractingWithBubbleMenu = false

// Track mouse interactions with bubble menu to prevent hiding
function handleBubbleMenuMouseDown() {
  isInteractingWithBubbleMenu = true
}

function handleBubbleMenuMouseUp() {
  // Re-focus the editor after clicking on bubble menu
  setTimeout(() => {
    isInteractingWithBubbleMenu = false
    editor.value?.commands.focus()
  }, 10)
}

// Initialize TipTap Editor
const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  autofocus: props.autofocus,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Placeholder.configure({
      placeholder: props.placeholder || t('editor.placeholder')
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-violet-600 underline cursor-pointer' }
    }),
    Highlight.configure({ multicolor: true }),
    Typography,
    TextStyle,
    Color,
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
      class: 'notion-editor prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  onBlur: ({ event }) => {
    // Don't emit blur if interacting with bubble menu
    if (!isInteractingWithBubbleMenu) {
      emit('blur')
    }
  },
  onFocus: () => emit('focus'),
  onSelectionUpdate: ({ editor: ed }) => {
    // Don't hide bubble menu if interacting with it
    if (isInteractingWithBubbleMenu) return

    // Check if we should show the bubble menu
    const { from, to } = ed.state.selection
    const hasSelection = from !== to
    const isCodeBlock = ed.isActive('codeBlock')

    if (hasSelection && !isCodeBlock && props.editable) {
      showBubbleMenu.value = true
      // Update position
      nextTick(() => {
        updateBubbleMenuPosition()
      })
    } else {
      showBubbleMenu.value = false
    }
  }
})

// Get selection bounding rect and update bubble menu position
function updateBubbleMenuPosition() {
  if (!editor.value || !bubbleMenuTippy) return

  bubbleMenuTippy.setProps({
    getReferenceClientRect: () => {
      const { view } = editor.value
      const { from, to } = view.state.selection

      if (from === to) {
        return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }
      }

      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)

      return {
        top: start.top,
        left: start.left,
        bottom: end.bottom,
        right: end.right,
        width: end.right - start.left,
        height: end.bottom - start.top,
        x: start.left,
        y: start.top
      }
    }
  })
}

// Setup bubble menu with tippy after editor is ready
onMounted(() => {
  nextTick(() => {
    if (editor.value && bubbleMenuRef.value) {
      bubbleMenuTippy = tippy(document.body, {
        content: bubbleMenuRef.value,
        trigger: 'manual',
        interactive: true,
        placement: 'top',
        animation: 'shift-away',
        duration: 100,
        appendTo: () => document.body,
        getReferenceClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }),
        hideOnClick: false,
        onShow: () => {
          // Make sure the content is visible
          if (bubbleMenuRef.value) {
            bubbleMenuRef.value.style.display = 'block'
          }
        },
        onHide: () => {
          showBubbleMenu.value = false
        }
      })
    }
  })
})

// Watch for bubble menu visibility changes
watch(showBubbleMenu, (show) => {
  if (bubbleMenuTippy) {
    if (show) {
      updateBubbleMenuPosition()
      bubbleMenuTippy.show()
    } else {
      bubbleMenuTippy.hide()
    }
  }
})

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue, false)
  }
})

// Watch for editable changes
watch(() => props.editable, (newValue) => {
  editor.value?.setEditable(newValue)
})

// Methods
function focus() {
  editor.value?.commands.focus()
}

function getContent() {
  return editor.value?.getHTML() || ''
}

function getText() {
  return editor.value?.getText() || ''
}

function clearContent() {
  editor.value?.commands.clearContent()
}

// Cleanup
onBeforeUnmount(() => {
  if (bubbleMenuTippy) {
    bubbleMenuTippy.destroy()
    bubbleMenuTippy = null
  }
  editor.value?.destroy()
})

// Expose methods
defineExpose({ focus, getContent, getText, clearContent, editor })
</script>

<template>
  <div class="notion-editor-wrapper">
    <!-- Bubble Menu (floating toolbar on selection) - hidden, controlled by tippy -->
    <div
      ref="bubbleMenuRef"
      class="bubble-menu-container"
      style="display: none;"
      @mousedown="handleBubbleMenuMouseDown"
      @mouseup="handleBubbleMenuMouseUp"
    >
      <BubbleToolbar v-if="editor" :editor="editor" />
    </div>

    <EditorContent
      :editor="editor"
      class="notion-editor-content"
      :style="{ minHeight: minHeight, maxHeight: maxHeight }"
    />
  </div>
</template>

<style>
@reference "tailwindcss";

/* Notion Editor Styles */
.notion-editor-wrapper {
  @apply rounded-lg border border-gray-200 bg-white;
  @apply hover:border-gray-300 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100;
  @apply transition-all;
}

.notion-editor-content {
  @apply overflow-y-auto;
}

.notion-editor {
  @apply px-3 py-2;
}

.notion-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* Headings */
.notion-editor h1 { @apply text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0; }
.notion-editor h2 { @apply text-xl font-semibold text-gray-900 mb-3 mt-5 first:mt-0; }
.notion-editor h3 { @apply text-lg font-medium text-gray-900 mb-2 mt-4 first:mt-0; }

/* Lists */
.notion-editor ul { @apply list-disc pl-6 mb-3; }
.notion-editor ol { @apply list-decimal pl-6 mb-3; }
.notion-editor li { @apply mb-1; }

/* Task List */
.notion-editor ul[data-type="taskList"] {
  @apply list-none pl-0;
}

.notion-editor ul[data-type="taskList"] li {
  @apply flex items-start gap-2 mb-1;
}

.notion-editor ul[data-type="taskList"] li > label {
  @apply flex items-center;
}

.notion-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
  @apply w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500;
}

.notion-editor ul[data-type="taskList"] li > div {
  @apply flex-1;
}

.notion-editor ul[data-type="taskList"] li[data-checked="true"] > div {
  @apply line-through text-gray-400;
}

/* Blockquote */
.notion-editor blockquote {
  @apply border-l-4 border-gray-200 pl-4 italic text-gray-600 my-4;
}

/* Code Block */
.notion-editor pre {
  @apply bg-gray-100 rounded-lg p-4 my-4 overflow-x-auto;
}

.notion-editor pre code {
  @apply text-sm font-mono text-gray-800;
}

/* Inline Code */
.notion-editor code:not(pre code) {
  @apply bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600;
}

/* Horizontal Rule */
.notion-editor hr {
  @apply border-t border-gray-200 my-6;
}

/* Mentions */
.notion-editor .mention {
  @apply bg-violet-100 text-violet-700 rounded px-1 py-0.5 font-medium;
}

/* Links */
.notion-editor a {
  @apply text-violet-600 underline;
}

/* Highlight */
.notion-editor mark {
  @apply bg-yellow-200 px-0.5 rounded;
}

/* Tippy themes */
.tippy-box[data-theme~='slash-command'],
.tippy-box[data-theme~='mention'] {
  background-color: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

.tippy-box[data-theme~='slash-command'] .tippy-content,
.tippy-box[data-theme~='mention'] .tippy-content {
  padding: 0;
}
</style>

