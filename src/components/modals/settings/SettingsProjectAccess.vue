<script setup>
/**
 * SettingsProjectAccess - Project access control content for settings modal.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import * as projectApi from '@/api/project.api'
import { getRoles } from '@/api/role.api'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Button from 'primevue/button'
import UserProfileModal from '@/components/modals/UserProfileModal.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { MoreHorizontal, Search, X, ChevronDown } from 'lucide-vue-next'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const searchQuery = ref('')
const searchResults = ref({ users: [], groups: [], matched: 0, matchedGroups: 0 })
const searchLimit = ref(6)
const isSearching = ref(false)
const isLoadingAccesses = ref(false)
const accessEntries = ref([])
const pendingAdds = ref([])
const pendingRemovals = ref(new Set())
const pendingRoleChanges = ref({})
const isSaving = ref(false)
const selectedProfile = ref(null)
const showProfileModal = ref(false)
const showRemoveModal = ref(false)
const isRemoving = ref(false)
const pendingRemoveEntry = ref(null)
const roles = ref([])
const isLoadingRoles = ref(false)
const updatingRoleIds = ref(new Set())

const sideItems = computed(() => ([
  { id: 'general', label: t('settings.project.menu.items.general') },
  { id: 'access-control', label: t('settings.project.menu.items.accessControl') },
  { id: 'reports', label: t('settings.project.menu.items.reports') },
  { id: 'instruction', label: t('settings.project.menu.items.instruction') },
  { id: 'email', label: t('settings.project.menu.items.email') }
]))

const activeSideItem = ref('access-control')
const projectId = computed(() => projectStore.currentProjectId)
const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const filteredEntries = computed(() => accessEntries.value)
const hasTableData = computed(() => filteredEntries.value.length > 0)

const existingUserIds = computed(() => new Set(
  accessEntries.value.filter(entry => entry.type === 'user').map(entry => entry.id)
))

const existingGroupIds = computed(() => new Set(
  accessEntries.value.filter(entry => entry.type === 'group').map(entry => entry.id)
))

const pendingAddEntries = computed(() =>
  accessEntries.value.filter(entry => entry.isPendingAdd)
)

const pendingChanges = computed(() =>
  pendingAddEntries.value.length > 0 ||
  pendingRemovals.value.size > 0 ||
  Object.keys(pendingRoleChanges.value).length > 0
)

const groupedResults = computed(() => ([
  {
    key: 'users',
    label: t('settings.project.search.users'),
    items: searchResults.value.users || [],
    hasMore: searchResults.value.matched > (searchResults.value.users || []).length
  },
  {
    key: 'groups',
    label: t('settings.project.search.groups'),
    items: searchResults.value.groups || [],
    hasMore: searchResults.value.matchedGroups > (searchResults.value.groups || []).length
  }
]))

const visibleSearchSections = computed(() =>
  groupedResults.value.filter(section => section.items.length > 0)
)

function getLastLoginLabel(entry) {
  if (!entry.lastLoginValue) return 'Never'
  
  const loginDate = new Date(entry.lastLoginValue)
  const now = new Date()
  const diffMs = now - loginDate
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 5) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} mins ago`
  if (diffHours < 24) return `${diffHours} hrs ago`
  if (diffDays < 7) return `${diffDays} days ago`
  
  return loginDate.toLocaleDateString()
}

function getAvatarInitials(name) {
  const parts = (name || '').trim().split(' ')
  const first = parts[0]?.[0] || ''
  const last = parts[1]?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
}

function getAvatarColor(name) {
  const palette = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']
  if (!name) return palette[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

const rowMenuItems = computed(() => ([
  {
    id: 'view',
    label: t('settings.project.actions.viewProfile'),
    action: (entry) => openProfile(entry)
  },
  {
    id: 'remove',
    label: t('settings.project.actions.removeAccess'),
    action: (entry) => confirmRemove(entry)
  }
]))

function normalizeAccessResponse(response) {
  const data = response?.data || response?.accesses || response || []
  const list = Array.isArray(data) ? data : data?.accesses || data?.data || []
  return list.map((entry) => ({
    id: entry?.userId || entry?.groupId || entry?.id,
    accessId: entry?.id || entry?.accessId,
    name: entry?.user?.fullName || entry?.user?.name || entry?.group?.name || entry?.name || '-',
    email: entry?.user?.email || entry?.email || t('settings.project.labels.group'),
    lastLoginKey: entry?.user?.loginAt ? 'custom' : (entry?.lastLoginKey || 'none'),
    lastLoginValue: entry?.user?.loginAt,
    role: entry?.role?.name || entry?.access || entry?.role || 'Guest',
    roleId: entry?.role?.id || entry?.roleId,
    originalRoleId: entry?.role?.id || entry?.roleId,
    type: entry?.groupId || entry?.group ? 'group' : 'user',
    raw: entry,
    isPendingAdd: false
  }))
}

async function fetchAccesses() {
  if (!projectId.value) return
  isLoadingAccesses.value = true
  try {
    const response = await projectApi.getProjectAccesses(projectId.value)
    accessEntries.value = normalizeAccessResponse(response)
    return accessEntries.value
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoadingAccesses.value = false
  }
}

async function fetchRoles() {
  isLoadingRoles.value = true
  try {
    const response = await getRoles({ limit: 9999 })
    const data = response?.data || response || []
    roles.value = Array.isArray(data) ? data : []
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoadingRoles.value = false
  }
}

function queueRoleChange(entry, roleId) {
  const originalRoleId = entry?.originalRoleId ?? entry?.roleId
  const role = roles.value.find(r => r.id === roleId)
  entry.roleId = roleId
  entry.role = role?.name || entry.role

  if (!entry?.accessId || entry.isPendingAdd) return

  const accessId = entry.accessId

  if (roleId === originalRoleId) {
    const { [accessId]: _removed, ...rest } = pendingRoleChanges.value
    pendingRoleChanges.value = rest
  } else {
    pendingRoleChanges.value = {
      ...pendingRoleChanges.value,
      [accessId]: roleId
    }
  }
}

function getRoleMenuItems(entry) {
  return roles.value.map(role => ({
    id: role.id,
    label: role.name,
    action: () => queueRoleChange(entry, role.id),
    disabled: entry.roleId === role.id
  }))
}

async function fetchSearchResults(query) {
  if (!projectId.value) return
  const trimmed = query.trim()
  if (!trimmed) {
    searchResults.value = { users: [], groups: [], matched: 0, matchedGroups: 0 }
    return
  }
  isSearching.value = true
  try {
    const response = await projectApi.searchProjectAccesses(projectId.value, {
      keywords: trimmed,
    })
    const users = Array.isArray(response?.users) ? response.users : []
    const groups = Array.isArray(response?.groups) ? response.groups : []
    searchResults.value = {
      users: users.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email || '-',
        type: 'user',
        isJoinProject: !!user.isJoinProject
      })),
      groups: groups.map(group => ({
        id: group.id,
        name: group.name,
        email: t('settings.project.labels.group'),
        type: 'group',
        isJoinProject: !!group.isJoinProject
      })),
      matched: response?.matched || users.length,
      matchedGroups: response?.matchedGroups || groups.length
    }
  } catch (error) {
    searchResults.value = { users: [], groups: [], matched: 0, matchedGroups: 0 }
    uiStore.showApiError(error)
  } finally {
    isSearching.value = false
  }
}

function handleAddAccess(item) {
  if (!item || isResultDisabled(item)) return
  pendingAdds.value.push({ ...item })
  searchQuery.value = ''
  searchResults.value = { users: [], groups: [], matched: 0, matchedGroups: 0 }
  searchLimit.value = 6
}

function isResultDisabled(item) {
  if (item.isJoinProject) return true
  if (pendingAdds.value.some((pending) => pending.id === item.id && pending.type === item.type)) return true
  if (item.type === 'user') return existingUserIds.value.has(item.id)
  if (item.type === 'group') return existingGroupIds.value.has(item.id)
  return false
}

function openProfile(entry) {
  if (!entry) return
  selectedProfile.value = entry
  showProfileModal.value = true
}

function confirmRemove(entry) {
  if (!entry) return
  pendingRemoveEntry.value = entry
  showRemoveModal.value = true
}

async function handleRemoveAccess() {
  if (!pendingRemoveEntry.value) return
  const entry = pendingRemoveEntry.value
  if (entry.isPendingAdd) {
    accessEntries.value = accessEntries.value.filter(
      (pending) => !(pending.isPendingAdd && pending.id === entry.id && pending.type === entry.type)
    )
  } else {
    if (entry.accessId) {
      pendingRemovals.value.add(entry.accessId)
    }
    if (entry.accessId) {
      const { [entry.accessId]: _removed, ...rest } = pendingRoleChanges.value
      pendingRoleChanges.value = rest
    }
  }
  showRemoveModal.value = false
  pendingRemoveEntry.value = null
}

watch(projectId, () => {
  fetchAccesses()
})

const debouncedSearch = debounce((query) => {
  const keywords = resolveSearchKeywords(query)
  if (keywords === null) {
    searchResults.value = { users: [], groups: [], matched: 0, matchedGroups: 0 }
    return
  }
  fetchSearchResults(keywords)
}, 300)

watch(searchQuery, (query) => {
  debouncedSearch(query)
})

watch(pendingChanges, (value) => {
  emit('update:canSave', value)
  emit('update:hasPendingChanges', value)
}, { immediate: true })

watch(isSaving, (value) => {
  emit('update:isSaving', value)
}, { immediate: true })

onMounted(() => {
  fetchAccesses()
  fetchRoles()
})

function removePending(item) {
  pendingAdds.value = pendingAdds.value.filter(
    (pending) => !(pending.id === item.id && pending.type === item.type)
  )
}

function isPendingRemoval(entry) {
  return entry.accessId ? pendingRemovals.value.has(entry.accessId) : false
}

function showMoreResults() {
  searchLimit.value += 6
  if (searchQuery.value.trim().length >= 3) {
    fetchSearchResults(searchQuery.value)
  }
}

const hasPendingAdds = computed(() => pendingAdds.value.length > 0)

function addPendingAccesses() {
  if (!pendingAdds.value.length) return

  const pendingEntries = pendingAdds.value.map(item => ({
    id: item.id,
    accessId: null,
    name: item.name,
    email: item.email,
    lastLoginKey: 'none',
    lastLoginValue: null,
    role: t('settings.project.roles.guest'),
    roleId: null,
    originalRoleId: null,
    type: item.type,
    raw: item,
    isPendingAdd: true
  }))

  accessEntries.value = [...pendingEntries, ...accessEntries.value]
  pendingAdds.value = []
}

async function saveChanges() {
  if (!projectId.value || !pendingChanges.value) return
  isSaving.value = true
  const requestConfig = { metadata: { skipGlobalLoader: true } }
  try {
    let successResponse = null
    const pendingAddRoleUpdates = pendingAddEntries.value
      .filter(item => item.roleId)
      .map(item => ({ id: item.id, type: item.type, roleId: item.roleId }))

    if (pendingAddEntries.value.length > 0) {
      const userIds = pendingAddEntries.value.filter(item => item.type === 'user').map(item => item.id)
      const groupIds = pendingAddEntries.value.filter(item => item.type === 'group').map(item => item.id)
      const response = await projectApi.addProjectAccesses(
        projectId.value,
        { userIds, groupIds },
        requestConfig
      )
      successResponse = response
    }
    if (pendingRemovals.value.size > 0) {
      const accessIds = Array.from(pendingRemovals.value)
      const response = await projectApi.removeProjectAccesses(projectId.value, accessIds, requestConfig)
      successResponse = response
    }
    const roleUpdates = Object.entries(pendingRoleChanges.value)
    if (roleUpdates.length > 0) {
      updatingRoleIds.value = new Set(roleUpdates.map(([accessId]) => accessId))
      await Promise.all(roleUpdates.map(async ([accessId, roleId]) => {
        const response = await projectApi.updateAccessRole(
          projectId.value,
          accessId,
          roleId,
          requestConfig
        )
        successResponse = response
      }))
    }
    const refreshedEntries = await projectApi.getProjectAccesses(projectId.value, requestConfig)
      .then((response) => {
        accessEntries.value = normalizeAccessResponse(response)
        return accessEntries.value
      })
    if (pendingAddRoleUpdates.length > 0 && refreshedEntries?.length) {
      const updates = pendingAddRoleUpdates
        .map((update) => ({
          ...update,
          entry: refreshedEntries.find(
            (entry) => entry.id === update.id && entry.type === update.type
          )
        }))
        .filter((update) => update.entry?.accessId && update.entry.roleId !== update.roleId)

      if (updates.length > 0) {
        updatingRoleIds.value = new Set(updates.map((update) => update.entry.accessId))
        await Promise.all(updates.map(async (update) => {
          const response = await projectApi.updateAccessRole(
            projectId.value,
            update.entry.accessId,
            update.roleId,
            requestConfig
          )
          const role = roles.value.find(r => r.id === update.roleId)
          update.entry.roleId = update.roleId
          update.entry.role = role?.name || update.entry.role
          update.entry.originalRoleId = update.roleId
          successResponse = response
        }))
      }
    }

    if (successResponse) {
      uiStore.showApiSuccess(successResponse)
    }

    pendingAdds.value = []
    pendingRemovals.value = new Set()
    pendingRoleChanges.value = {}
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    updatingRoleIds.value = new Set()
    isSaving.value = false
  }
}

defineExpose({ saveChanges, pendingChanges })
</script>

<template>
  <div class="settings-project" :style="{ '--settings-project-nav-width': '200px' }">
    <aside class="settings-project-nav">
      <div class="settings-project-nav-title">{{ t('settings.project.menu.title') }}</div>
      <div class="settings-project-nav-list">
        <button
          v-for="item in sideItems"
          :key="item.id"
          type="button"
          class="settings-project-nav-item"
          :class="{ 'is-active': activeSideItem === item.id }"
          @click="activeSideItem = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </aside>

    <div class="settings-project-divider"></div>

    <div class="settings-project-content">
      <div v-if="!projectId" class="settings-project-empty">
        <div class="settings-project-empty-title">{{ t('settings.project.empty.title') }}</div>
        <p class="settings-project-empty-text">{{ t('settings.project.empty.description') }}</p>
      </div>
      <template v-else>
        <div v-if="activeSideItem === 'access-control'">
          <div class="settings-project-header">
            <div class="settings-project-title">{{ t('settings.project.title') }}</div>
            <p class="settings-project-subtitle">
              {{ t('settings.project.descriptionPrefix') }}
              <span class="settings-project-highlight">{{ t('settings.project.descriptionHighlight') }}</span>
              {{ t('settings.project.descriptionSuffix') }}
            </p>
          </div>

          <div class="settings-project-controls mt-4">
            <div class="settings-project-search">
              <Search class="settings-project-search-icon" />
              <div class="settings-project-search-input">
                <div v-if="pendingAdds.length" class="settings-project-chips">
                  <span
                    v-for="item in pendingAdds"
                    :key="`${item.type}-${item.id}`"
                    class="settings-project-chip"
                  >
                    {{ item.name }}
                    <button type="button" class="settings-project-chip-remove" @click="removePending(item)">
                      <X class="w-3 h-3" />
                    </button>
                  </span>
                </div>
                <input
                  v-model="searchQuery"
                  type="text"
                  class="settings-project-search-field"
                  :placeholder="t('settings.project.searchPlaceholder')"
                />
              </div>
              <div v-if="searchQuery" class="settings-project-search-panel">
                <div v-if="searchQuery.length < 3" class="settings-project-search-state">
                  {{ t('settings.project.search.minChars') }}
                </div>
                <template v-else>
                  <div v-if="isSearching" class="settings-project-search-state">
                    {{ t('common.loading') }}
                  </div>
                  <div
                    v-else-if="!searchResults.users.length && !searchResults.groups.length"
                    class="settings-project-search-state"
                  >
                    {{ t('common.noResults') }}
                  </div>
                  <div v-else class="settings-project-search-list">
                    <div
                      v-for="section in visibleSearchSections"
                      :key="section.key"
                      class="settings-project-search-section"
                    >
                      <div class="settings-project-search-title">{{ section.label }}</div>
                      <button
                        v-for="item in section.items"
                        :key="`${section.key}-${item.id}`"
                        type="button"
                        class="settings-project-search-item"
                        :class="{ 'is-disabled': isResultDisabled(item) }"
                        :disabled="isResultDisabled(item)"
                        @click="handleAddAccess(item)"
                      >
                        <div class="settings-project-search-avatar" :style="{ backgroundColor: getAvatarColor(item.name) }">
                          {{ getAvatarInitials(item.name) }}
                        </div>
                        <div class="settings-project-search-text">
                          <div class="settings-project-search-name">{{ item.name }}</div>
                          <div class="settings-project-search-meta">{{ item.email }}</div>
                        </div>
                      </button>
                      <button
                        v-if="section.hasMore"
                        type="button"
                        class="settings-project-search-more"
                        @click="showMoreResults"
                      >
                        {{ t('settings.project.search.showMore') }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div class="settings-project-actions">
              <Button
                type="button"
                :label="t('settings.project.addAccess')"
                class="settings-project-add"
                :disabled="!hasPendingAdds || isSaving"
                :loading="isSaving"
                @click="addPendingAccesses"
              />
            </div>
          </div>
          <div class="settings-project-table mt-10">
            <div v-if="hasTableData" class="settings-project-table-head">
              <span class="settings-project-col-user"></span>
              <span class="settings-project-col-login">{{ t('settings.project.columns.lastLogin') }}</span>
              <span class="settings-project-col-role">{{ t('settings.project.columns.role') }}</span>
              <span class="settings-project-col-actions"></span>
            </div>

            <div v-if="isLoadingAccesses" class="settings-project-row">
              <div class="settings-project-loading">{{ t('common.loading') }}</div>
            </div>
            <div
              v-else
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="settings-project-row"
              :class="{ 'is-pending': isPendingRemoval(entry) }"
            >
              <div class="settings-project-user">
                <div class="settings-project-avatar" :style="{ backgroundColor: getAvatarColor(entry.name) }">
                  {{ getAvatarInitials(entry.name) }}
                </div>
                <div>
                  <div class="settings-project-name">{{ entry.name }}</div>
                  <div class="settings-project-email">{{ entry.email }}</div>
                </div>
              </div>
              <div class="settings-project-login">{{ getLastLoginLabel(entry) }}</div>
              <div class="settings-project-role-cell">
                <DropdownMenu
                  :items="getRoleMenuItems(entry)"
                  position="left"
                  width="10rem"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="settings-project-role-pill settings-project-role-dropdown"
                      :class="{ 'is-loading': updatingRoleIds.has(entry.accessId) }"
                      :disabled="isPendingRemoval(entry) || updatingRoleIds.has(entry.accessId)"
                    >
                      {{ entry.role || 'Guest' }}
                      <ChevronDown class="w-3 h-3 ml-1" />
                    </button>
                  </template>
                </DropdownMenu>
              </div>
              <div class="settings-project-actions-cell">
                <DropdownMenu
                  :items="rowMenuItems.map(item => ({ ...item, action: () => item.action(entry) }))"
                  position="left"
                  width="12rem"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="settings-project-more"
                      :disabled="isPendingRemoval(entry)"
                    >
                      <MoreHorizontal class="w-4 h-4" />
                    </button>
                  </template>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="settings-project-placeholder">
          <div class="settings-project-empty-title">{{ t('settings.modal.comingSoon') }}</div>
          <p class="settings-project-empty-text">{{ t('settings.modal.comingSoonDescription') }}</p>
        </div>
      </template>
    </div>
  </div>

  <UserProfileModal
    v-model:visible="showProfileModal"
    :entry="selectedProfile"
  />

  <DeleteConfirmModal
    v-model:visible="showRemoveModal"
    :title="t('settings.project.remove.title')"
    :message="t('settings.project.remove.message')"
    :loading="isRemoving"
    @confirm="handleRemoveAccess"
    @cancel="showRemoveModal = false"
  />
</template>

<style scoped>
.settings-project {
  display: grid;
  grid-template-columns: var(--settings-project-nav-width, 200px) 12px minmax(0, 1fr);
  gap: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.settings-project-nav {
  background: #ffffff;
  padding: 19px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding-bottom: calc(18px + var(--settings-footer-height, 72px));
  width: 100%;
  position: relative;
}

.settings-project-nav::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--settings-footer-height, 72px);
  background: #ffffff;
  pointer-events: none;
}

.settings-project-nav-title {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0;
}

.settings-project-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-project-nav-item {
  text-align: left;
  font-size: 13px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  color: #374151;
}

.settings-project-nav-item:hover {
  background: #f9fafb;
}

.settings-project-nav-item.is-active {
  background: #f3f4f6;
  color: #111827;
}

.settings-project-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 28px;
  padding-bottom: calc(30px + var(--settings-footer-height, 72px));
  height: 100%;
  overflow: auto;
}

.settings-project::before {
  content: '';
  position: absolute;
  left: calc(12px + var(--settings-project-nav-width, 200px));
  right: 0;
  bottom: 0;
  height: var(--settings-footer-height, 72px);
  background: #ffffff;
  pointer-events: none;
}

.settings-project::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--settings-footer-height, 72px);
  height: 1px;
  background: #e5e7eb;
  pointer-events: none;
}

.settings-project-divider {
  width: 12px;
  position: relative;
  cursor: col-resize;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.settings-project-divider::before {
  content: '';
  width: 1px;
  background: #f3f4f6;
  height: 100%;
}

.settings-project-empty {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
}

.settings-project-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.settings-project-empty-text {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}

.settings-project-placeholder {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
}

.settings-project-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-project-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.settings-project-subtitle {
  font-size: 12px;
  color: #6b7280;
  max-width: 520px;
}

.settings-project-highlight {
  color: var(--color-primary-600);
  font-weight: 600;
}

.settings-project-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.settings-project-search {
  position: relative;
  flex: 1;
  min-width: 260px;
}

.settings-project-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #9ca3af;
}

.settings-project-search-input {
  width: 100%;
  min-height: 34px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 4px 12px 4px 34px;
  font-size: 12px;
  color: #374151;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.settings-project-search-input:focus-within {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.settings-project-search-field {
  border: none;
  outline: none;
  min-width: 120px;
  flex: 1;
  font-size: 12px;
  color: #374151;
  background: transparent;
}

.settings-project-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.settings-project-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
}

.settings-project-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1d4ed8;
}

.settings-project-search-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
  z-index: 5;
  max-height: 220px;
  overflow: auto;
  min-width: 100%;
}

.settings-project-search-state {
  padding: 10px 12px;
  font-size: 12px;
  color: #9ca3af;
}

.settings-project-search-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.settings-project-search-section {
  padding: 6px 0;
  border-top: 1px solid #f3f4f6;
  width: 100%;
}

.settings-project-search-section:first-child {
  border-top: none;
}

.settings-project-search-title {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  padding: 4px 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-project-search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  color: #374151;
  width: 100%;
}

.settings-project-search-item:hover:not(.is-disabled) {
  background: #e5e7eb;
}

.settings-project-search-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-project-search-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.settings-project-search-text {
  display: flex;
  flex-direction: column;
}

.settings-project-search-name {
  font-weight: 600;
}

.settings-project-search-meta {
  color: #9ca3af;
}

.settings-project-search-more {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  padding: 6px 0 2px;
}

.settings-project-search-more:hover {
  color: #6b7280;
}

.settings-project-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-project-add {
  height: 34px;
  font-size: 12px;
  padding: 0 14px;
}

.settings-project-table-head {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(120px, 1fr) minmax(140px, 1fr) 40px;
  gap: 12px;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-project-row {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(120px, 1fr) minmax(140px, 1fr) 40px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  border-top: 1px solid #f3f4f6;
  background: #ffffff;
}

.settings-project-row:hover {
  background: #f9fafb;
}

.settings-project-row.is-pending {
  opacity: 0.5;
}

.settings-project-loading {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #9ca3af;
}

.settings-project-user {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.settings-project-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.settings-project-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.settings-project-email {
  font-size: 12px;
  color: #6b7280;
}

.settings-project-login {
  font-size: 12px;
  color: #6b7280;
  text-align: left;
}

.settings-project-role-cell {
  display: flex;
  align-items: center;
}

.settings-project-role-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: #ffffff;
  font-size: 12px;
  color: #374151;
}

.settings-project-role-dropdown {
  cursor: pointer;
  border: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.settings-project-role-dropdown:hover:not(:disabled) {
  background: #f9fafb;
}

.settings-project-role-dropdown:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-project-role-dropdown.is-loading {
  opacity: 0.6;
}

.settings-project-actions-cell {
  display: flex;
  justify-content: flex-end;
}

.settings-project-more {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #6b7280;
}

.settings-project-more:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-project-more:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}


@media (max-width: 900px) {
  .settings-project {
    grid-template-columns: 1fr;
  }

  .settings-project-nav {
    border-right: none;
    border-bottom: 1px solid #f3f4f6;
    flex-direction: row;
    flex-wrap: wrap;
    padding-bottom: 18px;
    min-width: 0;
  }

  .settings-project-divider {
    display: none;
  }

  .settings-project-content {
    padding: 18px 16px;
  }

  .settings-project-table-head,
  .settings-project-row {
    grid-template-columns: minmax(180px, 2fr) minmax(90px, 1fr) minmax(120px, 1fr) 32px;
  }

  .settings-project::before {
    left: 0;
  }
}
</style>
