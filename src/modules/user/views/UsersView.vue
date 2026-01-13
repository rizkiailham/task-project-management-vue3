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
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import RoleFormModal from '@/components/modals/RoleFormModal.vue'
import GroupFormModal from '@/components/modals/GroupFormModal.vue'
import { Search, Plus, UserPlus, Menu } from 'lucide-vue-next'
import AIChatButton from '@/components/ai/AIChatButton.vue'

const userStore = useUserStore()
const uiStore = useUIStore()
const roleStore = useRoleStore()
const groupStore = useGroupStore()

// State
const activeTab = ref('users')
const searchQuery = ref('')
const statusFilter = ref(null)
const roleFilter = ref(null)
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
const showDeleteModal = ref(false)
const selectedUser = ref(null)
const isDeleting = ref(false)

// Role modal states
const showRoleFormModal = ref(false)
const showRoleDeleteModal = ref(false)
const selectedRole = ref(null)
const isDeletingRole = ref(false)

// Group modal states
const showGroupFormModal = ref(false)
const showGroupDeleteModal = ref(false)
const selectedGroup = ref(null)
const isDeletingGroup = ref(false)

// Tab definitions
const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { id: 'role', label: 'Role' }
]

// Computed
const searchPlaceholder = computed(() => {
  if (activeTab.value === 'groups') return 'Search group'
  if (activeTab.value === 'role') return 'Search role'
  return 'Search user'
})

const filteredUsers = computed(() => {
  let users = [...userStore.users]

  // Search filter (client-side for quick filtering)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    users = users.filter(u => 
      u.firstName?.toLowerCase().includes(query) ||
      u.lastName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    )
  }

  return users
})

const filteredRoles = computed(() => {
  let roles = [...roleStore.roles]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    roles = roles.filter(role =>
      role.name?.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query)
    )
  }

  return roles
})

const filteredGroups = computed(() => {
  let groups = [...groupStore.groups]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    groups = groups.filter(group =>
      group.name?.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    )
  }

  return groups
})

// Users meta data for pagination (from store)
const usersMeta = computed(() => ({
  currentPage: userStore.pagination.page,
  totalPages: userStore.pagination.totalPages,
  itemsPerPage: userStore.pagination.limit,
  totalItems: userStore.pagination.total
}))

// Watch for tab changes to fetch data
watch(activeTab, async (newTab) => {
  if (newTab === 'role' && roleStore.roles.length === 0) {
    try {
      await roleStore.fetchRoles()
    } catch (error) {
      console.error('Error fetching roles:', error)
      uiStore.showError('Failed to load roles')
    }
  }

  if (newTab === 'groups' && groupStore.groups.length === 0) {
    try {
      await groupStore.fetchGroups()
    } catch (error) {
      console.error('Error fetching groups:', error)
      uiStore.showError('Failed to load groups')
    }
  }
})

onMounted(async () => {
  try {
    await userStore.fetchUsers({ page: 1, limit: 10 })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showError('Failed to load users')
  } finally {
    isLoading.value = false
  }
})

// Handle pagination change from grid
async function handlePaginationChange({ page, limit, sortBy, orderBy }) {
  isLoading.value = true
  try {
    await userStore.fetchUsers({
      page,
      limit,
      sortBy,
      orderBy
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showError('Failed to load users')
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

function openDeleteModal(user) {
  selectedUser.value = user
  showDeleteModal.value = true
}

async function handleDeleteUser() {
  if (!selectedUser.value) return
  
  isDeleting.value = true
  try {
    await userStore.deleteUser(selectedUser.value.id)
    uiStore.showSuccess('User deleted successfully')
    showDeleteModal.value = false
    selectedUser.value = null
  } catch (error) {
    uiStore.showError('Failed to delete user')
  } finally {
    isDeleting.value = false
  }
}

async function handleResendInvite(user) {
  try {
    await userStore.resendInvite(user.id)
    uiStore.showSuccess('Invitation email resent successfully')
  } catch (error) {
    uiStore.showError('Failed to resend invitation')
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

function openRoleDeleteModal(role) {
  selectedRole.value = role
  showRoleDeleteModal.value = true
}

async function handleDeleteRole() {
  if (!selectedRole.value) return
  
  isDeletingRole.value = true
  try {
    await roleStore.deleteRole(selectedRole.value.id)
    uiStore.showSuccess('Role deleted successfully')
    showRoleDeleteModal.value = false
    selectedRole.value = null
  } catch (error) {
    uiStore.showError('Failed to delete role')
  } finally {
    isDeletingRole.value = false
  }
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

function openGroupDeleteModal(group) {
  selectedGroup.value = group
  showGroupDeleteModal.value = true
}

async function handleDeleteGroup() {
  if (!selectedGroup.value) return

  isDeletingGroup.value = true
  try {
    await groupStore.deleteGroup(selectedGroup.value.id)
    uiStore.showSuccess('Group deleted successfully')
    showGroupDeleteModal.value = false
    selectedGroup.value = null
  } catch (error) {
    uiStore.showError('Failed to delete group')
  } finally {
    isDeletingGroup.value = false
  }
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
              New User
            </button>

            <!-- Invite User Button -->
            <button
              @click="openInviteModal"
              class="inline-flex items-center gap-1.5 h-8 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Invite User
            </button>
          </template>
          <template v-else-if="activeTab === 'groups'">
            <button
              @click="openAddGroupModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              New Group
            </button>
          </template>
          <template v-else-if="activeTab === 'role'">
            <button
              @click="openAddRoleModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              New Role
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
          @edit="openEditUserModal"
          @delete="openDeleteModal"
          @resendInvite="handleResendInvite"
          @paginationChange="handlePaginationChange"
        />
      </div>

      <!-- Groups Tab Content -->
      <div v-else-if="activeTab === 'groups'" class="flex flex-col h-full">
        <div class="flex-1">
          <GroupsGrid
            :groups="filteredGroups"
            @edit="openEditGroupModal"
            @delete="openGroupDeleteModal"
          />
        </div>
      </div>

      <!-- Role Tab Content -->
      <div v-else-if="activeTab === 'role'" class="flex flex-col h-full">
        <!-- Grid -->
        <div class="flex-1">
          <RolesGrid
            :roles="filteredRoles"
            @edit="openEditRoleModal"
            @delete="openRoleDeleteModal"
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

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      v-model:visible="showDeleteModal"
      :title="`Delete ${selectedUser?.firstName} ${selectedUser?.lastName}`"
      :loading="isDeleting"
      @confirm="handleDeleteUser"
      @cancel="showDeleteModal = false"
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

    <!-- Role Delete Confirmation Modal -->
    <DeleteConfirmModal
      v-model:visible="showRoleDeleteModal"
      :title="`Delete role: ${selectedRole?.name}`"
      :loading="isDeletingRole"
      @confirm="handleDeleteRole"
      @cancel="showRoleDeleteModal = false"
    />

    <!-- Group Form Modal -->
    <GroupFormModal
      v-model:visible="showGroupFormModal"
      :group="selectedGroup"
      @saved="handleGroupSaved"
    />

    <!-- Group Delete Confirmation Modal -->
    <DeleteConfirmModal
      v-model:visible="showGroupDeleteModal"
      :title="`Delete ${selectedGroup?.name}`"
      message="This action will permanently delete the group. User accounts within the group will remain unaffected."
      :loading="isDeletingGroup"
      @confirm="handleDeleteGroup"
      @cancel="showGroupDeleteModal = false"
    />
  </div>
</template>

<style scoped>
.users-view {
  background-color: #ffffff;
}
</style>
