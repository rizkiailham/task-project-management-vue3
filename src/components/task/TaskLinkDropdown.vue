<script setup>
/**
 * TaskLinkDropdown - Search and select tasks to link as relationships.
 *
 * Shows two sections:
 *   - RECENT: first few tasks from the current project (including subtasks)
 *   - TASK: all tasks including subtasks, separate from recent
 *
 * Search filters both sections and also hits the API for matches.
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { useTaskStore, useProjectStore } from '@/stores'
import * as taskApi from '@/api/task.api'
import { debounce } from '@/utils/debounce'

const props = defineProps({
  modelValue: {
    type: [Object, Array],
    default: null
  },
  projectId: {
    type: String,
    default: ''
  },
  excludeIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select', 'update:modelValue'])

const { t } = useI18n()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const recentLimit = ref(5)
const taskLimit = ref(5)
const STEP = 5
const dropdownRef = ref(null)

const excludeSet = computed(() => new Set(props.excludeIds.map(String)))

/**
 * Flatten a task list: each task + its nested children recursively.
 */
function flattenTasks(list) {
  const result = []
  for (const task of list) {
    if (!task?.id) continue
    result.push(task)
    const children = task.children || task.subTasks || []
    if (children.length) {
      result.push(...flattenTasks(children))
    }
  }
  return result
}

/**
 * Deduplicate by id, preserving order.
 */
function dedup(list) {
  const seen = new Set()
  return list.filter((t) => {
    const id = String(t.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

// All flattened tasks from all store sources, deduplicated
const allFlattened = computed(() => {
  const sources = [
    flattenTasks(taskStore.tasks || []),
    flattenTasks(taskStore.myTasks || []),
    taskStore.subtasks || []
  ]
  const merged = sources.flat()
  return dedup(merged).filter((t) => !excludeSet.value.has(String(t.id)))
})

// RECENT: sorted by most recently updated/created
const recentAll = computed(() =>
  [...allFlattened.value].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return dateB - dateA
  })
)
const visibleRecent = computed(() => recentAll.value.slice(0, recentLimit.value))
const hasMoreRecent = computed(() => recentAll.value.length > recentLimit.value)

// TASK: sorted by createdAt (newest first)
const taskAll = computed(() =>
  [...allFlattened.value].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    return dateB - dateA
  })
)
const visibleTasks = computed(() => taskAll.value.slice(0, taskLimit.value))
const hasMoreTasks = computed(() => taskAll.value.length > taskLimit.value)

function showMoreRecent() {
  recentLimit.value += STEP
}

function showMoreTasks() {
  taskLimit.value += STEP
}

// Search: filter locally + fetch from API
const filteredRecent = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return recentAll.value.filter((t) => (t.title || '').toLowerCase().includes(q))
})

const filteredTasks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const recentIds = new Set(filteredRecent.value.map((t) => String(t.id)))
  const seen = new Set()
  const result = []

  // Tasks from taskAll
  for (const task of taskAll.value) {
    const id = String(task.id)
    if (seen.has(id) || recentIds.has(id)) continue
    if (!(task.title || '').toLowerCase().includes(q)) continue
    seen.add(id)
    result.push(task)
  }

  // API search results (may include tasks not in store)
  for (const task of flattenTasks(searchResults.value)) {
    const id = String(task.id)
    if (seen.has(id) || recentIds.has(id) || excludeSet.value.has(id)) continue
    if (!(task.title || '').toLowerCase().includes(q)) continue
    seen.add(id)
    result.push(task)
  }
  return result
})

const debouncedSearch = debounce(async (query) => {
  if (!query.trim()) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  try {
    const response = await taskApi.getTasks({
      projectItemId: projectStore.activeProjectItemId || undefined,
      keywords: query.trim()
    }, { silent: true })
    const payload = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response) ? response : []
    searchResults.value = payload
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

watch(searchQuery, (q) => {
  if (q.trim()) {
    debouncedSearch(q)
  } else {
    searchResults.value = []
    isSearching.value = false
  }
})

function handleSelect(task) {
  emit('select', task)
  emit('update:modelValue', task)
  searchQuery.value = ''
  searchResults.value = []
  recentLimit.value = STEP
  taskLimit.value = STEP
  dropdownRef.value?.close?.()
}

function handleOpen() {
  searchQuery.value = ''
  searchResults.value = []
  recentLimit.value = STEP
  taskLimit.value = STEP
}
</script>

<template>
  <DropdownMenu
    ref="dropdownRef"
    width="20rem"
    :close-on-select="false"
    @open="handleOpen"
  >
    <template #trigger>
      <slot name="trigger" />
    </template>

    <template #content>
      <div class="px-2 task-link-panel" @click.stop>
        <!-- Search input -->
        <div class="pt-1">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white placeholder-gray-400 outline-none focus:border-gray-300 transition-colors"
              :placeholder="t('tasks.createModal.linkTask', 'Link a task')"
              autofocus
            />
          </div>
        </div>

        <div class="pl-2">
          <!-- Searching -->
          <template v-if="searchQuery.trim()">
            <!-- RECENT filtered -->
            <template v-if="filteredRecent.length">
              <div class="pb-1">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('tasks.createModal.recent', 'Recent') }}</span>
              </div>
              <button
                v-for="task in filteredRecent"
                :key="`r-${task.id}`"
                type="button"
                class="w-full text-left py-2 text-xs text-gray-700 font-medium px-1 hover:bg-gray-50 transition-colors truncate"
                @click.stop="handleSelect(task)"
              >
                {{ task.title }}
              </button>
            </template>

            <!-- TASK filtered -->
            <template v-if="filteredTasks.length">
              <div class="pb-1">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('tasks.createModal.taskSection', 'Task') }}</span>
              </div>
              <button
                v-for="task in filteredTasks"
                :key="`t-${task.id}`"
                type="button"
                class="w-full text-left py-2 text-xs text-gray-700 px-1 hover:bg-gray-50 transition-colors truncate"
                @click.stop="handleSelect(task)"
              >
                {{ task.title }}
              </button>
            </template>

            <!-- No results -->
            <div v-if="!filteredRecent.length && !filteredTasks.length && !isSearching" class="py-4 text-center">
              <span class="text-xs text-gray-400">{{ t('common.noResults', 'No tasks found') }}</span>
            </div>
            <div v-if="isSearching && !filteredRecent.length && !filteredTasks.length" class="py-4 text-center">
              <span class="text-xs text-gray-400">{{ t('common.searching', 'Searching...') }}</span>
            </div>
          </template>

          <!-- Default: both sections always shown -->
          <template v-else>
            <!-- RECENT -->
            <template v-if="recentAll.length">
              <div class="pb-1">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('tasks.createModal.recent', 'Recent') }}</span>
              </div>
              <button
                v-for="task in visibleRecent"
                :key="`r-${task.id}`"
                type="button"
                class="w-full text-left py-2 text-xs text-gray-700 font-medium px-1 hover:bg-gray-50 transition-colors truncate"
                @click.stop="handleSelect(task)"
              >
                {{ task.title }}
              </button>
              <button
                v-if="hasMoreRecent"
                type="button"
                class="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                @click.stop="showMoreRecent"
              >
                {{ t('common.showMore', 'Show more') }}
              </button>
            </template>

            <!-- TASK -->
            <template v-if="taskAll.length">
              <div class="pb-1">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('tasks.createModal.taskSection', 'Task') }}</span>
              </div>
              <button
                v-for="task in visibleTasks"
                :key="`t-${task.id}`"
                type="button"
                class="w-full text-left py-2 text-xs text-gray-700 px-1 hover:bg-gray-50 transition-colors truncate"
                @click.stop="handleSelect(task)"
              >
                {{ task.title }}
              </button>
              <button
                v-if="hasMoreTasks"
                type="button"
                class="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                @click.stop="showMoreTasks"
              >
                {{ t('common.showMore', 'Show more') }}
              </button>
            </template>

            <!-- Empty -->
            <div v-if="!recentAll.length && !taskAll.length" class="py-4 text-center">
              <span class="text-xs text-gray-400">{{ t('tasks.createModal.noTasks', 'No tasks yet') }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </DropdownMenu>
</template>

<style scoped>
.task-link-panel {
  min-width: 280px;
}
</style>
