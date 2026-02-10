<script setup>
/**
 * UsersView - Main users management page
 * 
 * Now uses global Topbar from AppLayout for consistent AI Chat sidebar handling.
 * Contains sub-header with tabs, search, and action buttons.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore, useUIStore, useRoleStore, useGroupStore } from '@/stores'
import UsersGrid from '@/modules/user/components/UsersGrid.vue'
import RolesGrid from '@/modules/user/components/RolesGrid.vue'
import GroupsGrid from '@/modules/user/components/GroupsGrid.vue'
import UserFormModal from '@/components/modals/UserFormModal.vue'
import InviteUserModal from '@/components/modals/InviteUserModal.vue'
import RoleFormModal from '@/components/modals/RoleFormModal.vue'
import GroupFormModal from '@/components/modals/GroupFormModal.vue'
import { Search, Plus, UserPlus, Menu } from 'lucide-vue-next'
import AIChatButton from '@/components/ai/AIChatButton.vue'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'

const userStore = useUserStore()
const uiStore = useUIStore()
const roleStore = useRoleStore()
const groupStore = useGroupStore()
const { t } = useI18n()
const confirm = useConfirm()

// State
const activeTab = ref('users')
const searchQuery = ref('')
const searchKeywords = ref('')
const statusFilter = ref(null)
const roleFilter = ref(null)
const userStatusFilter = ref(null)
const userRoleFilter = ref(null)
const userSortBy = ref(null)
const userOrderBy = ref(null)
const isLoading = ref(true)

// Toggle sidebar
function toggleSidebar() {
  if (uiStore.isMobile) {
    uiStore.openMobileSidebar()
  } else {
    uiStore.toggleSidebar()
  }
}

// Modal states
const showUserFormModal = ref(false)
const showInviteModal = ref(false)
const selectedUser = ref(null)

// Role modal states
const showRoleFormModal = ref(false)
const selectedRole = ref(null)

// Group modal states
const showGroupFormModal = ref(false)
const selectedGroup = ref(null)

// Tab definitions
const tabs = [
  { id: 'users', label: t('users.management.tabs.users') },
  { id: 'groups', label: t('users.management.tabs.groups') },
  { id: 'role', label: t('users.management.tabs.roles') }
]

// Computed
const searchPlaceholder = computed(() => {
  if (activeTab.value === 'groups') return t('users.management.search.groups')
  if (activeTab.value === 'role') return t('users.management.search.roles')
  return t('users.management.search.users')
})

const filteredUsers = computed(() => {
  return userStore.users
})

const filteredRoles = computed(() => {
  return roleStore.roles
})

const filteredGroups = computed(() => {
  return groupStore.groups
})

// Users meta data for pagination (from store)
const usersMeta = computed(() => ({
  currentPage: userStore.pagination.page,
  totalPages: userStore.pagination.totalPages,
  itemsPerPage: userStore.pagination.limit,
  totalItems: userStore.pagination.total
}))

const groupsMeta = computed(() => ({
  currentPage: groupStore.pagination.page,
  totalPages: groupStore.pagination.totalPages,
  itemsPerPage: groupStore.pagination.limit,
  totalItems: groupStore.pagination.total
}))

const rolesMeta = computed(() => ({
  currentPage: roleStore.pagination.page,
  totalPages: roleStore.pagination.totalPages,
  itemsPerPage: roleStore.pagination.limit,
  totalItems: roleStore.pagination.total
}))

const userRoleOptions = computed(() => userStore.availableRoles)

const USER_ACTIVE_TAB_KEY = 'users.activeTab'

function resolveInitialTab() {
  const storedTab = localStorage.getItem(USER_ACTIVE_TAB_KEY)
  const validTabs = tabs.map(tab => tab.id)
  return validTabs.includes(storedTab) ? storedTab : 'users'
}

function persistActiveTab(tabId) {
  localStorage.setItem(USER_ACTIVE_TAB_KEY, tabId)
}

function buildSearchParams(params = {}) {
  return searchKeywords.value ? { ...params, keywords: searchKeywords.value } : params
}

async function fetchUsersWithSearch(params) {
  return userStore.fetchUsers(buildSearchParams(params))
}

async function fetchGroupsWithSearch(params) {
  return groupStore.fetchGroups(buildSearchParams(params))
}

async function fetchRolesWithSearch(params) {
  return roleStore.fetchRoles(buildSearchParams(params))
}

async function handleUserSearch() {
  isLoading.value = true
  try {
    await fetchUsersWithSearch({
      page: 1,
      limit: usersMeta.value.itemsPerPage,
      sortBy: userSortBy.value,
      orderBy: userOrderBy.value,
      isActive: userStatusFilter.value,
      roleId: userRoleFilter.value
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showApiError(error, t('users.management.errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
}

async function handleGroupSearch() {
  try {
    await fetchGroupsWithSearch({ page: 1, limit: groupsMeta.value.itemsPerPage })
  } catch (error) {
    console.error('Error fetching groups:', error)
    uiStore.showApiError(error, t('users.management.errors.loadGroups'))
  }
}

async function handleRoleSearch() {
  try {
    await fetchRolesWithSearch({ page: 1, limit: rolesMeta.value.itemsPerPage })
  } catch (error) {
    console.error('Error fetching roles:', error)
    uiStore.showApiError(error, t('users.management.errors.loadRoles'))
  }
}

const debouncedSearch = debounce(async (query) => {
  const keywords = resolveSearchKeywords(query)
  if (keywords === null) return
  searchKeywords.value = keywords
  if (activeTab.value === 'users') {
    await handleUserSearch()
  } else if (activeTab.value === 'groups') {
    await handleGroupSearch()
  } else if (activeTab.value === 'role') {
    await handleRoleSearch()
  }
}, 300)

watch(searchQuery, (query) => {
  debouncedSearch(query)
})

// Watch for tab changes to fetch data
watch(activeTab, async (newTab) => {
  persistActiveTab(newTab)
  if (searchQuery.value || searchKeywords.value) {
    searchQuery.value = ''
    searchKeywords.value = ''
    if (newTab === 'users') {
      await handleUserSearch()
    } else if (newTab === 'groups') {
      await handleGroupSearch()
    } else if (newTab === 'role') {
      await handleRoleSearch()
    }
  }
  if (newTab === 'users' && searchKeywords.value) {
    await handleUserSearch()
  }
  if (newTab === 'role' && (roleStore.roles.length === 0 || searchKeywords.value)) {
    try {
      await fetchRolesWithSearch({ page: 1, limit: rolesMeta.value.itemsPerPage })
    } catch (error) {
      console.error('Error fetching roles:', error)
      uiStore.showApiError(error, t('users.management.errors.loadRoles'))
    }
  }

  if (newTab === 'groups' && (groupStore.groups.length === 0 || searchKeywords.value)) {
    try {
      await fetchGroupsWithSearch({ page: 1, limit: groupsMeta.value.itemsPerPage })
    } catch (error) {
      console.error('Error fetching groups:', error)
      uiStore.showApiError(error, t('users.management.errors.loadGroups'))
    }
  }
})

onMounted(async () => {
  try {
    activeTab.value = resolveInitialTab()
    await userStore.initializeOptions()
    await userStore.fetchUsers({ page: 1 })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showApiError(error, t('users.management.errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
})

// Handle pagination change from grid
async function handlePaginationChange({ page, limit, sortBy, orderBy }) {
  isLoading.value = true
  userSortBy.value = sortBy
  userOrderBy.value = orderBy
  try {
    await fetchUsersWithSearch({
      page,
      limit,
      sortBy,
      orderBy,
      isActive: userStatusFilter.value,
      roleId: userRoleFilter.value
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showApiError(error, t('users.management.errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
}

async function handleGroupPaginationChange({ page, limit }) {
  try {
    await fetchGroupsWithSearch({ page, limit })
  } catch (error) {
    console.error('Error fetching groups:', error)
    uiStore.showApiError(error, t('users.management.errors.loadGroups'))
  }
}

async function handleRolePaginationChange({ page, limit }) {
  try {
    await fetchRolesWithSearch({ page, limit })
  } catch (error) {
    console.error('Error fetching roles:', error)
    uiStore.showApiError(error, t('users.management.errors.loadRoles'))
  }
}

async function handleUserFilter({ isActive, roleId }) {
  userStatusFilter.value = isActive
  userRoleFilter.value = roleId
  isLoading.value = true
  try {
    await fetchUsersWithSearch({
      page: 1,
      limit: usersMeta.value.itemsPerPage,
      sortBy: userSortBy.value,
      orderBy: userOrderBy.value,
      isActive: userStatusFilter.value,
      roleId: userRoleFilter.value
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showApiError(error, t('users.management.errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
}

function openAddUserModal() {
  selectedUser.value = null
  showUserFormModal.value = true
}

function openEditUserModal(user) {
  selectedUser.value = user
  showUserFormModal.value = true
}

function handleDeleteUser(user) {
  if (!user?.id) return
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || '-'
  confirm.require({
    dialogType: 'delete',
    header: `${t('common.delete')} ${displayName}`,
    message: t('settings.customFields.delete.message'),
    accept: async () => {
      try {
        const response = await userStore.deleteUser(user.id)
        uiStore.showApiSuccess(response)
      } catch (error) {
        uiStore.showApiError(error)
      }
    }
  })
}

async function handleResendInvite(user) {
  try {
    const response = await userStore.resendInvite(user.id)
    uiStore.showApiSuccess(response)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function handleUserSaved() {
  // Grid will auto-update via reactive store
}

function openInviteModal() {
  showInviteModal.value = true
}

function handleUserInvited() {
  userStore.fetchUsers()
}

// Role handlers
function openAddRoleModal() {
  selectedRole.value = null
  showRoleFormModal.value = true
}

function openEditRoleModal(role) {
  selectedRole.value = role
  showRoleFormModal.value = true
}

function handleDeleteRole(role) {
  if (!role?.id) return
  confirm.require({
    dialogType: 'delete',
    header: `${t('common.delete')} ${role.name || '-'}`,
    message: t('settings.customFields.delete.message'),
    accept: async () => {
      try {
        const response = await roleStore.deleteRole(role.id)
        uiStore.showApiSuccess(response)
      } catch (error) {
        uiStore.showApiError(error)
      }
    }
  })
}

function handleRoleSaved() {
  // Grid will auto-update via reactive store
}

// Group handlers
function openAddGroupModal() {
  selectedGroup.value = null
  showGroupFormModal.value = true
}

function openEditGroupModal(group) {
  selectedGroup.value = group
  showGroupFormModal.value = true
}

function handleDeleteGroup(group) {
  if (!group?.id) return
  confirm.require({
    dialogType: 'delete',
    header: `${t('common.delete')} ${group.name || '-'}`,
    message: t('settings.customFields.delete.message'),
    accept: async () => {
      try {
        const response = await groupStore.deleteGroup(group.id)
        uiStore.showApiSuccess(response)
      } catch (error) {
        uiStore.showApiError(error)
      }
    }
  })
}

function handleGroupSaved() {
  // Grid will auto-update via reactive store
}
</script>

<template>
  <div class="users-view h-full flex flex-col">
    <!-- Header with Sidebar Toggle, Tabs, Actions, and AI Chat -->
    <div class="bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center h-12 pl-1 pr-4">
        <!-- Left: Sidebar Toggle + Tabs -->
        <div class="flex items-center gap-4 h-full">
          <!-- Sidebar Toggle Button -->
          <button
            @click="toggleSidebar"
            class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            title="Toggle sidebar"
          >
            <Menu class="w-5 h-5" />
          </button>
          
          <!-- Tabs -->
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'relative h-full px-1 text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            ]"
          >
            {{ tab.label }}
            <!-- Blue underline indicator -->
            <span
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            ></span>
          </button>
        </div>

        <!-- Right: Search + Actions -->
        <div class="flex items-center gap-3 ml-auto">
          <!-- Search User -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="h-8 pl-9 pr-4 w-40 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <template v-if="activeTab === 'users'">
            <!-- New User Button -->
            <button
              @click="openAddUserModal"
              class="inline-flex items-center gap-1.5 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('users.management.actions.newUser') }}
            </button>

            <!-- Invite User Button -->
            <button
              @click="openInviteModal"
              class="inline-flex items-center gap-1.5 h-8 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              {{ t('users.management.actions.inviteUser') }}
            </button>
          </template>
          <template v-else-if="activeTab === 'groups'">
            <button
              @click="openAddGroupModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('users.management.actions.newGroup') }}
            </button>
          </template>
          <template v-else-if="activeTab === 'role'">
            <button
              @click="openAddRoleModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('users.management.actions.newRole') }}
            </button>
          </template>
          
          <!-- AI Chat Button -->
          <AIChatButton />
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-auto bg-white">
      <!-- Users Tab Content -->
      <div v-if="activeTab === 'users'" class="h-full">
        <UsersGrid
          :users="filteredUsers"
          :meta="usersMeta"
          :roleOptions="userRoleOptions"
          @edit="openEditUserModal"
          @delete="handleDeleteUser"
          @resendInvite="handleResendInvite"
          @filter="handleUserFilter"
          @paginationChange="handlePaginationChange"
        />
      </div>

      <!-- Groups Tab Content -->
      <div v-else-if="activeTab === 'groups'" class="flex flex-col h-full">
        <div class="flex-1">
          <GroupsGrid
            :groups="filteredGroups"
            :meta="groupsMeta"
            @edit="openEditGroupModal"
            @delete="handleDeleteGroup"
            @paginationChange="handleGroupPaginationChange"
          />
        </div>
      </div>

      <!-- Role Tab Content -->
      <div v-else-if="activeTab === 'role'" class="flex flex-col h-full">
        <!-- Grid -->
        <div class="flex-1">
          <RolesGrid
            :roles="filteredRoles"
            :meta="rolesMeta"
            @edit="openEditRoleModal"
            @delete="handleDeleteRole"
            @paginationChange="handleRolePaginationChange"
          />
        </div>
      </div>
    </div>

    <!-- User Form Modal -->
    <UserFormModal
      v-model:visible="showUserFormModal"
      :user="selectedUser"
      @saved="handleUserSaved"
    />

    <!-- Invite User Modal -->
    <InviteUserModal
      v-model:visible="showInviteModal"
      @invited="handleUserInvited"
    />

    <!-- Role Form Modal -->
    <RoleFormModal
      v-model:visible="showRoleFormModal"
      :role="selectedRole"
      @saved="handleRoleSaved"
    />

    <!-- Group Form Modal -->
    <GroupFormModal
      v-model:visible="showGroupFormModal"
      :group="selectedGroup"
      @saved="handleGroupSaved"
    />
  </div>
</template>

<style scoped>
.users-view {
  background-color: #ffffff;
}
</style>
