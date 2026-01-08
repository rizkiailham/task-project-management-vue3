<script setup>
/**
 * SlashCommandList - Notion-style slash command dropdown
 * 
 * Shows recommendations when user types /
 */
import { ref, computed, watch } from 'vue'
import { ClipboardList, Lightbulb, ListChecks, PenLine, Sparkles, Shrink, WandSparkles } from 'lucide-vue-next'

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

const selectedIndex = ref(0)

// Define available recommendations
const commands = computed(() => [
  {
    id: 'break-subtasks',
    title: 'Break into subtasks',
    description: 'Create a task checklist from the current idea',
    icon: ListChecks,
    draftHtml: `
      <h3>Subtasks</h3>
      <p><strong>Goal:</strong> Deliver a complete, reviewable update with clear acceptance criteria.</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Confirm scope + edge cases</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Define “done” checklist (acceptance criteria)</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Implement changes</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Validate in UI + add screenshots if needed</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>QA checklist: happy path + common failures</p></div></li>
      </ul>
    `.trim()
  },
  {
    id: 'brainstorm-methods',
    title: 'Brainstorm methods',
    description: 'Generate options and approaches to solve this',
    icon: Lightbulb,
    draftHtml: `
      <h3>Brainstorm</h3>
      <p>Pick one approach and write why it’s the best fit for this task.</p>
      <ul>
        <li><strong>Quick win:</strong> minimal change, fastest to ship</li>
        <li><strong>Robust fix:</strong> address root cause, adds guardrails</li>
        <li><strong>Incremental rollout:</strong> ship in slices, reduce risk</li>
        <li><strong>UX polish:</strong> improve flow + microcopy for clarity</li>
      </ul>
    `.trim()
  },
  {
    id: 'continue-writing',
    title: 'Continue writing',
    description: 'Extend the description with a helpful structure',
    icon: PenLine,
    draftHtml: `
      <h3>Context</h3>
      <p>What’s happening today? Who is affected? Add links/screenshots.</p>
      <h3>What to do</h3>
      <ul>
        <li> </li>
      </ul>
      <h3>Done when</h3>
      <ul>
        <li> </li>
      </ul>
    `.trim()
  },
  {
    id: 'extract-action-items',
    title: 'Extract action items',
    description: 'Add an action-items checklist you can fill in',
    icon: ClipboardList,
    draftHtml: `
      <h3>Action items</h3>
      <p>Turn this into executable steps. Keep each item small and testable.</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Identify the key requirements (inputs/outputs)</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Update the UI flow and states</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Add validation + error handling</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Sanity-check with a real example</p></div></li>
      </ul>
    `.trim()
  },
  {
    id: 'improve-description',
    title: 'Improve description',
    description: 'Add a concise, readable template',
    icon: WandSparkles,
    draftHtml: `
      <h3>Overview</h3>
      <p><strong>Goal:</strong> Describe the outcome in 1–2 sentences.</p>
      <p><strong>Users:</strong> Who uses this? (Assignee, Admin, etc.)</p>
      <p><strong>Scope:</strong> What’s included / not included.</p>
      <p><strong>Constraints:</strong> Performance, compatibility, deadlines.</p>
      <h3>Acceptance criteria</h3>
      <ul>
        <li>✅ </li>
        <li>✅ </li>
        <li>✅ </li>
      </ul>
    `.trim()
  },
  {
    id: 'simplify-description',
    title: 'Simplify description',
    description: 'Rewrite into a short checklist format',
    icon: Shrink,
    draftHtml: `
      <h3>TL;DR</h3>
      <ul>
        <li><strong>What:</strong> </li>
        <li><strong>Why:</strong> </li>
        <li><strong>Done when:</strong> </li>
      </ul>
    `.trim()
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

// Expose for parent component
defineExpose({ onKeyDown })
</script>

<template>
  <div class="slash-command-dropdown bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 w-64 max-h-64 overflow-y-auto">
    <div class="px-2.5 py-1">
      <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        Recommendations
      </span>
    </div>
    
    <div v-if="filteredCommands.length === 0" class="px-3 py-2 text-sm text-gray-500">No results</div>
    
    <button
      v-for="(cmd, index) in filteredCommands"
      :key="cmd.id"
      @click="selectItem(index)"
      class="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left transition-colors"
      :class="selectedIndex === index ? 'bg-primary-50' : 'hover:bg-gray-50'"
    >
      <div 
        class="flex items-center justify-center shrink-0"
        :class="selectedIndex === index ? 'bg-primary-50' : 'bg-white'"
      >
        <component
          :is="cmd.icon || Sparkles"
          class="w-4 h-4"
          :class="selectedIndex === index ? 'text-primary-600' : 'text-gray-500'"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p 
          class="text-[13px] leading-4 font-medium truncate"
          :class="selectedIndex === index ? 'text-primary-700' : 'text-gray-700'"
        >
          {{ cmd.title }}
        </p>
        <p class="text-[11px] leading-4 text-gray-400 truncate">{{ cmd.description }}</p>
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
