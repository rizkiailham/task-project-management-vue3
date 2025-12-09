<script setup>
/**
 * CommandPalette - Global search and command palette (⌘K)
 * 
 * Features:
 * - Quick search across tasks, projects, and workspaces
 * - Command shortcuts
 * - Recent items
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore, useProjectStore, useTaskStore, useWorkspaceStore } from '@/stores'

import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

const router = useRouter()
const uiStore = useUIStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const workspaceStore = useWorkspaceStore()

// Refs
const searchInput = ref(null)
const selectedIndex = ref(0)

// Local state
const query = ref('')

// Commands
const commands = [
  {
    id: 'new-task',
    label: 'Create new task',
    icon: 'pi pi-plus',
    shortcut: 'N',
    action: () => {
      uiStore.closeSearch()
      uiStore.openModal('createTask')
    }
  },
  {
    id: 'new-project',
    label: 'Create new project',
    icon: 'pi pi-folder-plus',
    shortcut: 'P',
    action: () => {
      uiStore.closeSearch()
      uiStore.openModal('createProject')
    }
  },
  {
    id: 'my-tasks',
    label: 'Go to My Tasks',
    icon: 'pi pi-check-square',
    action: () => {
      uiStore.closeSearch()
      router.push({ name: 'MyTasks' })
    }
  },
  {
    id: 'inbox',
    label: 'Go to Inbox',
    icon: 'pi pi-inbox',
    action: () => {
      uiStore.closeSearch()
      router.push({ name: 'Inbox' })
    }
  },
  {
    id: 'settings',
    label: 'Open Settings',
    icon: 'pi pi-cog',
    action: () => {
      uiStore.closeSearch()
      router.push({ name: 'Settings' })
    }
  },
  {
    id: 'toggle-dark',
    label: 'Toggle dark mode',
    icon: 'pi pi-moon',
    action: () => {
      uiStore.toggleDarkMode()
    }
  }
]

// Computed
const filteredCommands = computed(() => {
  if (!query.value) return commands
  const q = query.value.toLowerCase()
  return commands.filter(cmd => 
    cmd.label.toLowerCase().includes(q)
  )
})

const filteredProjects = computed(() => {
  if (!query.value) return projectStore.projects.slice(0, 3)
  const q = query.value.toLowerCase()
  return projectStore.projects.filter(p => 
    p.name.toLowerCase().includes(q)
  ).slice(0, 5)
})

const filteredTasks = computed(() => {
  if (!query.value || query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return taskStore.tasks.filter(t => 
    t.title.toLowerCase().includes(q)
  ).slice(0, 5)
})

const allResults = computed(() => {
  const results = []
  
  if (filteredCommands.value.length > 0) {
    results.push({ type: 'header', label: 'Commands' })
    results.push(...filteredCommands.value.map(c => ({ ...c, type: 'command' })))
  }
  
  if (filteredProjects.value.length > 0) {
    results.push({ type: 'header', label: 'Projects' })
    results.push(...filteredProjects.value.map(p => ({ ...p, type: 'project' })))
  }
  
  if (filteredTasks.value.length > 0) {
    results.push({ type: 'header', label: 'Tasks' })
    results.push(...filteredTasks.value.map(t => ({ ...t, type: 'task' })))
  }
  
  return results
})

const selectableResults = computed(() => 
  allResults.value.filter(r => r.type !== 'header')
)

// Watch for dialog open
watch(() => uiStore.isSearchOpen, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    searchInput.value?.$el?.focus()
  }
})

// Methods
function handleKeydown(event) {
  const selectableCount = selectableResults.value.length
  
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % selectableCount
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + selectableCount) % selectableCount
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = selectableResults.value[selectedIndex.value]
    if (selected) {
      selectItem(selected)
    }
  }
}

function selectItem(item) {
  if (item.type === 'command') {
    item.action()
  } else if (item.type === 'project') {
    uiStore.closeSearch()
    router.push({
      name: 'Project',
      params: {
        workspaceId: workspaceStore.currentWorkspaceId,
        projectId: item.id
      }
    })
  } else if (item.type === 'task') {
    uiStore.closeSearch()
    router.push({
      name: 'TaskDetail',
      params: { taskId: item.id }
    })
  }
}

function getItemIndex(item) {
  return selectableResults.value.findIndex(r => r.id === item.id)
}
</script>

<template>
  <Dialog
    v-model:visible="uiStore.isSearchOpen"
    modal
    :closable="false"
    :showHeader="false"
    :style="{ width: '600px', maxWidth: '90vw' }"
    :pt="{
      root: { class: 'border-0 shadow-2xl' },
      content: { class: 'p-0' }
    }"
    @keydown="handleKeydown"
  >
    <div class="command-palette">
      <!-- Search Input -->
      <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark-edit:border-gray-700">
        <i class="pi pi-search text-gray-400"></i>
        <InputText
          ref="searchInput"
          v-model="query"
          placeholder="Search or type a command..."
          class="flex-1 border-0 bg-transparent p-0 text-base focus:ring-0"
          :pt="{ root: { class: 'shadow-none' } }"
        />
        <kbd class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 dark-edit:bg-gray-700 dark-edit:text-gray-400">
          ESC
        </kbd>
      </div>
      
      <!-- Results -->
      <div class="max-h-[400px] overflow-y-auto p-2">
        <template v-if="allResults.length > 0">
          <template v-for="(item, index) in allResults" :key="item.id || item.label">
            <!-- Section Header -->
            <div 
              v-if="item.type === 'header'"
              class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark-edit:text-gray-400"
            >
              {{ item.label }}
            </div>
            
            <!-- Command Item -->
            <button
              v-else-if="item.type === 'command'"
              @click="selectItem(item)"
              :class="[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                getItemIndex(item) === selectedIndex
                  ? 'bg-primary-50 text-primary-700 dark-edit:bg-primary-900/20 dark-edit:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-50 dark-edit:text-gray-300 dark-edit:hover:bg-gray-700/50'
              ]"
            >
              <i :class="[item.icon, 'text-base']"></i>
              <span class="flex-1">{{ item.label }}</span>
              <kbd 
                v-if="item.shortcut"
                class="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark-edit:bg-gray-700"
              >
                {{ item.shortcut }}
              </kbd>
            </button>
            
            <!-- Project Item -->
            <button
              v-else-if="item.type === 'project'"
              @click="selectItem(item)"
              :class="[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                getItemIndex(item) === selectedIndex
                  ? 'bg-primary-50 text-primary-700 dark-edit:bg-primary-900/20 dark-edit:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-50 dark-edit:text-gray-300 dark-edit:hover:bg-gray-700/50'
              ]"
            >
              <span 
                class="flex h-6 w-6 items-center justify-center rounded text-xs font-medium text-white"
                :style="{ backgroundColor: item.color || '#6366f1' }"
              >
                {{ item.name.charAt(0).toUpperCase() }}
              </span>
              <span class="flex-1">{{ item.name }}</span>
              <i class="pi pi-arrow-right text-xs text-gray-400"></i>
            </button>
            
            <!-- Task Item -->
            <button
              v-else-if="item.type === 'task'"
              @click="selectItem(item)"
              :class="[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                getItemIndex(item) === selectedIndex
                  ? 'bg-primary-50 text-primary-700 dark-edit:bg-primary-900/20 dark-edit:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-50 dark-edit:text-gray-300 dark-edit:hover:bg-gray-700/50'
              ]"
            >
              <i class="pi pi-check-square text-gray-400"></i>
              <span class="flex-1 truncate">{{ item.title }}</span>
              <i class="pi pi-arrow-right text-xs text-gray-400"></i>
            </button>
          </template>
        </template>
        
        <!-- Empty State -->
        <div 
          v-else
          class="py-8 text-center text-sm text-gray-500 dark-edit:text-gray-400"
        >
          No results found for "{{ query }}"
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark-edit:border-gray-700 dark-edit:text-gray-400">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <kbd class="rounded bg-gray-100 px-1 dark-edit:bg-gray-700">↑</kbd>
            <kbd class="rounded bg-gray-100 px-1 dark-edit:bg-gray-700">↓</kbd>
            to navigate
          </span>
          <span class="flex items-center gap-1">
            <kbd class="rounded bg-gray-100 px-1 dark-edit:bg-gray-700">↵</kbd>
            to select
          </span>
        </div>
        <span>Powered by Desidia</span>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.command-palette {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.dark .command-palette {
  background: #1f2937;
}
</style>

