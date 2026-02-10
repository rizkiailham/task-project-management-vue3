<script setup>
/**
 * RoleFormModal - Modal for creating/editing roles with permissions
 * Uses accordion-style collapsible sections for Details and Access permission
 */
import { ref, computed, watch } from 'vue'
import { useRoleStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'
import Checkbox from 'primevue/checkbox'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  role: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'saved'])

const roleStore = useRoleStore()
const uiStore = useUIStore()
const { t } = useI18n()

// Default permissions structure - matches backend DEFAULT_ROLE_PERMISSIONS
const defaultPermissions = computed(() => ([
  { name: t('users.roleForm.permissions.userManagement'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.rolesAndPermission'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.groupAndTeams'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.userInvitation'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.project'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.projectSettings'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.taskManager'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.taskAssignment'), read: false, write: false, delete: false },
  { name: t('users.roleForm.permissions.workflowConfiguration'), read: false, write: false, delete: false }
]))

// Form state
const formData = ref({
  name: '',
  description: '',
  isAdmin: false,
  permissions: JSON.parse(JSON.stringify(defaultPermissions.value))
})

const isSubmitting = ref(false)

// Accordion state
const detailsExpanded = ref(true)
const permissionsExpanded = ref(false)

// Computed
const isEditing = computed(() => !!props.role?.id)
const modalTitle = computed(() => {
  if (isEditing.value && props.role?.name) {
    return `${t('users.roleForm.titles.manageRole')} - ${props.role.name}`
  }
  return t('users.roleForm.titles.createRole')
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// Watch for role changes to populate form
watch(
  () => props.role,
  (role) => {
    if (role) {
      formData.value = {
        name: role.name || '',
        description: role.description || '',
        isAdmin: role.isAdmin || false,
        permissions: mergePermissions(role.permissions || [])
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Merge existing permissions with defaults
function mergePermissions(existingPermissions) {
  const permMap = new Map()
  
  // Start with defaults
  defaultPermissions.value.forEach(p => {
    permMap.set(p.name.toLowerCase(), { ...p })
  })
  
  // Override with existing permissions from backend
  existingPermissions.forEach(p => {
    const key = p.name?.toLowerCase().trim()
    if (!key) return
    
    if (permMap.has(key)) {
      permMap.set(key, {
        name: permMap.get(key).name,
        read: Boolean(p.read),
        write: Boolean(p.write),
        delete: Boolean(p.delete)
      })
    }
  })
  
  return Array.from(permMap.values())
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    isAdmin: false,
    permissions: JSON.parse(JSON.stringify(defaultPermissions.value))
  }
  detailsExpanded.value = true
  permissionsExpanded.value = false
}

function closeModal() {
  dialogVisible.value = false
  resetForm()
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    uiStore.showError(t('users.roleForm.validation.nameRequired'))
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      isAdmin: formData.value.isAdmin,
      permissions: formData.value.permissions
    }

    if (isEditing.value) {
      const response = await roleStore.updateRole(props.role.id, payload)
      uiStore.showApiSuccess(response, t('users.roleForm.messages.updated'))
    } else {
      const response = await roleStore.createRole(payload)
      uiStore.showApiSuccess(response, t('users.roleForm.messages.created'))
    }

    emit('saved')
    closeModal()
  } catch (error) {
    uiStore.showApiError(error, t('users.roleForm.errors.save'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="modalTitle"
    width="700px"
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    :loading="isSubmitting"
  >
    <template #header>
      <h2 class="text-base font-semibold text-gray-900">{{ modalTitle }}</h2>
    </template>

    <div class="max-h-[60vh] overflow-y-auto -my-5 -mx-6 px-6 pb-5 space-y-0">
      <!-- Details Section (Accordion) -->
      <div class="border-b border-gray-100">
        <button
          type="button"
          @click="detailsExpanded = !detailsExpanded"
          class="w-full flex items-center gap-2 py-3 text-left"
        >
          <ChevronDown 
            class="w-4 h-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !detailsExpanded }"
          />
          <span class="text-sm font-medium text-gray-900">{{ t('users.roleForm.sections.details') }}</span>
        </button>
        
        <div v-show="detailsExpanded" class="pb-4 space-y-4">
          <div>
            <FormInput
              id="role-name"
              v-model="formData.name"
              :label="t('users.roleForm.fields.name')"
              labelClass="block text-xs text-gray-500 mb-1"
              :placeholder="t('users.roleForm.placeholders.name')"
              class="w-full"
            />
          </div>
          <div>
            <FormInput
              id="role-description"
              v-model="formData.description"
              as="textarea"
              :label="t('users.roleForm.fields.description')"
              labelClass="block text-xs text-gray-500 mb-1"
              :placeholder="t('users.roleForm.placeholders.description')"
              rows="3"
              class="w-full text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Access Permission Section (Accordion) -->
      <div>
        <button
          type="button"
          @click="permissionsExpanded = !permissionsExpanded"
          class="w-full flex items-center gap-2 py-3 text-left"
        >
          <ChevronDown 
            class="w-4 h-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !permissionsExpanded }"
          />
          <span class="text-sm font-medium text-gray-900">{{ t('users.roleForm.sections.accessPermission') }}</span>
        </button>
        
        <div v-show="permissionsExpanded" class="pb-4 text-[13px]">
          <!-- Permissions Table - No container -->
          <!-- Header -->
          <div class="grid grid-cols-4 border-b border-gray-200 pb-2 mb-1" style="font-size: 13px;">
            <div class="text-xs text-gray-400">{{ t('users.roleForm.table.section') }}</div>
            <div class="text-xs text-gray-400 text-center">{{ t('users.roleForm.table.read') }}</div>
            <div class="text-xs text-gray-400 text-center">{{ t('users.roleForm.table.write') }}</div>
            <div class="text-xs text-gray-400 text-center">{{ t('users.roleForm.table.delete') }}</div>
          </div>

          <!-- Permission Rows -->
          <div
            v-for="(permission, index) in formData.permissions"
            :key="permission.name"
            class="grid grid-cols-4 items-center py-2.5"
          >
            <div class="text-xs text-gray-700">{{ permission.name }}</div>
            <div class="flex justify-center">
              <Checkbox
                v-model="formData.permissions[index].read"
                :binary="true"
              />
            </div>
            <div class="flex justify-center">
              <Checkbox
                v-model="formData.permissions[index].write"
                :binary="true"
              />
            </div>
            <div class="flex justify-center">
              <Checkbox
                v-model="formData.permissions[index].delete"
                :binary="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
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
          <svg
            v-if="isSubmitting"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSubmitting ? t('common.saving') : t('common.saveChanges') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
