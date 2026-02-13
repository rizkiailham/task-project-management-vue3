<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, Search, X, User as UserIcon } from 'lucide-vue-next'
import { getAvatarColor } from '@/utils/avatarColor'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Avatar from 'primevue/avatar'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'
import * as projectApi from '@/api/project.api'
import { useProjectStore, useUserStore } from '@/stores'

const props = defineProps({
  projectId: {
    type: String,
    required: false
  },
  modelValue: {
    type: [Array, String, Number, Object, null],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  multiple: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  dark: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const projectStore = useProjectStore()
const userStore = useUserStore()

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

const activeProjectId = computed(() => props.projectId || projectStore.currentProjectId)

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeUserOption(input) {
  if (!input) return null

  const source = typeof input === 'object' ? input : { value: input }
  const value = source.value ?? source.id ?? source.userId ?? source.email ?? source.name
  if (value === undefined || value === null || value === '') return null

  const name = source.name || source.label || source.fullName || source.email || String(value)
  const firstName = source.firstName || source.first_name || ''
  const lastName = source.lastName || source.last_name || ''
  const initialsFromName = `${firstName} ${lastName}`.trim()
  const initials = source.initials || (initialsFromName || name || '?').charAt(0)

  return {
    id: value,
    value,
    label: source.label || name,
    name,
    email: source.email || '',
    initials,
    avatarUrl: source.avatarUrl || source.avatar || source.image || ''
  }
}

function mergeUsers(...groups) {
  const merged = new Map()
  groups
    .flatMap((group) => toArray(group))
    .forEach((entry) => {
      const option = normalizeUserOption(entry)
      if (!option) return
      const key = String(option.value)
      if (!merged.has(key)) {
        merged.set(key, option)
        return
      }
      merged.set(key, {
        ...merged.get(key),
        ...option,
        value: merged.get(key).value
      })
    })
  return Array.from(merged.values())
}

const storeUsers = computed(() =>
  userStore.users.map((user) => normalizeUserOption({
    id: user.id,
    value: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name,
    email: user.email || '',
    initials: (user.firstName || user.name || '?').charAt(0),
    avatarUrl: user.avatar
  })).filter(Boolean)
)

const normalizedSelectedValues = computed(() => {
  const singleValue = Array.isArray(props.modelValue) ? props.modelValue[0] : props.modelValue
  const rawValues = props.multiple
    ? toArray(props.modelValue)
    : (singleValue === undefined || singleValue === null || singleValue === '' ? [] : [singleValue])

  return rawValues
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        const normalized = normalizeUserOption(entry)
        return normalized?.value
      }
      return entry
    })
    .filter((entry) => entry !== undefined && entry !== null && entry !== '')
})

const selectedValueSet = computed(() => new Set(normalizedSelectedValues.value.map((value) => String(value))))

const selectedValueObjects = computed(() =>
  (props.multiple
    ? toArray(props.modelValue)
    : [Array.isArray(props.modelValue) ? props.modelValue[0] : props.modelValue]
  )
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => normalizeUserOption(entry))
    .filter(Boolean)
)

const mergedUsers = computed(() =>
  mergeUsers(
    props.options,
    storeUsers.value,
    searchResults.value,
    selectedValueObjects.value
  )
)

const userByValue = computed(() => {
  const map = new Map()
  mergedUsers.value.forEach((user) => {
    map.set(String(user.value), user)
  })
  return map
})

const selectedUsers = computed(() =>
  normalizedSelectedValues.value.map((value) => {
    const existing = userByValue.value.get(String(value))
    if (existing) return existing
    return {
      id: value,
      value,
      label: String(value),
      name: String(value),
      email: '',
      initials: String(value).charAt(0),
      avatarUrl: ''
    }
  })
)

const filteredLocalUsers = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return mergedUsers.value
  return mergedUsers.value.filter((user) => {
    return [user.name, user.label, user.email]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(keyword))
  })
})

const displayUsers = computed(() => {
  const hasSearchText = searchQuery.value.trim().length > 0
  if (!hasSearchText) return mergedUsers.value
  if (searchResults.value.length > 0) {
    return mergeUsers(searchResults.value, selectedUsers.value)
  }
  return filteredLocalUsers.value
})

const selectedSummary = computed(() => {
  if (selectedUsers.value.length === 0) return ''
  if (selectedUsers.value.length === 1) return selectedUsers.value[0].name
  return `${selectedUsers.value.length} ${t('taskDetail.subscribers', 'subscribers')}`
})

const triggerPlaceholder = computed(() => props.placeholder || t('common.selectUser', 'Select user'))

const hasSearchResults = computed(() => displayUsers.value.length > 0)

function isSelected(user) {
  return selectedValueSet.value.has(String(user.value))
}

function toggleUser(user) {
  const normalized = normalizeUserOption(user)
  if (!normalized) return

  if (!props.multiple) {
    const alreadySelected = selectedValueSet.value.has(String(normalized.value))
    emit('update:modelValue', alreadySelected ? null : normalized.value)
    return
  }

  const nextValues = [...normalizedSelectedValues.value]
  const index = nextValues.findIndex((entry) => String(entry) === String(normalized.value))
  if (index === -1) {
    nextValues.push(normalized.value)
  } else {
    nextValues.splice(index, 1)
  }
  emit('update:modelValue', nextValues)
}

function removeUser(user, event) {
  event?.stopPropagation()
  const normalized = normalizeUserOption(user)
  if (!normalized) return

  if (!props.multiple) {
    emit('update:modelValue', null)
    return
  }

  const nextValues = normalizedSelectedValues.value.filter(
    (entry) => String(entry) !== String(normalized.value)
  )
  emit('update:modelValue', nextValues)
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
    const response = await projectApi.searchProjectAccesses(activeProjectId.value, { keywords })
    const users = Array.isArray(response?.users) ? response.users : []
    searchResults.value = users
      .map((user) => normalizeUserOption({
        id: user.id,
        value: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name,
        email: user.email || '',
        initials: (user.firstName || user.name || '?').charAt(0),
        avatarUrl: user.avatar
      }))
      .filter(Boolean)
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const debouncedSearch = debounce((query) => {
  const text = query.trim()
  if (text.length < 3) {
    searchResults.value = []
    return
  }
  fetchResults(text)
}, 300)

watch(searchQuery, (nextValue) => {
  const text = nextValue.trim()
  if (!text) {
    searchResults.value = []
    return
  }
  debouncedSearch(text)
})

onMounted(() => {
  if (userStore.users.length === 0) {
    userStore.fetchUsers({ limit: 50 })
  }
})
</script>

<template>
  <DropdownMenu position="right" width="18rem" :closeOnSelect="!multiple" :variant="dark ? 'dark' : 'default'">
    <template #trigger>
      <button
        type="button"
        class="multi-trigger"
        :class="{ 'is-dark': dark }"
      >
        <!-- Selected users display -->
        <div v-if="selectedUsers.length > 0" class="multi-trigger-content">
          <!-- Stacked avatars -->
          <div class="multi-trigger-avatars">
            <Avatar
              v-for="user in selectedUsers.slice(0, 3)"
              :key="String(user.value)"
              :image="user.avatarUrl"
              :label="!user.avatarUrl ? user.initials : undefined"
              shape="circle"
              class="multi-trigger-avatar"
              :style="{ backgroundColor: user.avatarUrl ? 'transparent' : getAvatarColor(user.name) }"
            />
            <div
              v-if="selectedUsers.length > 3"
              class="multi-trigger-avatar-overflow"
            >
              +{{ selectedUsers.length - 3 }}
            </div>
          </div>
          <span class="multi-trigger-label">{{ selectedSummary }}</span>
        </div>
        <!-- Placeholder -->
        <span v-else class="multi-trigger-placeholder">{{ triggerPlaceholder }}</span>
        <ChevronDown class="multi-trigger-chevron" />
      </button>
    </template>

    <template #content>
      <!-- Search bar -->
      <div class="multi-search-wrapper">
        <div class="multi-search-container">
          <Search class="multi-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="multi-search-input"
            :placeholder="`${t('common.search', 'Search')}...`"
            @click.stop
          />
        </div>
      </div>

      <!-- Selected chips -->
      <div v-if="multiple && selectedUsers.length > 0" class="multi-chips-wrapper">
        <div class="multi-chips-row">
          <div
            v-for="user in selectedUsers"
            :key="'chip-' + String(user.value)"
            class="multi-chip"
          >
            <Avatar
              :image="user.avatarUrl"
              :label="!user.avatarUrl ? user.initials : undefined"
              shape="circle"
              class="multi-chip-avatar"
              :style="{ backgroundColor: user.avatarUrl ? 'transparent' : getAvatarColor(user.name) }"
            />
            <span class="multi-chip-name">{{ user.name }}</span>
            <button
              type="button"
              class="multi-chip-remove"
              @click.stop="removeUser(user, $event)"
            >
              <X class="multi-chip-remove-icon" />
            </button>
          </div>
        </div>
      </div>

      <!-- User list -->
      <div class="multi-list custom-scrollbar">
        <div v-if="isSearching" class="multi-list-loading">
          <div class="multi-list-spinner"></div>
          <div class="multi-list-loading-text">{{ t('common.loading', 'Loading') }}...</div>
        </div>

        <template v-else>
          <!-- Section header -->
          <div v-if="hasSearchResults && searchQuery.trim()" class="multi-list-section-title">
            {{ t('common.results', 'Results') }}
          </div>
          <div v-else-if="hasSearchResults && !searchQuery.trim()" class="multi-list-section-title">
            {{ t('settings.project.search.users', 'Users') }}
          </div>

          <button
            v-for="user in displayUsers"
            :key="String(user.value)"
            type="button"
            class="multi-list-item"
            :class="{ 'is-selected': isSelected(user) }"
            @click="toggleUser(user)"
          >
            <Avatar
              :image="user.avatarUrl"
              :label="!user.avatarUrl ? user.initials : undefined"
              shape="circle"
              class="multi-list-avatar"
              :style="{ backgroundColor: user.avatarUrl ? 'transparent' : getAvatarColor(user.name) }"
            />
            <div class="multi-list-info">
              <span class="multi-list-name">{{ user.name }}</span>
              <span v-if="user.email" class="multi-list-email">{{ user.email }}</span>
            </div>
            <Check v-if="isSelected(user)" class="multi-list-check" />
          </button>

          <!-- Empty state -->
          <div v-if="!hasSearchResults" class="multi-list-empty">
            <UserIcon class="multi-list-empty-icon" />
            <div class="multi-list-empty-text">{{ t('common.noResults', 'No results found') }}</div>
          </div>
        </template>
      </div>
    </template>
  </DropdownMenu>
</template>

<style scoped>
/* ─── Trigger ──────────────────────────────────────────── */
.multi-trigger {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 8px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.multi-trigger:hover {
  border-color: #9ca3af;
}

.multi-trigger:focus {
  outline: none;
  border-color: var(--p-primary-500, #3b82f6);
  box-shadow: 0 0 0 1px var(--p-primary-500, #3b82f6);
}

.multi-trigger-content {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.multi-trigger-avatars {
  display: flex;
  flex-shrink: 0;
}

.multi-trigger-avatars > * + * {
  margin-left: -4px;
}

.multi-trigger-avatar {
  width: 18px !important;
  height: 18px !important;
  min-width: 18px;
  font-size: 8px !important;
  color: #ffffff !important;
  font-weight: 600;
  box-shadow: 0 0 0 1.5px #ffffff;
}

.multi-trigger-avatar-overflow {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #374151;
  font-size: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1.5px #ffffff;
}

.multi-trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-gray-700, #374151);
  font-size: 12px;
  line-height: 1;
}

.multi-trigger-placeholder {
  color: #9ca3af;
  font-size: 12px;
  flex: 1;
}

.multi-trigger-chevron {
  width: 14px;
  height: 14px;
  color: #9ca3af;
  flex-shrink: 0;
}

/* ─── Search ──────────────────────────────────────────── */
.multi-search-wrapper {
  padding: 0px 8px;
  border-bottom: 1px solid #f3f4f6;
}

.multi-search-container {
  position: relative;
}

.multi-search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #9ca3af;
  pointer-events: none;
}

.multi-search-input {
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

.multi-search-input::placeholder {
  color: #9ca3af;
}

.multi-search-input:focus {
  border-color: var(--p-primary-500, #3b82f6);
  box-shadow: 0 0 0 1px var(--p-primary-500, #3b82f6);
  background: #ffffff;
}

/* ─── Selected Chips ──────────────────────────────────── */
.multi-chips-wrapper {
  padding: 6px 0px 6px 8px;
  border-bottom: 1px solid #f3f4f6;
}

.multi-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 60px;
  overflow-y: auto;
}

.multi-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 4px 0 2px;
  background: var(--p-primary-50, #eff6ff);
  border: 1px solid var(--p-primary-200, #bfdbfe);
  border-radius: 4px;
  font-size: 11px;
  color: var(--p-primary-700, #1d4ed8);
  max-width: 130px;
}

.multi-chip-avatar {
  width: 16px !important;
  height: 16px !important;
  min-width: 16px;
  font-size: 8px !important;
  color: #ffffff !important;
  font-weight: 600;
}

.multi-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  line-height: 1;
}

.multi-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  color: var(--p-primary-400, #60a5fa);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.multi-chip-remove:hover {
  background: var(--p-primary-200, #bfdbfe);
  color: var(--p-primary-700, #1d4ed8);
}

.multi-chip-remove-icon {
  width: 10px;
  height: 10px;
}

/* ─── User List ───────────────────────────────────────── */
.multi-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.multi-list-section-title {
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.multi-list-item {
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

.multi-list-item:hover {
  background: #f3f4f6;
}

.multi-list-item.is-selected {
  background: var(--p-primary-50, #eff6ff);
  color: var(--p-primary-700, #1d4ed8);
}

.multi-list-avatar {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px;
  font-size: 11px !important;
  color: #ffffff !important;
  font-weight: 600;
  flex-shrink: 0;
}

.multi-list-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  flex: 1;
  gap: 1px;
}

.multi-list-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  line-height: 1.3;
}

.multi-list-email {
  font-size: 12px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  line-height: 1.3;
}

.multi-list-check {
  width: 14px;
  height: 14px;
  color: var(--p-primary-500, #3b82f6);
  flex-shrink: 0;
}

/* ─── Loading ─────────────────────────────────────────── */
.multi-list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px;
}

.multi-list-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--p-primary-500, #3b82f6);
  border-top-color: transparent;
  border-radius: 50%;
  animation: multi-spin 0.6s linear infinite;
}

@keyframes multi-spin {
  to { transform: rotate(360deg); }
}

.multi-list-loading-text {
  font-size: 10px;
  color: #9ca3af;
}

/* ─── Empty State ─────────────────────────────────────── */
.multi-list-empty {
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.multi-list-empty-icon {
  width: 28px;
  height: 28px;
  color: #d1d5db;
}

.multi-list-empty-text {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
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

/* ─── Dark Mode Overrides ─────────────────────────────── */
.multi-trigger.is-dark {
  background: #35353a;
  border-color: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.multi-trigger.is-dark:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.multi-trigger.is-dark .multi-trigger-label {
  color: #e2e8f0;
}

.multi-trigger.is-dark .multi-trigger-placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.multi-trigger.is-dark .multi-trigger-chevron {
  color: rgba(255, 255, 255, 0.3);
}

.multi-trigger.is-dark .multi-trigger-avatar {
  box-shadow: 0 0 0 1.5px #35353a;
}

.multi-trigger.is-dark .multi-trigger-avatar-overflow {
  background: #4a4a50;
  color: #d1d5db;
  box-shadow: 0 0 0 1.5px #35353a;
}

</style>

<!-- Unscoped: teleported dropdown dark mode overrides -->
<style>
.dropdown-menu--dark .multi-search-wrapper {
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
}

.dropdown-menu--dark .multi-search-input {
  background: #3a3a3f !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: #e2e8f0 !important;
}

.dropdown-menu--dark .multi-search-input::placeholder {
  color: rgba(255, 255, 255, 0.3) !important;
}

.dropdown-menu--dark .multi-search-input:focus {
  background: #3a3a3f !important;
  border-color: var(--p-primary-500, #3b82f6) !important;
}

.dropdown-menu--dark .multi-chips-wrapper {
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
}

.dropdown-menu--dark .multi-chip {
  background: rgba(37, 99, 235, 0.2) !important;
  border-color: rgba(37, 99, 235, 0.3) !important;
  color: #93c5fd !important;
}

.dropdown-menu--dark .multi-chip-remove {
  color: #60a5fa !important;
}

.dropdown-menu--dark .multi-chip-remove:hover {
  background: rgba(37, 99, 235, 0.3) !important;
  color: #ffffff !important;
}

.dropdown-menu--dark .multi-list-section-title {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .multi-list-item {
  color: #d1d5db !important;
}

.dropdown-menu--dark .multi-list-item:hover {
  background: #3a3a3f !important;
}

.dropdown-menu--dark .multi-list-item.is-selected {
  background: rgba(37, 99, 235, 0.15) !important;
  color: #93c5fd !important;
}

.dropdown-menu--dark .multi-list-name {
  color: #e2e8f0 !important;
}

.dropdown-menu--dark .multi-list-email {
  color: rgba(255, 255, 255, 0.4) !important;
}

.dropdown-menu--dark .multi-list-check {
  color: #60a5fa !important;
}

.dropdown-menu--dark .multi-list-empty-icon {
  color: rgba(255, 255, 255, 0.2) !important;
}

.dropdown-menu--dark .multi-list-empty-text {
  color: rgba(255, 255, 255, 0.4) !important;
}
</style>
