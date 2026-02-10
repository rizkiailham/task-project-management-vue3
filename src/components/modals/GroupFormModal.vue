<script setup>
/**
 * GroupFormModal - Modal for creating/editing groups and assigning users
 */
import { ref, computed, watch } from 'vue'
import { useGroupStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'
import { ChevronDown, Search, Trash, Plus, X } from 'lucide-vue-next'
import { getUsers } from '@/api/user.api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  group: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'saved'])

const groupStore = useGroupStore()
const uiStore = useUIStore()
const { t } = useI18n()

const formData = ref({
  name: '',
  description: ''
})

const groupUsers = ref([])
const pendingUserIds = ref([])
const baseUsers = ref([])
const searchResults = ref([])
const searchQuery = ref('')

const detailsExpanded = ref(true)
const usersExpanded = ref(true)
const isSubmitting = ref(false)
const isLoadingUsers = ref(false)
const busyUserIds = ref(new Set())
let searchTimeout = null

const isEditing = computed(() => !!props.group?.id)
const modalTitle = computed(() => {
  if (isEditing.value && props.group?.name) {
    return `${t('users.groupForm.titles.manageGroup')} - ${props.group.name}`
  }
  return t('users.groupForm.titles.createGroup')
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const memberIds = computed(() => {
  const ids = new Set()
  groupUsers.value.forEach((user) => {
    const id = getUserId(user)
    if (id) ids.add(id)
  })
  searchResults.value.forEach((user) => {
    if (user?.isJoined) {
      const id = getUserId(user)
      if (id) ids.add(id)
    }
  })
  pendingUserIds.value.forEach((id) => {
    if (id) ids.add(id)
  })
  return ids
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    initializeModal()
  }
)

watch(
  () => props.group,
  () => {
    if (!props.visible) return
    initializeModal()
  }
)

watch(searchQuery, (query) => {
  if (!isEditing.value) return
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchUsers(query)
  }, 250)
})

async function initializeModal() {
  resetForm()
  if (isEditing.value) {
    await Promise.all([loadGroupDetails(), fetchUsers('')])
  } else {
    await loadGroupDetails()
  }
}

async function loadGroupDetails() {
  if (!isEditing.value || !props.group?.id) {
    groupUsers.value = []
    pendingUserIds.value = []
    return
  }

  try {
    const group = await groupStore.fetchGroup(props.group.id)
    formData.value = {
      name: group?.name || props.group?.name || '',
      description: group?.description || props.group?.description || ''
    }
    if (Array.isArray(group?.users)) {
      groupUsers.value = group.users
    } else if (Array.isArray(group?.members)) {
      groupUsers.value = group.members
    } else {
      groupUsers.value = []
    }
    pendingUserIds.value = []
    const fetchedUsers = await groupStore.searchUsers(props.group.id, '')
    if (Array.isArray(fetchedUsers)) {
      baseUsers.value = fetchedUsers
    }
  } catch (error) {
    uiStore.showApiError(error, t('users.groupForm.errors.loadDetails'))
  }
}

async function fetchUsers(keywords = '') {
  isLoadingUsers.value = true
  try {
    if (isEditing.value && props.group?.id) {
      const results = await groupStore.searchUsers(props.group.id, keywords)
      if (keywords) {
        searchResults.value = Array.isArray(results) ? results : []
      } else {
        baseUsers.value = Array.isArray(results) ? results : []
      }
    } else {
      const response = await getUsers({ limit: 100, keywords })
      const data = response?.data || response || []
      if (keywords) {
        searchResults.value = Array.isArray(data) ? data : []
      } else {
        baseUsers.value = Array.isArray(data) ? data : []
      }
    }
  } catch (error) {
    if (keywords) {
      searchResults.value = []
    } else {
      baseUsers.value = []
    }
    uiStore.showApiError(error, t('users.groupForm.errors.loadUsers'))
  } finally {
    isLoadingUsers.value = false
  }
}

function resetForm() {
  formData.value = {
    name: props.group?.name || '',
    description: props.group?.description || ''
  }
  detailsExpanded.value = true
  usersExpanded.value = isEditing.value
  groupUsers.value = []
  pendingUserIds.value = []
  searchQuery.value = ''
}

function closeModal() {
  dialogVisible.value = false
  resetForm()
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

function getUserId(user) {
  return user?.id || user?.userId || user?._id || null
}

function isMember(user) {
  if (user?.isJoined) return true
  const id = getUserId(user)
  if (!id) return false
  return memberIds.value.has(id)
}

function getInitials(user) {
  const first = user?.firstName?.charAt(0) || ''
  const last = user?.lastName?.charAt(0) || ''
  const initials = `${first}${last}`.trim()
  return initials || user?.email?.charAt(0)?.toUpperCase() || 'U'
}

function getAvatarColor(user) {
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
  if (!name) return '#3B82F6'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const palette = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899']
  return palette[Math.abs(hash) % palette.length]
}

function setBusy(userId, isBusy) {
  const next = new Set(busyUserIds.value)
  if (isBusy) {
    next.add(userId)
  } else {
    next.delete(userId)
  }
  busyUserIds.value = next
}

function updateUserJoinState(userId, isJoined) {
  if (!userId) return
  baseUsers.value = baseUsers.value.map((user) => {
    if (getUserId(user) === userId) {
      return { ...user, isJoined }
    }
    return user
  })
  searchResults.value = searchResults.value.map((user) => {
    if (getUserId(user) === userId) {
      return { ...user, isJoined }
    }
    return user
  })
}

async function handleAddUser(user) {
  const id = getUserId(user)
  if (!id || busyUserIds.value.has(id)) return

  if (!isEditing.value) {
    if (!pendingUserIds.value.includes(id)) {
      pendingUserIds.value.push(id)
    }
    updateUserJoinState(id, true)
    return
  }

  setBusy(id, true)
  try {
    const updated = await groupStore.addUsers(props.group.id, [id])
    if (Array.isArray(updated?.users)) {
      groupUsers.value = updated.users
    } else if (Array.isArray(updated?.members)) {
      groupUsers.value = updated.members
    } else if (!groupUsers.value.some(u => getUserId(u) === id)) {
      groupUsers.value.push(user)
    }
    updateUserJoinState(id, true)
  } catch (error) {
    uiStore.showApiError(error, t('users.groupForm.errors.addUser'))
  } finally {
    setBusy(id, false)
  }
}

async function handleRemoveUser(user) {
  const id = getUserId(user)
  if (!id || busyUserIds.value.has(id)) return

  if (!isEditing.value) {
    pendingUserIds.value = pendingUserIds.value.filter(item => item !== id)
    updateUserJoinState(id, false)
    return
  }

  setBusy(id, true)
  try {
    const updated = await groupStore.removeUsers(props.group.id, [id])
    if (Array.isArray(updated?.users)) {
      groupUsers.value = updated.users
    } else if (Array.isArray(updated?.members)) {
      groupUsers.value = updated.members
    } else {
      groupUsers.value = groupUsers.value.filter(u => getUserId(u) !== id)
    }
    updateUserJoinState(id, false)
  } catch (error) {
    uiStore.showApiError(error, t('users.groupForm.errors.removeUser'))
  } finally {
    setBusy(id, false)
  }
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    uiStore.showError(t('users.groupForm.validation.nameRequired'))
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim()
    }

    if (isEditing.value) {
      const response = await groupStore.updateGroup(props.group.id, payload)
      uiStore.showApiSuccess(response, t('users.groupForm.messages.updated'))
    } else {
      const response = await groupStore.createGroup(payload)
      const newGroup = response?.group || response?.data || response
      if (pendingUserIds.value.length > 0 && newGroup?.id) {
        await groupStore.addUsers(newGroup.id, pendingUserIds.value)
      }
      uiStore.showApiSuccess(response, t('users.groupForm.messages.created'))
    }

    emit('saved')
    closeModal()
  } catch (error) {
    uiStore.showApiError(error, t('users.groupForm.errors.save'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="modalTitle"
    width="92vw"
    maxWidth="560px"
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    :loading="isSubmitting"
  >
    <template #header>
      <h2 class="text-base font-semibold text-gray-900">{{ modalTitle }}</h2>
    </template>

    <!-- Wrapper for positioning context (non-scrollable) -->
    <div
      class="relative -my-5 -mx-6"
      :style="{ height: isEditing ? '60vh' : 'auto' }"
    >
      <!-- Scrollable content area -->
      <div
        :class="[
          'px-4 space-y-0 h-full',
          isEditing ? (searchQuery ? 'overflow-hidden' : 'overflow-y-auto') : 'overflow-visible'
        ]"
      >
      <!-- Details Section -->
      <div :class="['border-gray-100', isEditing ? 'border-b' : 'border-b-0']">
        <button
          type="button"
          @click="detailsExpanded = !detailsExpanded"
          class="w-full flex items-center gap-2 py-3 text-left"
        >
          <ChevronDown
            class="w-4 h-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !detailsExpanded }"
          />
          <span class="text-sm font-medium text-gray-900">{{ t('users.groupForm.sections.details') }}</span>
        </button>

        <div v-show="detailsExpanded" class="pb-4 space-y-4">
          <div>
            <FormInput
              id="group-name"
              v-model="formData.name"
              :label="t('users.groupForm.fields.name')"
              labelClass="block text-xs text-gray-500 mb-1"
              :placeholder="t('users.groupForm.placeholders.name')"
              class="w-full"
            />
          </div>
          <div>
            <FormInput
              id="group-description"
              v-model="formData.description"
              as="textarea"
              :label="t('users.groupForm.fields.description')"
              labelClass="block text-xs text-gray-500 mb-1"
              :placeholder="t('users.groupForm.placeholders.description')"
              rows="3"
              class="w-full text-sm"
            />
          </div>
        </div>
      </div>

      <!-- User List Section -->
      <div v-if="isEditing" class="-mx-4">
        <button
          type="button"
          @click="usersExpanded = !usersExpanded"
          class="w-full flex items-center gap-2 py-3 px-4 text-left"
        >
          <ChevronDown
            class="w-4 h-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !usersExpanded }"
          />
          <span class="text-sm font-medium text-gray-900">{{ t('users.groupForm.sections.userList') }}</span>
        </button>

        <div v-show="usersExpanded" class="pb-4">
          <div class="relative min-h-full">
            <div class="min-h-full overflow-y-auto bg-white">
              <div
                v-if="!searchQuery && isLoadingUsers"
                class="px-4 py-6 text-center text-sm text-gray-400"
              >
                {{ t('users.groupForm.loadingUsers') }}
              </div>
              <div
                v-else-if="baseUsers.length === 0"
                class="px-4 py-6 text-center text-sm text-gray-400"
              >
                {{ t('users.groupForm.emptyUsers') }}
              </div>
              <div v-else class="flex flex-col">
                <div
                  v-for="user in baseUsers"
                  :key="getUserId(user) || user.email"
                  :class="[
                    'transition-colors',
                    isMember(user) ? 'bg-gray-100' : 'hover:bg-gray-100'
                  ]"
                >
                  <div class="flex items-center gap-3 px-6 py-3">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      :style="{ backgroundColor: getAvatarColor(user) }"
                    >
                      {{ getInitials(user) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-gray-900">
                        {{ `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email }}
                      </div>
                      <div class="text-xs text-gray-500">{{ user.email }}</div>
                    </div>
                    <div>
                      <button
                        v-if="isMember(user)"
                        type="button"
                        class="inline-flex items-center justify-center h-8 w-8 rounded-md text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="busyUserIds.has(getUserId(user))"
                        @click="handleRemoveUser(user)"
                      >
                        <Trash class="w-4 h-4" />
                      </button>
                      <button
                        v-else
                        type="button"
                        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="busyUserIds.has(getUserId(user))"
                        @click="handleAddUser(user)"
                      >
                        <Plus class="w-3.5 h-3.5" />
                        {{ t('users.groupForm.actions.addToGroup') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- Search Results Overlay - Inside the wrapper but outside the scrollable content -->
      <div v-if="isEditing && searchQuery" class="search-overlay-container">
        <div class="search-backdrop" @click="clearSearch"></div>
        <div class="search-panel">
          <div class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {{ t('users.groupForm.search.results') }}
          </div>
          <div class="search-panel-content">
            <div
              v-if="isLoadingUsers"
              class="px-4 py-6 text-center text-sm text-gray-400"
            >
              {{ t('users.groupForm.loadingUsers') }}
            </div>
            <div
              v-else-if="searchResults.length === 0"
              class="px-4 py-6 text-center text-sm text-gray-400"
            >
              {{ t('users.groupForm.emptyUsers') }}
            </div>
            <div v-else class="flex flex-col">
              <div
                v-for="user in searchResults"
                :key="getUserId(user) || user.email"
                :class="[
                  'transition-colors',
                  isMember(user) ? 'bg-gray-100' : 'hover:bg-gray-100'
                ]"
              >
                <div class="flex items-center gap-3 px-6 py-3">
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    :style="{ backgroundColor: getAvatarColor(user) }"
                  >
                    {{ getInitials(user) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">
                      {{ `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email }}
                    </div>
                    <div class="text-xs text-gray-500">{{ user.email }}</div>
                  </div>
                  <div>
                    <button
                      v-if="isMember(user)"
                      type="button"
                      class="inline-flex items-center justify-center h-8 w-8 rounded-md text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="busyUserIds.has(getUserId(user))"
                      @click="handleRemoveUser(user)"
                    >
                      <Trash class="w-4 h-4" />
                    </button>
                    <button
                      v-else
                      type="button"
                      class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="busyUserIds.has(getUserId(user))"
                      @click="handleAddUser(user)"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      {{ t('users.groupForm.actions.addToGroup') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-[calc(100%+3rem)] items-center justify-between gap-3 -mx-6 px-6">
        <div v-if="isEditing" class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <FormInput
            id="group-search"
            v-model="searchQuery"
            :label="t('users.groupForm.search.label')"
            labelClass="sr-only"
            :placeholder="t('users.groupForm.search.placeholder')"
            class="h-9 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-blue-500"
          />
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="closeModal"
          :disabled="isSubmitting"
        >
          {{ t('common.cancel') }}
        </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSubmit"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? t('common.saving') : t('common.saveChanges') }}
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Search Overlay - Positioned within the content area */
.search-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  margin-bottom: -4px;
  background-color: rgba(15, 23, 42, 0.35);
  margin-top: -10px;
}

.search-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.35);
}

.search-panel {
  position: relative;
  background-color: white;
  border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 72%;
  overflow: hidden;
  border-top: 1px solid #e5e7eb;
}

.search-panel-content {
  flex: 1;
  overflow-y: auto;
}
</style>

