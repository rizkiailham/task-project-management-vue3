<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, Search, User as UserIcon } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'
import * as projectApi from '@/api/project.api'
import * as groupApi from '@/api/group.api'
import { useProjectStore, useUIStore, useUserStore } from '@/stores'
import { normalizeUserForDisplay } from '@/utils/user'
import { getAvatarColor } from '@/utils/avatarColor'

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
  },
  dark: {
    type: Boolean,
    default: false
  },
  openUp: {
    type: Boolean,
    default: false
  },
  showGroups: {
    type: Boolean,
    default: false
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
const dropdownRef = ref(null)
const visibleLimit = ref(5)
const STEP = 5
const activeProjectId = computed(() => props.projectId || projectStore.currentProjectId)

// Local list of users to show when not searching
const initialUsers = computed(() => {
    return userStore.users.map(user => {
        const normalized = normalizeUserForDisplay(user)
        return {
            id: normalized.id,
            name: normalized.name,
            email: normalized.email,
            initials: normalized.initials,
            avatarUrl: normalized.avatarUrl,
            color: normalized.color
        }
    })
})

const visibleUsers = computed(() => initialUsers.value.slice(0, visibleLimit.value))
const hasMoreUsers = computed(() => initialUsers.value.length > visibleLimit.value)

function showMore() {
  visibleLimit.value += STEP
}

// Groups
const allGroups = ref([])
const groupLimit = ref(5)
const isLoadingGroups = ref(false)

function normalizeGroup(g) {
  if (!g) return null
  return {
    id: g.id,
    name: g.name || g.label || '',
    description: g.description || '',
    memberCount: g.totalMembers ?? g.userCount ?? g.membersCount ?? g.count ?? (g.users || g.members || []).length ?? 0,
    _isGroup: true
  }
}

const visibleGroups = computed(() => allGroups.value.slice(0, groupLimit.value))
const hasMoreGroups = computed(() => allGroups.value.length > groupLimit.value)

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allGroups.value
  return allGroups.value.filter((g) => g.name.toLowerCase().includes(q))
})

const visibleFilteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (q) return filteredGroups.value
  return visibleGroups.value
})

const hasMoreFilteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (q) return false
  return hasMoreGroups.value
})

function showMoreGroups() {
  groupLimit.value += STEP
}

async function fetchGroups() {
  if (!props.showGroups || isLoadingGroups.value) return
  isLoadingGroups.value = true
  try {
    const response = await groupApi.getGroups({ limit: 100 })
    const raw = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
    allGroups.value = raw.map(normalizeGroup).filter(Boolean)
  } catch {
    allGroups.value = []
  } finally {
    isLoadingGroups.value = false
  }
}

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
    searchResults.value = users.map(user => {
      const normalized = normalizeUserForDisplay(user)
      return {
        id: normalized.id,
        name: normalized.name,
        email: normalized.email,
        initials: normalized.initials,
        avatarUrl: normalized.avatarUrl,
        color: normalized.color
      }
    })
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
  visibleLimit.value = STEP
  dropdownRef.value?.close?.()
}

function handleUnassign() {
    emit('select', null)
    emit('update:modelValue', null)
    searchQuery.value = ''
    searchResults.value = []
    // Close the dropdown after unassign
    dropdownRef.value?.close?.()
}

onMounted(() => {
    if (userStore.users.length === 0) {
        userStore.fetchUsers({ limit: 20 })
    }
    if (props.showGroups) {
        fetchGroups()
    }
})
</script>

<template>
  <DropdownMenu ref="dropdownRef" position="right" width="18rem" :variant="dark ? 'dark' : 'default'" :openUp="openUp">
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    
    <template #content>
      <!-- Search Input -->
      <div class="usd-search-wrapper">
        <div class="usd-search-container">
          <Search class="usd-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="usd-search-input"
            :placeholder="showGroups ? t('common.assignUserOrGroup', 'Assign a user or group') : t('common.search') + '...'"
            @click.stop
          />
        </div>
      </div>
      
      <!-- List Area -->
      <div class="usd-list custom-scrollbar">
        <!-- Unassigned option (only when not searching) -->
        <button
          v-if="showUnassigned && !searchQuery"
          type="button"
          class="usd-list-item"
          :class="{ 'is-selected': !modelValue }"
          @click="handleUnassign"
        >
          <div class="usd-unassigned-avatar" :class="{ 'is-selected': !modelValue }">
            <UserIcon class="usd-unassigned-icon" />
          </div>
          <div class="usd-list-info">
            <span class="usd-list-name">{{ t('taskDetail.unassigned') || 'Unassigned' }}</span>
          </div>
          <Check v-if="!modelValue" class="usd-list-check" />
        </button>

        <div v-if="isSearching" class="usd-list-loading">
          <div class="usd-list-spinner"></div>
          <div class="usd-list-loading-text">{{ t('common.loading') }}...</div>
        </div>
        
        <template v-else>
          <!-- Show search results if searching, otherwise show initial users -->
          <div v-if="searchQuery && searchResults.length > 0">
            <div class="usd-list-section-title">
               {{ t('common.results') || 'Results' }}
            </div>
            <button
              v-for="user in searchResults"
              :key="user.id"
              type="button"
              class="usd-list-item"
              :class="{ 'is-selected': modelValue?.id === user.id }"
              @click="handleSelect(user)"
            >
              <Avatar
                :image="user.avatarUrl"
                :label="!user.avatarUrl ? user.initials : undefined"
                shape="circle"
                class="usd-list-avatar"
                :style="{ backgroundColor: user.color }"
              />
              <div class="usd-list-info">
                <span class="usd-list-name">{{ user.name }}</span>
                <span class="usd-list-email">{{ user.email }}</span>
              </div>
              <Check v-if="modelValue?.id === user.id" class="usd-list-check" />
            </button>
          </div>
          
          <div v-else-if="!searchQuery && initialUsers.length > 0">
            <div class="usd-list-section-title">
               {{ t('settings.project.search.users') }}
            </div>
            <button
              v-for="user in visibleUsers"
              :key="user.id"
              type="button"
              class="usd-list-item"
              :class="{ 'is-selected': modelValue?.id === user.id }"
              @click="handleSelect(user)"
            >
              <Avatar
                :image="user.avatarUrl"
                :label="!user.avatarUrl ? user.initials : undefined"
                shape="circle"
                class="usd-list-avatar"
                :style="{ backgroundColor: user.color }"
              />
              <div class="usd-list-info">
                <span class="usd-list-name">{{ user.name }}</span>
                <span class="usd-list-email">{{ user.email }}</span>
              </div>
              <Check v-if="modelValue?.id === user.id" class="usd-list-check" />
            </button>
            <button
              v-if="hasMoreUsers"
              type="button"
              class="usd-show-more"
              @click.stop="showMore"
            >
              {{ t('common.showMore', 'Show more') }}
            </button>
          </div>

          <!-- Empty states -->
          <div v-else-if="searchQuery && searchQuery.length >= 3" class="usd-list-empty">
            <UserIcon class="usd-list-empty-icon" />
            <div class="usd-list-empty-text">{{ t('common.noResults') }}</div>
            <div class="usd-list-empty-hint">Try a different search term</div>
          </div>
          
          <div v-else-if="searchQuery && searchQuery.length < 3" class="usd-list-empty">
             <div class="usd-list-empty-hint">
                 {{ t('settings.project.search.minChars') }}
             </div>
          </div>

          <!-- Group section -->
          <template v-if="showGroups && visibleFilteredGroups.length">
            <div class="usd-list-divider"></div>
            <div class="usd-list-section-title">
              {{ t('common.group', 'Group') }}
            </div>
            <button
              v-for="group in visibleFilteredGroups"
              :key="'g-' + group.id"
              type="button"
              class="usd-list-item"
              :class="{ 'is-selected': modelValue?.id === group.id && modelValue?._isGroup }"
              @click="handleSelect(group)"
            >
              <Avatar
                :label="(group.name || '?').charAt(0)"
                shape="circle"
                class="usd-list-avatar"
                :style="{ backgroundColor: getAvatarColor(group.name || '') }"
              />
              <div class="usd-list-info">
                <span class="usd-list-name">{{ group.name }}</span>
              </div>
              <Check v-if="modelValue?.id === group.id && modelValue?._isGroup" class="usd-list-check" />
            </button>
            <button
              v-if="hasMoreFilteredGroups"
              type="button"
              class="usd-show-more"
              @click.stop="showMoreGroups"
            >
              {{ t('common.showMore', 'Show more') }}
            </button>
          </template>
        </template>
      </div>
    </template>
  </DropdownMenu>
</template>

<style scoped>
/* ─── Search ──────────────────────────────────────────── */
.usd-search-wrapper {
  padding: 0px 8px;
  border-bottom: 1px solid #f3f4f6;
}

.usd-search-container {
  position: relative;
}

.usd-search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #9ca3af;
  pointer-events: none;
}

.usd-search-input {
  width: 100%;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px 6px 28px;
  font-size: 12px;
  color: var(--color-gray-700, #374151);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.usd-search-input::placeholder {
  color: #9ca3af;
}

.usd-search-input:focus {
  border-color: var(--p-primary-500, #3b82f6);
  box-shadow: 0 0 0 1px var(--p-primary-500, #3b82f6);
  background: #ffffff;
}

/* ─── User List ───────────────────────────────────────── */
.usd-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.usd-list-section-title {
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.usd-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-gray-700, #374151);
  cursor: pointer;
  transition: background-color 0.12s ease;
  border: none;
  background: transparent;
  text-align: left;
}

.usd-list-item:hover {
  background: #f3f4f6;
}

.usd-list-item.is-selected {
  background: var(--p-primary-50, #eff6ff);
  color: var(--p-primary-700, #1d4ed8);
}

.usd-list-avatar {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px;
  font-size: 10px !important;
  color: #ffffff !important;
  font-weight: 600;
  flex-shrink: 0;
}

.usd-unassigned-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.12s ease;
}

.usd-unassigned-avatar.is-selected {
  border-color: var(--p-primary-300, #93c5fd);
}

.usd-unassigned-icon {
  width: 12px;
  height: 12px;
}

.usd-list-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  flex: 1;
  gap: 1px;
}

.usd-list-name {
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  line-height: 1.3;
}

.usd-list-email {
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  line-height: 1.3;
}

.usd-list-check {
  width: 14px;
  height: 14px;
  color: var(--p-primary-500, #3b82f6);
  flex-shrink: 0;
}

.usd-list-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 0;
}

.usd-show-more {
  width: 100%;
  padding: 6px 12px;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  cursor: pointer;
  border: none;
  background: transparent;
  transition: color 0.15s ease;
}

.usd-show-more:hover {
  color: #6b7280;
}

/* ─── Loading ─────────────────────────────────────────── */
.usd-list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px;
}

.usd-list-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--p-primary-500, #3b82f6);
  border-top-color: transparent;
  border-radius: 50%;
  animation: usd-spin 0.6s linear infinite;
}

@keyframes usd-spin {
  to { transform: rotate(360deg); }
}

.usd-list-loading-text {
  font-size: 10px;
  color: #9ca3af;
}

/* ─── Empty State ─────────────────────────────────────── */
.usd-list-empty {
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.usd-list-empty-icon {
  width: 28px;
  height: 28px;
  color: #d1d5db;
}

.usd-list-empty-text {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
}

.usd-list-empty-hint {
  font-size: 10px;
  color: #9ca3af;
  font-style: italic;
}

/* ─── Scrollbar ───────────────────────────────────────── */
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

.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #d1d5db;
}

</style>

<!-- Unscoped: teleported dropdown dark mode overrides -->
<style>
.dropdown-menu--dark .usd-search-wrapper {
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
}

.dropdown-menu--dark .usd-search-input {
  background: #3a3a3f !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: #e2e8f0 !important;
}

.dropdown-menu--dark .usd-search-input::placeholder {
  color: rgba(255, 255, 255, 0.3) !important;
}

.dropdown-menu--dark .usd-search-input:focus {
  background: #3a3a3f !important;
  border-color: var(--p-primary-500, #3b82f6) !important;
}

.dropdown-menu--dark .usd-list-section-title {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .usd-list-item {
  color: #d1d5db !important;
}

.dropdown-menu--dark .usd-list-item:hover {
  background: #3a3a3f !important;
}

.dropdown-menu--dark .usd-list-item.is-selected {
  background: rgba(37, 99, 235, 0.15) !important;
  color: #93c5fd !important;
}

.dropdown-menu--dark .usd-list-name {
  color: #e2e8f0 !important;
}

.dropdown-menu--dark .usd-list-email {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .usd-list-check {
  color: #60a5fa !important;
}

.dropdown-menu--dark .usd-unassigned-avatar {
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.dropdown-menu--dark .usd-unassigned-icon {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .usd-list-empty-icon {
  color: rgba(255, 255, 255, 0.2) !important;
}

.dropdown-menu--dark .usd-list-empty-text {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .usd-list-empty-hint {
  color: rgba(255, 255, 255, 0.3) !important;
}
</style>

