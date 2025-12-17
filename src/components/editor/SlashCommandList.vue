<script setup>
/**
 * SlashCommandList - Notion-style slash command dropdown
 * 
 * Shows available formatting commands when user types /
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  command: {
    type: Function,
    required: true
  }
})

const { t } = useI18n()
const selectedIndex = ref(0)

// Define available commands
const commands = computed(() => [
  {
    id: 'text',
    title: t('editor.slashCommands.text'),
    description: t('editor.slashCommands.textDesc'),
    icon: 'text',
    action: (editor) => editor.chain().focus().clearNodes().run()
  },
  {
    id: 'heading1',
    title: t('editor.slashCommands.heading1'),
    description: t('editor.slashCommands.heading1Desc'),
    icon: 'h1',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: 'heading2',
    title: t('editor.slashCommands.heading2'),
    description: t('editor.slashCommands.heading2Desc'),
    icon: 'h2',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: 'heading3',
    title: t('editor.slashCommands.heading3'),
    description: t('editor.slashCommands.heading3Desc'),
    icon: 'h3',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
  },
  {
    id: 'bulletList',
    title: t('editor.slashCommands.bulletList'),
    description: t('editor.slashCommands.bulletListDesc'),
    icon: 'list',
    action: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: 'numberedList',
    title: t('editor.slashCommands.numberedList'),
    description: t('editor.slashCommands.numberedListDesc'),
    icon: 'ordered-list',
    action: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: 'taskList',
    title: t('editor.slashCommands.taskList'),
    description: t('editor.slashCommands.taskListDesc'),
    icon: 'checkbox',
    action: (editor) => editor.chain().focus().toggleTaskList().run()
  },
  {
    id: 'quote',
    title: t('editor.slashCommands.quote'),
    description: t('editor.slashCommands.quoteDesc'),
    icon: 'quote',
    action: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: 'divider',
    title: t('editor.slashCommands.divider'),
    description: t('editor.slashCommands.dividerDesc'),
    icon: 'divider',
    action: (editor) => editor.chain().focus().setHorizontalRule().run()
  },
  {
    id: 'codeBlock',
    title: t('editor.slashCommands.codeBlock'),
    description: t('editor.slashCommands.codeBlockDesc'),
    icon: 'code',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run()
  }
])

// Filter commands based on query
const filteredCommands = computed(() => {
  if (!props.items || props.items.length === 0) {
    return commands.value
  }
  const query = props.items[0]?.toLowerCase() || ''
  return commands.value.filter(cmd => 
    cmd.title.toLowerCase().includes(query) ||
    cmd.id.toLowerCase().includes(query)
  )
})

// Reset selection when items change
watch(() => props.items, () => {
  selectedIndex.value = 0
})

function selectItem(index) {
  const item = filteredCommands.value[index]
  if (item) {
    props.command(item)
  }
}

function onKeyDown(event) {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + filteredCommands.value.length - 1) % filteredCommands.value.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

function getIcon(iconType) {
  const icons = {
    text: `<path d="M4 7V4h16v3M9 20h6M12 4v16"/>`,
    h1: `<path d="M4 12h8M4 18V6M12 18V6"/><path d="M17 12l3-2v8"/>`,
    h2: `<path d="M4 12h8M4 18V6M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>`,
    h3: `<path d="M4 12h8M4 18V6M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2m-1.5 4c1.7 1 3.5 0 3.5-1.5a2 2 0 0 0-2-2"/>`,
    list: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>`,
    'ordered-list': `<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>`,
    checkbox: `<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="18" x2="21" y2="18"/>`,
    quote: `<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z"/>`,
    divider: `<line x1="3" y1="12" x2="21" y2="12"/>`,
    code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`
  }
  return icons[iconType] || icons.text
}

// Expose for parent component
defineExpose({ onKeyDown })
</script>

<template>
  <div class="slash-command-dropdown bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-72 max-h-80 overflow-y-auto">
    <div class="px-3 py-1.5">
      <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {{ t('editor.slashCommands.title') }}
      </span>
    </div>
    
    <div v-if="filteredCommands.length === 0" class="px-3 py-2 text-sm text-gray-500">
      {{ t('editor.mentions.noResults') }}
    </div>
    
    <button
      v-for="(cmd, index) in filteredCommands"
      :key="cmd.id"
      @click="selectItem(index)"
      class="flex items-center gap-3 w-full px-3 py-2 text-left transition-colors"
      :class="selectedIndex === index ? 'bg-primary-50' : 'hover:bg-gray-50'"
    >
      <div 
        class="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center"
        :class="selectedIndex === index ? 'border-primary-300 bg-primary-50' : 'bg-white'"
      >
        <svg 
          class="w-5 h-5" 
          :class="selectedIndex === index ? 'text-primary-600' : 'text-gray-500'"
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          v-html="getIcon(cmd.icon)"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p 
          class="text-sm font-medium truncate"
          :class="selectedIndex === index ? 'text-primary-700' : 'text-gray-700'"
        >
          {{ cmd.title }}
        </p>
        <p class="text-xs text-gray-400 truncate">{{ cmd.description }}</p>
      </div>
    </button>
  </div>
</template>

<style scoped>
.slash-command-dropdown {
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar */
.slash-command-dropdown::-webkit-scrollbar {
  width: 4px;
}

.slash-command-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.slash-command-dropdown::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
</style>

