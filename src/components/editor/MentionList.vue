<script setup>
/**
 * MentionList - Dropdown component for @ mentions
 * 
 * Shows Skills and Tasks when user types @
 * Used by NotionEditor and TipTapChatEditor
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

// Separate skills and tasks from items
const skills = computed(() => props.items.filter(item => item.type === 'skill'))
const tasks = computed(() => props.items.filter(item => item.type === 'task'))
const allItems = computed(() => [...skills.value, ...tasks.value])

// Reset selection when items change
watch(() => props.items, () => {
  selectedIndex.value = 0
})

function selectItem(index) {
  const item = allItems.value[index]
  if (item) {
    props.command({ 
      id: item.id, 
      label: item.name || item.title,
      type: item.type,
      ...item
    })
  }
}

function onKeyDown(event) {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + allItems.value.length - 1) % allItems.value.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % allItems.value.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

function getStatusIcon(status) {
  switch (status) {
    case 'done':
    case 'completed':
      return '✓'
    case 'in-progress':
    case 'in_progress':
      return '◐'
    default:
      return '○'
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'done':
    case 'completed':
      return 'text-green-500'
    case 'in-progress':
    case 'in_progress':
      return 'text-blue-500'
    default:
      return 'text-gray-400'
  }
}

// Expose methods for parent component
defineExpose({ onKeyDown })
</script>

<template>
  <div class="mention-dropdown bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-72 max-h-80 overflow-hidden">
    <!-- No Results -->
    <div v-if="allItems.length === 0" class="px-3 py-4 text-center">
      <p class="text-sm text-gray-500">{{ t('editor.mentions.noResults') }}</p>
    </div>

    <template v-else>
      <!-- Skills Section -->
      <template v-if="skills.length > 0">
        <div class="px-3 py-1.5">
          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {{ t('editor.mentions.skills') }}
          </span>
        </div>
        
        <div class="max-h-36 overflow-y-auto">
          <button
            v-for="(skill, index) in skills"
            :key="skill.id"
            @click="selectItem(index)"
            class="flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors text-left"
            :class="selectedIndex === index ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'"
          >
            <span class="text-lg flex-shrink-0">{{ skill.icon || '⚡' }}</span>
            <div class="flex-1 min-w-0">
              <p class="truncate font-medium">{{ skill.name }}</p>
              <p v-if="skill.description" class="text-xs text-gray-400 truncate">{{ skill.description }}</p>
            </div>
          </button>
        </div>
      </template>

      <!-- Divider -->
      <div v-if="skills.length > 0 && tasks.length > 0" class="border-t border-gray-100 my-2"></div>
      
      <!-- Tasks Section -->
      <template v-if="tasks.length > 0">
        <div class="px-3 py-1.5">
          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {{ t('editor.mentions.tasks') }}
          </span>
        </div>
        
        <div class="max-h-36 overflow-y-auto">
          <button
            v-for="(task, taskIndex) in tasks"
            :key="task.id"
            @click="selectItem(skills.length + taskIndex)"
            class="flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors text-left"
            :class="selectedIndex === skills.length + taskIndex ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'"
          >
            <span :class="['text-sm flex-shrink-0', getStatusColor(task.status)]">
              {{ getStatusIcon(task.status) }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="truncate font-medium">{{ task.title }}</p>
              <p v-if="task.projectName" class="text-xs text-gray-400 truncate">{{ task.projectName }}</p>
            </div>
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.mention-dropdown {
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
.max-h-36::-webkit-scrollbar {
  width: 4px;
}

.max-h-36::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-36::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
</style>

