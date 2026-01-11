<script setup>
/**
 * UsersView - Main users management page
 * 
 * Features:
 * - Tab navigation (Users, Groups, Role)
 * - Search and filter controls
 * - AG Grid table for users list
 * - Add/Edit/Delete user modals
 */
import { ref, computed, onMounted } from 'vue'
import { useUserStore, useUIStore } from '@/stores'
import UsersGrid from '@/modules/user/components/UsersGrid.vue'
import UserFormModal from '@/components/modals/UserFormModal.vue'
import InviteUserModal from '@/components/modals/InviteUserModal.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { Search, Plus, UserPlus, Sparkles, ChevronDown, SlidersHorizontal } from 'lucide-vue-next'

// PrimeVue
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'

const userStore = useUserStore()
const uiStore = useUIStore()

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

// Tab definitions
const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { id: 'role', label: 'Role' }
]

// Filter options
const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'Active', value: 'Active' },
  { label: 'Invited', value: 'Invited' },
  { label: 'Inactive', value: 'Inactive' }
]

const roleOptions = [
  { label: 'All Roles', value: null },
  { label: 'Administrator', value: 'Administrators' },
  { label: 'Project Manager', value: 'Project Managers' },
  { label: 'Team Member', value: 'Team' }
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

// Methods
onMounted(async () => {
  try {
    await userStore.fetchUsers()
  } catch (error) {
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
  // Optionally refresh users list
  userStore.fetchUsers()
}
</script>

<template>
  <div class="users-view p-6 lg:p-8">
    <!-- Header with Tabs and Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <!-- Tabs -->
      <div class="flex items-center gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <InputText
            v-model="searchQuery"
            placeholder="Search user"
            class="pl-9 w-48"
          />
        </div>

        <!-- New User Button -->
        <Button
          @click="openAddUserModal"
          class="!bg-blue-600 hover:!bg-blue-700 !border-blue-600"
        >
          <Plus class="w-4 h-4 mr-1" />
          New User
        </Button>

        <!-- Invite User Button -->
        <Button
          @click="openInviteModal"
          severity="secondary"
          class="!bg-green-600 hover:!bg-green-700 !border-green-600 !text-white"
        >
          <UserPlus class="w-4 h-4 mr-1" />
          Invite User
        </Button>

        <!-- Ask AI Button -->
        <Button
          severity="secondary"
          class="!bg-purple-600 hover:!bg-purple-700 !border-purple-600 !text-white"
        >
          <Sparkles class="w-4 h-4 mr-1" />
          Ask AI
          <ChevronDown class="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>

    <!-- Users Tab Content -->
    <div v-if="activeTab === 'users'">
      <!-- Grid -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <UsersGrid
          :users="filteredUsers"
          @edit="openEditUserModal"
          @delete="openDeleteModal"
          @resendInvite="handleResendInvite"
        />
      </div>

      <!-- Bottom Filters -->
      <div class="flex items-center gap-3 mt-4">
        <span class="text-sm text-gray-500">Filter by</span>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Status
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Role
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- Groups Tab Content (Placeholder) -->
    <div v-else-if="activeTab === 'groups'" class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="text-gray-400 mb-2">
        <svg class="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-1">Groups Management</h3>
      <p class="text-sm text-gray-500">Coming soon - Manage user groups and permissions</p>
    </div>

    <!-- Role Tab Content (Placeholder) -->
    <div v-else-if="activeTab === 'role'" class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="text-gray-400 mb-2">
        <svg class="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-1">Role Management</h3>
      <p class="text-sm text-gray-500">Coming soon - Define roles and access controls</p>
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
  </div>
</template>

<style scoped>
.users-view {
  min-height: calc(100vh - 64px);
  background-color: #f9fafb;
}
</style>
