<script setup>
/**
 * UsersView - Main users management page
 * 
 * Now uses global Topbar from AppLayout for consistent AI Chat sidebar handling.
 * Contains sub-header with tabs, search, and action buttons.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore, useUIStore, useRoleStore } from '@/stores'
import UsersGrid from '@/modules/user/components/UsersGrid.vue'
import RolesGrid from '@/modules/user/components/RolesGrid.vue'
import UserFormModal from '@/components/modals/UserFormModal.vue'
import InviteUserModal from '@/components/modals/InviteUserModal.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import RoleFormModal from '@/components/modals/RoleFormModal.vue'
import { Search, Plus, UserPlus, SlidersHorizontal, Settings, Users } from 'lucide-vue-next'

const userStore = useUserStore()
const uiStore = useUIStore()
const roleStore = useRoleStore()

// State
const activeTab = ref('users')
const searchQuery = ref('')
const statusFilter = ref(null)
const roleFilter = ref(null)
const isLoading = ref(true)

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

// Tab definitions
const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { id: 'role', label: 'Role' }
]

// Computed
const filteredUsers = computed(() => {
  let users = [...userStore.users]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    users = users.filter(u => 
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (statusFilter.value) {
    users = users.filter(u => u.status === statusFilter.value)
  }

  // Role filter
  if (roleFilter.value) {
    users = users.filter(u => u.groups?.includes(roleFilter.value))
  }

  return users
})

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
})

onMounted(async () => {
  try {
    await userStore.fetchUsers()
  } catch (error) {
    console.error('Error fetching users:', error)
    uiStore.showError('Failed to load users')
  } finally {
    isLoading.value = false
  }
})

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
</script>

<template>
  <div class="users-view h-full flex flex-col">
    <!-- Sub-header with Tabs and Actions (below global Topbar) -->
    <div class="bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center h-12 px-4">
        <!-- Left: Tabs -->
        <div class="flex items-center gap-4 h-full">
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
              placeholder="Search user"
              class="h-8 pl-9 pr-4 w-40 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <!-- New User Button -->
          <button
            @click="openAddUserModal"
            class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus class="w-4 h-4" />
          </button>

          <!-- Invite User Button -->
          <button
            @click="openInviteModal"
            class="inline-flex items-center gap-1.5 h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <UserPlus class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-auto bg-white">
      <!-- Users Tab Content -->
      <div v-if="activeTab === 'users'" class="flex flex-col h-full">
        <!-- Grid -->
        <div class="flex-1">
          <UsersGrid
            :users="filteredUsers"
            @edit="openEditUserModal"
            @delete="openDeleteModal"
            @resendInvite="handleResendInvite"
          />
        </div>

        <!-- Bottom Bar: Filters on left, Pagination on right -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <!-- Left: Filters -->
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">Filter by</span>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Settings class="w-4 h-4 text-gray-400" />
              Status
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Users class="w-4 h-4 text-gray-400" />
              Role
            </button>
            <button
              class="inline-flex items-center p-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal class="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <!-- Right: Custom Pagination -->
          <div class="flex items-center gap-2">
            <!-- First/Prev -->
            <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>
            <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <!-- Page Numbers -->
            <div class="flex items-center gap-1">
              <button class="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-900 bg-gray-100 rounded">1</button>
              <button class="w-8 h-8 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 rounded">2</button>
              <button class="w-8 h-8 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 rounded">3</button>
              <button class="w-8 h-8 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 rounded">4</button>
              <button class="w-8 h-8 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 rounded">5</button>
            </div>

            <!-- Next/Last -->
            <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>

            <!-- Page Size -->
            <div class="ml-2 flex items-center">
              <select class="h-8 px-2 pr-7 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer">
                <option>20</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Groups Tab Content (Placeholder) -->
      <div v-else-if="activeTab === 'groups'" class="flex items-center justify-center h-full bg-white">
        <div class="text-center">
          <div class="text-gray-400 mb-2">
            <Users class="w-12 h-12 mx-auto" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">Groups Management</h3>
          <p class="text-sm text-gray-500">Coming soon - Manage user groups and permissions</p>
        </div>
      </div>

      <!-- Role Tab Content -->
      <div v-else-if="activeTab === 'role'" class="flex flex-col h-full">
        <!-- Role Header Actions -->
        <div class="flex items-center justify-end px-4 py-3 border-b border-gray-200">
          <button
            @click="openAddRoleModal"
            class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus class="w-4 h-4" />
            New Role
          </button>
        </div>

        <!-- Grid -->
        <div class="flex-1">
          <RolesGrid
            :roles="roleStore.roles"
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
  </div>
</template>

<style scoped>
.users-view {
  background-color: #ffffff;
}
</style>
