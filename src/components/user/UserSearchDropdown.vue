<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, User as UserIcon } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'
import * as projectApi from '@/api/project.api'
import { useProjectStore, useUIStore, useUserStore } from '@/stores'

const props = defineProps({
  projectId: {
    type: String,
    required: false
  },
  modelValue: {
    type: Object,
    default: null
  },
  showUnassigned: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select', 'update:modelValue'])

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const userStore = useUserStore()

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const activeProjectId = computed(() => props.projectId || projectStore.currentProjectId)

// Local list of users to show when not searching
const initialUsers = computed(() => {
    return userStore.users.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name,
        email: user.email || '',
        avatar: (user.firstName || user.name || '?').charAt(0)
    }))
})

async function fetchResults(query) {
  if (!activeProjectId.value) return
  
  const keywords = resolveSearchKeywords(query)
  if (keywords === null) {
      searchResults.value = []
      return
  }
  
  isSearching.value = true
  try {
    const response = await projectApi.searchProjectAccesses(activeProjectId.value, {
      keywords
    })
    
    const users = Array.isArray(response?.users) ? response.users : []
    searchResults.value = users.map(user => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email || '',
      avatar: (user.firstName || '?').charAt(0)
    }))
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const debouncedSearch = debounce((query) => {
  fetchResults(query)
}, 300)

watch(searchQuery, (val) => {
  if (!val) {
      searchResults.value = []
      return
  }
  debouncedSearch(val)
})

function handleSelect(user) {
  emit('select', user)
  emit('update:modelValue', user)
  searchQuery.value = ''
  searchResults.value = []
}

function handleUnassign() {
    emit('select', null)
    emit('update:modelValue', null)
    searchQuery.value = ''
    searchResults.value = []
}

onMounted(() => {
    if (userStore.users.length === 0) {
        userStore.fetchUsers({ limit: 20 })
    }
})
</script>

<template>
  <DropdownMenu position="right" width="18rem">
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    
    <template #content>
      <!-- Search Input -->
      <div class="p-2 border-b border-gray-100 dark-edit:border-gray-700">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            class="w-full bg-gray-50 dark-edit:bg-gray-800 border-none rounded-md py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-primary-500 outline-none transition-all"
            :placeholder="t('common.search') + '...'"
            @click.stop
          />
        </div>
      </div>
      
      <!-- List Area -->
      <div class="max-h-[280px] overflow-y-auto py-1 custom-scrollbar">
        <!-- Unassigned option (only when not searching) -->
        <button
          v-if="showUnassigned && !searchQuery"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 text-gray-600 dark-edit:text-gray-400 transition-colors"
          :class="{ 'bg-primary-50 dark-edit:bg-primary-900/20 text-primary-600 dark-edit:text-primary-400': !modelValue }"
          @click="handleUnassign"
        >
          <div class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center" :class="{ 'border-primary-300': !modelValue }">
            <UserIcon class="w-3 h-3" />
          </div>
          <span class="font-medium flex-1 text-left">{{ t('taskDetail.unassigned') || 'Unassigned' }}</span>
          <i v-if="!modelValue" class="pi pi-check text-[10px] text-primary-500"></i>
        </button>

        <div v-if="isSearching" class="px-3 py-6 text-center">
             <div class="flex flex-col items-center gap-2">
                 <div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                 <div class="text-[10px] text-gray-400">{{ t('common.loading') }}...</div>
             </div>
        </div>
        
        <template v-else>
          <!-- Show search results if searching, otherwise show initial users -->
          <div v-if="searchQuery && searchResults.length > 0">
            <div class="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
               {{ t('common.results') || 'Results' }}
            </div>
            <button
              v-for="user in searchResults"
              :key="user.id"
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 text-gray-700 dark-edit:text-gray-300 transition-colors"
              :class="{ 'bg-primary-50 dark-edit:bg-primary-900/20 text-primary-600 dark-edit:text-primary-400': modelValue?.id === user.id }"
              @click="handleSelect(user)"
            >
              <Avatar
                :label="user.avatar"
                shape="circle"
                size="small"
                class="w-6 h-6 text-[10px] bg-primary-100 text-primary-700 font-semibold"
              />
              <div class="flex flex-col items-start overflow-hidden flex-1">
                <span class="font-medium truncate w-full text-left">{{ user.name }}</span>
                <span class="text-[9px] text-gray-400 truncate w-full text-left">{{ user.email }}</span>
              </div>
              <i v-if="modelValue?.id === user.id" class="pi pi-check text-[10px] text-primary-500"></i>
            </button>
          </div>
          
          <div v-else-if="!searchQuery && initialUsers.length > 0">
            <div class="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
               {{ t('settings.project.search.users') }}
            </div>
            <button
              v-for="user in initialUsers"
              :key="user.id"
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark-edit:hover:bg-gray-800 text-gray-700 dark-edit:text-gray-300 transition-colors"
              :class="{ 'bg-primary-50 dark-edit:bg-primary-900/20 text-primary-600 dark-edit:text-primary-400': modelValue?.id === user.id }"
              @click="handleSelect(user)"
            >
              <Avatar
                :label="user.avatar"
                shape="circle"
                size="small"
                class="w-6 h-6 text-[10px] bg-blue-100 text-blue-700 font-semibold"
              />
              <div class="flex flex-col items-start overflow-hidden flex-1">
                <span class="font-medium truncate w-full text-left">{{ user.name }}</span>
                <span class="text-[9px] text-gray-400 truncate w-full text-left">{{ user.email }}</span>
              </div>
              <i v-if="modelValue?.id === user.id" class="pi pi-check text-[10px] text-primary-500"></i>
            </button>
          </div>

          <!-- Empty states -->
          <div v-else-if="searchQuery && searchQuery.length >= 3" class="px-3 py-10 text-center">
            <UserIcon class="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <div class="text-[11px] text-gray-500 font-medium">{{ t('common.noResults') }}</div>
            <div class="text-[9px] text-gray-400 mt-1">Try a different search term</div>
          </div>
          
          <div v-else-if="searchQuery && searchQuery.length < 3" class="px-3 py-10 text-center">
             <div class="text-[10px] text-gray-400 italic">
                 {{ t('settings.project.search.minChars') }}
             </div>
          </div>
        </template>
      </div>
    </template>
  </DropdownMenu>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.dark-edit .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #374151;
}
</style>
