<script setup>
/**
 * BubbleToolbar - Floating toolbar that appears on text selection
 *
 * Features:
 * - Ask AI button
 * - Heading/block type selector dropdown (Text, H1-H3, Lists, Quote, Code)
 * - Inline link input
 * - Math/formula button
 * - Bold, Italic, Underline, Strikethrough
 * - Code formatting
 * - Background color picker
 */
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['ask-ai'])

const { t } = useI18n()

// State
const showHeadingDropdown = ref(false)
const showColorDropdown = ref(false)
const showLinkInput = ref(false)
const linkUrl = ref('')
const linkInputRef = ref(null)

// Computed - detect current block type
const currentBlockType = computed(() => {
  if (!props.editor) return 'text'
  if (props.editor.isActive('heading', { level: 1 })) return 'h1'
  if (props.editor.isActive('heading', { level: 2 })) return 'h2'
  if (props.editor.isActive('heading', { level: 3 })) return 'h3'
  if (props.editor.isActive('taskList')) return 'todo'
  if (props.editor.isActive('bulletList')) return 'bullet'
  if (props.editor.isActive('orderedList')) return 'numbered'
  if (props.editor.isActive('blockquote')) return 'quote'
  if (props.editor.isActive('codeBlock')) return 'codeBlock'
  return 'text'
})

const blockTypeLabel = computed(() => {
  const labels = {
    text: t('editor.bubble.text'),
    h1: t('editor.bubble.heading1'),
    h2: t('editor.bubble.heading2'),
    h3: t('editor.bubble.heading3'),
    todo: t('editor.bubble.todoList'),
    bullet: t('editor.bubble.bulletList'),
    numbered: t('editor.bubble.numberedList'),
    quote: t('editor.bubble.quote'),
    codeBlock: t('editor.bubble.codeBlock')
  }
  return labels[currentBlockType.value] || t('editor.bubble.text')
})

// Background colors with labels
const bgColors = [
  { name: 'default', value: null, label: t('editor.bubble.bgDefault'), color: 'transparent' },
  { name: 'purple', value: '#7c3aed', label: t('editor.bubble.bgPurple'), color: '#7c3aed' },
  { name: 'red', value: '#dc2626', label: t('editor.bubble.bgRed'), color: '#dc2626' },
  { name: 'yellow', value: '#ca8a04', label: t('editor.bubble.bgYellow'), color: '#ca8a04' },
  { name: 'blue', value: '#2563eb', label: t('editor.bubble.bgBlue'), color: '#2563eb' },
  { name: 'green', value: '#16a34a', label: t('editor.bubble.bgGreen'), color: '#16a34a' },
  { name: 'orange', value: '#ea580c', label: t('editor.bubble.bgOrange'), color: '#ea580c' },
  { name: 'pink', value: '#db2777', label: t('editor.bubble.bgPink'), color: '#db2777' },
  { name: 'gray', value: '#4b5563', label: t('editor.bubble.bgGray'), color: '#4b5563' }
]

// Methods
function askAI() {
  emit('ask-ai')
}

function toggleBold() {
  props.editor.chain().focus().toggleBold().run()
}

function toggleItalic() {
  props.editor.chain().focus().toggleItalic().run()
}

function toggleUnderline() {
  props.editor.chain().focus().toggleUnderline().run()
}

function toggleStrike() {
  props.editor.chain().focus().toggleStrike().run()
}

function toggleCode() {
  props.editor.chain().focus().toggleCode().run()
}

function toggleCodeBlock() {
  props.editor.chain().focus().toggleCodeBlock().run()
}

function setBlockType(type) {
  switch (type) {
    case 'text':
      props.editor.chain().focus().setParagraph().run()
      break
    case 'h1':
      props.editor.chain().focus().toggleHeading({ level: 1 }).run()
      break
    case 'h2':
      props.editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'h3':
      props.editor.chain().focus().toggleHeading({ level: 3 }).run()
      break
    case 'todo':
      props.editor.chain().focus().toggleTaskList().run()
      break
    case 'bullet':
      props.editor.chain().focus().toggleBulletList().run()
      break
    case 'numbered':
      props.editor.chain().focus().toggleOrderedList().run()
      break
    case 'quote':
      props.editor.chain().focus().toggleBlockquote().run()
      break
    case 'codeBlock':
      props.editor.chain().focus().toggleCodeBlock().run()
      break
  }
  showHeadingDropdown.value = false
}

function openLinkInput() {
  // Toggle link input dropdown
  if (showLinkInput.value) {
    showLinkInput.value = false
    linkUrl.value = ''
    return
  }

  // Close other dropdowns
  showHeadingDropdown.value = false
  showColorDropdown.value = false

  const previousUrl = props.editor.getAttributes('link').href || ''
  linkUrl.value = previousUrl
  showLinkInput.value = true
  nextTick(() => {
    linkInputRef.value?.focus()
  })
}

function applyLink() {
  if (linkUrl.value === '') {
    props.editor.chain().focus().unsetLink().run()
  } else {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run()
  }
  showLinkInput.value = false
  linkUrl.value = ''
}

function cancelLink() {
  showLinkInput.value = false
  linkUrl.value = ''
  props.editor.chain().focus().run()
}

function handleLinkKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    applyLink()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelLink()
  }
}

function setHighlight(color) {
  if (color === null) {
    props.editor.chain().focus().unsetHighlight().run()
  } else {
    props.editor.chain().focus().toggleHighlight({ color }).run()
  }
  showColorDropdown.value = false
}

function closeDropdowns() {
  showHeadingDropdown.value = false
  showColorDropdown.value = false
  showLinkInput.value = false
}

function toggleHeadingDropdown() {
  showColorDropdown.value = false
  showLinkInput.value = false
  showHeadingDropdown.value = !showHeadingDropdown.value
}

function toggleColorDropdown() {
  showHeadingDropdown.value = false
  showLinkInput.value = false
  showColorDropdown.value = !showColorDropdown.value
}
</script>

<template>
  <div
    class="bubble-toolbar inline-flex items-center bg-gray-900 rounded-lg shadow-2xl p-1.5 border border-gray-700 max-w-max"
    @click.stop
  >
    <!-- Ask AI Button -->
    <button
      @click="askAI"
      class="flex items-center gap-1.5 px-2 py-1 text-xs text-violet-400 hover:bg-gray-800 rounded transition-colors whitespace-nowrap"
      :title="t('editor.bubble.askAI')"
    >
      <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      </svg>
      <span>Ask AI</span>
    </button>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Block Type Dropdown -->
    <div class="relative flex-shrink-0">
      <button
        @click="toggleHeadingDropdown"
        class="flex items-center gap-1 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800 rounded transition-colors whitespace-nowrap"
        :class="{ 'bg-gray-800': showHeadingDropdown }"
      >
        <span>{{ blockTypeLabel }}</span>
        <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Block Type Options -->
      <div
        v-if="showHeadingDropdown"
        class="absolute top-full left-0 mt-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 min-w-[140px] z-[100]"
      >
        <!-- Text -->
        <button
          @click="setBlockType('text')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'text' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
          </svg>
          <span>{{ t('editor.bubble.text') }}</span>
          <svg v-if="currentBlockType === 'text'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Heading 1 -->
        <button
          @click="setBlockType('h1')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors font-bold"
          :class="{ 'bg-gray-800': currentBlockType === 'h1' }"
        >
          <span class="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">H1</span>
          <span>{{ t('editor.bubble.heading1') }}</span>
          <svg v-if="currentBlockType === 'h1'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Heading 2 -->
        <button
          @click="setBlockType('h2')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors font-semibold"
          :class="{ 'bg-gray-800': currentBlockType === 'h2' }"
        >
          <span class="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">H2</span>
          <span>{{ t('editor.bubble.heading2') }}</span>
          <svg v-if="currentBlockType === 'h2'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Heading 3 -->
        <button
          @click="setBlockType('h3')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors font-medium"
          :class="{ 'bg-gray-800': currentBlockType === 'h3' }"
        >
          <span class="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-medium flex-shrink-0">H3</span>
          <span>{{ t('editor.bubble.heading3') }}</span>
          <svg v-if="currentBlockType === 'h3'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- To-do List -->
        <button
          @click="setBlockType('todo')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'todo' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M9 12l2 2 4-4"></path>
          </svg>
          <span>{{ t('editor.bubble.todoList') }}</span>
          <svg v-if="currentBlockType === 'todo'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Bullet List -->
        <button
          @click="setBlockType('bullet')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'bullet' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <circle cx="4" cy="6" r="1" fill="currentColor"></circle>
            <circle cx="4" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="4" cy="18" r="1" fill="currentColor"></circle>
          </svg>
          <span>{{ t('editor.bubble.bulletList') }}</span>
          <svg v-if="currentBlockType === 'bullet'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Numbered List -->
        <button
          @click="setBlockType('numbered')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'numbered' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <text x="2" y="8" font-size="7" fill="currentColor">1</text>
            <text x="2" y="14" font-size="7" fill="currentColor">2</text>
            <text x="2" y="20" font-size="7" fill="currentColor">3</text>
          </svg>
          <span>{{ t('editor.bubble.numberedList') }}</span>
          <svg v-if="currentBlockType === 'numbered'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Quote -->
        <button
          @click="setBlockType('quote')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'quote' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"></path>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4"></path>
          </svg>
          <span>{{ t('editor.bubble.quote') }}</span>
          <svg v-if="currentBlockType === 'quote'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <!-- Code Block -->
        <button
          @click="setBlockType('codeBlock')"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': currentBlockType === 'codeBlock' }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>{{ t('editor.bubble.codeBlock') }}</span>
          <svg v-if="currentBlockType === 'codeBlock'" class="w-3.5 h-3.5 ml-auto text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Link Button with Dropdown -->
    <div class="relative flex-shrink-0">
      <button
        @click="openLinkInput"
        class="flex items-center gap-1 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800 rounded transition-colors whitespace-nowrap"
        :class="{ 'bg-violet-600 text-white': editor.isActive('link') || showLinkInput }"
        :title="t('editor.bubble.link')"
      >
        <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <span>Link</span>
      </button>

      <!-- Link Input Dropdown -->
      <div
        v-if="showLinkInput"
        class="absolute top-full left-0 mt-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 p-2 z-[100] min-w-[200px]"
      >
        <div class="flex items-center gap-2">
          <input
            ref="linkInputRef"
            v-model="linkUrl"
            type="text"
            :placeholder="t('editor.bubble.pasteLink')"
            class="flex-1 bg-gray-800 text-xs text-gray-200 placeholder-gray-500 outline-none px-3 py-2 rounded border border-gray-700 focus:border-violet-500 transition-colors"
            @keydown="handleLinkKeydown"
          />
          <button
            @click="applyLink"
            class="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors flex-shrink-0"
            :title="t('editor.bubble.applyLink')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Math/Formula Button (Σ) -->
    <button
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors text-sm font-serif flex-shrink-0"
      :title="t('editor.bubble.math')"
    >
      Σ
    </button>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Bold -->
    <button
      @click="toggleBold"
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors text-xs font-bold flex-shrink-0"
      :class="{ 'bg-violet-600 text-white': editor.isActive('bold') }"
      :title="t('editor.bubble.bold')"
    >
      B
    </button>

    <!-- Italic -->
    <button
      @click="toggleItalic"
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors text-xs italic flex-shrink-0"
      :class="{ 'bg-violet-600 text-white': editor.isActive('italic') }"
      :title="t('editor.bubble.italic')"
    >
      I
    </button>

    <!-- Underline -->
    <button
      @click="toggleUnderline"
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors text-xs underline flex-shrink-0"
      :class="{ 'bg-violet-600 text-white': editor.isActive('underline') }"
      :title="t('editor.bubble.underline')"
    >
      U
    </button>

    <!-- Strikethrough -->
    <button
      @click="toggleStrike"
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors text-xs line-through flex-shrink-0"
      :class="{ 'bg-violet-600 text-white': editor.isActive('strike') }"
      :title="t('editor.bubble.strikethrough')"
    >
      S
    </button>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Inline Code -->
    <button
      @click="toggleCode"
      class="w-6 h-6 flex items-center justify-center text-gray-200 hover:bg-gray-800 rounded transition-colors flex-shrink-0"
      :class="{ 'bg-violet-600 text-white': editor.isActive('code') }"
      :title="t('editor.bubble.code')"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    </button>

    <!-- Divider -->
    <div class="w-px h-4 bg-gray-700 mx-1 flex-shrink-0"></div>

    <!-- Background Color Picker -->
    <div class="relative flex-shrink-0">
      <button
        @click="toggleColorDropdown"
        class="flex items-center gap-0.5 px-1.5 py-1 text-gray-200 hover:bg-gray-800 rounded transition-colors"
        :class="{ 'bg-gray-800': showColorDropdown }"
        :title="t('editor.bubble.background')"
      >
        <span class="text-xs font-semibold">A</span>
        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Background Color Options -->
      <div
        v-if="showColorDropdown"
        class="absolute top-full right-0 mt-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1.5 min-w-[130px] z-[100]"
      >
        <div class="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wide">
          {{ t('editor.bubble.background') }}
        </div>
        <button
          v-for="color in bgColors"
          :key="color.name"
          @click="setHighlight(color.value)"
          class="w-full flex items-center gap-2 px-3 py-1 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <span
            class="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            :style="{ backgroundColor: color.color || '#374151' }"
          >
            A
          </span>
          <span>{{ color.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bubble-toolbar {
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

