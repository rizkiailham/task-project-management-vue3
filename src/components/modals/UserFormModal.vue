<script setup>
/**
 * UserFormModal - Add/Edit User modal form
 * 
 * Comprehensive form for creating or editing user accounts with:
 * - User information (name, email, phone, etc.)
 * - Project & Access settings
 * - Custom fields section
 */
import { ref, computed, watch } from 'vue'
import { useUserStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Pencil, ChevronDown } from 'lucide-vue-next'
import { upload } from '@/api'

// PrimeVue
import Checkbox from 'primevue/checkbox'
import FormInput from '@/components/ui/FormInput.vue'

const userStore = useUserStore()
const uiStore = useUIStore()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'saved'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isEditMode = computed(() => !!props.user?.id)
const modalTitle = computed(() => isEditMode.value ? 'Edit user' : 'Add user')

// Section expand state
const userInfoExpanded = ref(true)
const projectAccessExpanded = ref(true)
const customFieldsExpanded = ref(true)

// Loading state
const isLoading = ref(false)

// Avatar color (randomly generated for new users)
const avatarColor = ref('#3b82f6')
const avatarUrl = ref('')
const isUploadingAvatar = ref(false)
const avatarInputRef = ref(null)

// Form validation
const validationSchema = computed(() => {
  const baseSchema = {
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().required('Email is required').email('Invalid email format'),
    phone: yup.string(),
    language: yup.string(),
    organization: yup.string(),
    projectIds: yup.array(),
    roleId: yup.mixed().nullable(),
    groupIds: yup.array(),
    isActive: yup.boolean(),
    unit: yup.number().nullable(),
    department: yup.string()
  }

  baseSchema.password = yup
    .string()
    .transform((value) => (value === '' ? undefined : value))
    .min(8, 'Password must be at least 8 characters')
    .notRequired()
  baseSchema.confirmPassword = yup.string().when('password', {
    is: (value) => !!value,
    then: (schema) =>
      schema
        .required('Confirm password is required')
        .oneOf([yup.ref('password')], 'Passwords must match'),
    otherwise: (schema) => schema.notRequired()
  })

  return yup.object(baseSchema)
})

const { handleSubmit, resetForm, setValues } = useForm({
  validationSchema,
  initialValues: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    language: 'English',
    organization: '',
    password: '',
    confirmPassword: '',
    projectIds: [],
    roleId: null,
    groupIds: [],
    isActive: true,
    unit: null,
    department: ''
  }
})

const { value: firstName, errorMessage: firstNameError } = useField('firstName', undefined, {
  validateOnValueUpdate: false
})
const { value: lastName, errorMessage: lastNameError } = useField('lastName', undefined, {
  validateOnValueUpdate: false
})
const { value: email, errorMessage: emailError } = useField('email', undefined, {
  validateOnValueUpdate: false
})
const { value: phone } = useField('phone')
const { value: language } = useField('language')
const { value: organization } = useField('organization')
const { value: password, errorMessage: passwordError } = useField('password', undefined, {
  validateOnValueUpdate: false
})
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword', undefined, {
  validateOnValueUpdate: false
})
const { value: projectIds } = useField('projectIds')
const { value: roleId } = useField('roleId')
const { value: groupIds } = useField('groupIds')
const { value: isActive } = useField('isActive')
const { value: unit } = useField('unit')
const { value: department } = useField('department')

function formatRoleName(name) {
  if (name === 'super_admin') return 'Super Admin'
  return name
}

// Computed options for dropdowns
const projectOptions = computed(() => 
  userStore.availableProjects.map(p => ({ label: p.name, value: p.id }))
)
const roleOptions = computed(() => 
  userStore.availableRoles.map(role => ({ label: formatRoleName(role.name), value: role.id }))
)
const groupOptions = computed(() => 
  userStore.availableGroups.map(g => ({ label: g.name, value: g.id }))
)
const languageOptions = computed(() => 
  userStore.availableLanguages.map(l => ({ label: l, value: l }))
)

// Last login text for display
const lastLoginText = computed(() => {
  if (!props.user?.lastActivity) return ''
  const date = new Date(props.user.lastActivity)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

// Watch for modal opening and populate form
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    await userStore.initializeOptions()
    if (props.user) {
      // Edit mode - populate form with user data
      resetForm({
        values: {
        firstName: props.user.firstName || '',
        lastName: props.user.lastName || '',
        email: props.user.email || '',
        phone: props.user.phone || '',
        language: props.user.language || 'English',
        organization: props.user.organization || '',
        password: '',
        confirmPassword: '',
        projectIds: normalizeSelectionArray(props.user.projects),
        roleId: resolveSelectionId(props.user.roleId || props.user.role, userStore.availableRoles),
        groupIds: normalizeSelectionArray(props.user.groups),
        isActive: props.user.isActive ?? true,
        unit: props.user.customValues?.unit || null,
        department: props.user.customValues?.department || ''
        }
      })
      avatarColor.value = props.user.avatarColor || '#3b82f6'
      avatarUrl.value = props.user.avatar || props.user.avatarUrl || props.user.avatar_url || ''
    } else {
      // Add mode - reset form
      resetForm()
      avatarColor.value = getRandomColor()
      avatarUrl.value = ''
    }
  }
})

function getRandomColor() {
  const colors = [
    '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#a855f7', '#6366f1', '#f43f5e'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

const avatarPreview = computed(() => avatarUrl.value)

function triggerAvatarSelect() {
  if (isUploadingAvatar.value) return
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
    avatarInputRef.value.click()
  }
}

async function handleAvatarChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return

  isUploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await upload('/upload', formData)
    const url =
      (typeof response === 'string' && response) ||
      response?.url ||
      response?.data?.url ||
      response?.path ||
      response?.data?.path

    if (!url) {
      throw new Error('Upload failed')
    }

    avatarUrl.value = url
  } catch (error) {
    uiStore.showError('Failed to upload avatar')
  } finally {
    isUploadingAvatar.value = false
  }
}

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const resolvedProjectIds = resolveSelectionIds(values.projectIds, userStore.availableProjects)
    const resolvedRoleId = resolveSelectionId(values.roleId, userStore.availableRoles)
    const resolvedGroupIds = resolveSelectionIds(values.groupIds, userStore.availableGroups)
    const userData = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      language: values.language,
      organization: values.organization,
      projectIds: resolvedProjectIds,
      groupIds: resolvedGroupIds,
      isActive: values.isActive,
      customValues: {
        ...(values.unit !== null && { unit: values.unit }),
        ...(values.department && { department: values.department })
      }
    }
    if (resolvedRoleId !== null && resolvedRoleId !== undefined) {
      userData.roleId = resolvedRoleId
    }

    // Only send password if provided
    if (values.password) {
      userData.password = values.password
    }
    if (avatarUrl.value) {
      userData.avatar = avatarUrl.value
    }

    if (isEditMode.value) {
      await userStore.updateUser(props.user.id, userData)
      uiStore.showSuccess('User updated successfully')
    } else {
      await userStore.createUser(userData)
      uiStore.showSuccess('User created successfully')
    }
    
    // Refresh users list
    await userStore.fetchUsers()
    
    emit('saved')
    dialogVisible.value = false
  } catch (error) {
    uiStore.showError(isEditMode.value ? 'Failed to update user' : 'Failed to create user')
  } finally {
    isLoading.value = false
  }
})

function closeModal() {
  dialogVisible.value = false
}

function resolveSelectionIds(values, options) {
  if (!Array.isArray(values) || values.length === 0) return []
  return values
    .map((value) => resolveSelectionId(value, options))
    .filter(Boolean)
}

function resolveSelectionId(value, options) {
  if (!value) return null
  if (typeof value === 'object' && value.id) return value.id
  if (typeof value === 'string' || typeof value === 'number') {
    const matched = (options || []).find(option =>
      option?.id === value || option?.value === value || option?.name === value
    )
    return matched?.id || matched?.value || value
  }
  return null
}

function normalizeSelectionArray(values) {
  if (!values) return []
  const list = Array.isArray(values) ? values : [values]
  return list
    .map((item) => item?.id || item?.value || item)
    .filter(Boolean)
}

// Get initials for avatar
const avatarInitial = computed(() => {
  if (firstName.value) {
    return firstName.value.charAt(0).toUpperCase()
  }
  return 'U'
})
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="modalTitle"
    width="800px"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :loading="isLoading"
  >
    <template #header>
      <h2 class="text-base font-medium text-gray-900">{{ modalTitle }}</h2>
    </template>

    <form
      @submit.prevent="onSubmit"
      class="user-form max-h-[60vh] overflow-y-auto -my-5 -mx-6 px-6 py-5 space-y-4"
    >
      <!-- Avatar Section -->
      <div class="pt-4 pb-5">
        <div class="relative inline-flex">
          <div
            class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold text-white"
            :style="{ backgroundColor: avatarColor }"
          >
            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              alt="User avatar"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ avatarInitial }}</span>
          </div>
          <button
            type="button"
            class="cursor-pointer absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isUploadingAvatar"
            @click="triggerAvatarSelect"
          >
            <Pencil class="h-3 w-3 text-gray-500" />
          </button>
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleAvatarChange"
          />
        </div>
      </div>

      <!-- User Information Section -->
      <div>
        <button
          type="button"
          @click="userInfoExpanded = !userInfoExpanded"
          class="flex items-center gap-2 py-2 text-sm font-medium text-gray-900 transition-colors hover:text-gray-700"
        >
          <ChevronDown
            class="h-4 w-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !userInfoExpanded }"
          />
          <span>User information</span>
        </button>

        <div v-show="userInfoExpanded" class="space-y-4 pt-2">
          <!-- Name Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col">
              <FormInput
                id="user-first-name"
                v-model="firstName"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                :class="{ 'p-invalid': firstNameError }"
              >
                <template #label>
                  First name <span class="text-red-500">*</span>
                </template>
              </FormInput>
              <small v-if="firstNameError" class="mt-1 text-xs text-red-500">
                {{ firstNameError }}
              </small>
            </div>
            <div class="flex flex-col">
              <FormInput
                id="user-last-name"
                v-model="lastName"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                :class="{ 'p-invalid': lastNameError }"
              >
                <template #label>
                  Last name <span class="text-red-500">*</span>
                </template>
              </FormInput>
              <small v-if="lastNameError" class="mt-1 text-xs text-red-500">
                {{ lastNameError }}
              </small>
            </div>
          </div>

          <!-- Email & Phone Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col">
              <FormInput
                id="user-email"
                v-model="email"
                type="email"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                :class="{ 'p-invalid': emailError }"
              >
                <template #label>
                  Email <span class="text-red-500">*</span>
                </template>
              </FormInput>
              <small v-if="emailError" class="mt-1 text-xs text-red-500">
                {{ emailError }}
              </small>
            </div>
            <div class="flex flex-col">
              <FormInput
                id="user-phone"
                v-model="phone"
                label="Phone"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
              />
            </div>
          </div>

          <!-- Language & Organization Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col">
              <FormInput
                id="user-language"
                v-model="language"
                as="select"
                label="Preferered language"
                labelClass="mb-1.5 text-xs text-gray-500"
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>
            <div class="flex flex-col">
              <FormInput
                id="user-organization"
                v-model="organization"
                label="Organization"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
              />
            </div>
          </div>

          <!-- Password Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col">
              <FormInput
                id="user-password"
                v-model="password"
                as="password"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                inputClass="w-full"
                :class="{ 'p-invalid': passwordError }"
                :feedback="false"
                toggleMask
              >
                <template #label>
                  Password
                </template>
              </FormInput>
              <small v-if="passwordError" class="mt-1 text-xs text-red-500">
                {{ passwordError }}
              </small>
            </div>
            <div class="flex flex-col">
              <FormInput
                id="user-confirm-password"
                v-model="confirmPassword"
                as="password"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
                inputClass="w-full"
                :class="{ 'p-invalid': confirmPasswordError }"
                :feedback="false"
                toggleMask
              >
                <template #label>
                  Confirm Password
                </template>
              </FormInput>
              <small
                v-if="confirmPasswordError"
                class="mt-1 text-xs text-red-500"
              >
                {{ confirmPasswordError }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Project & Access Section -->
      <div>
        <button
          type="button"
          @click="projectAccessExpanded = !projectAccessExpanded"
          class="flex items-center gap-2 py-2 text-sm font-medium text-gray-900 transition-colors hover:text-gray-700"
        >
          <ChevronDown
            class="h-4 w-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !projectAccessExpanded }"
          />
          <span>Project & Access</span>
        </button>

        <div v-show="projectAccessExpanded" class="space-y-4 pt-2">
          <!-- Project & Group Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col">
                <label class="mb-1.5 text-xs text-gray-500">Project(s)</label>
                <FormInput
                  v-model="projectIds"
                  as="multiselect"
                  :options="projectOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select project(s)"
                  display="comma"
                  filter
                  filterPlaceholder="Search..."
                  class="w-full"
                />
              </div>
              <div class="flex flex-col">
                <label class="mb-1.5 text-xs text-gray-500">Role</label>
                <FormInput
                  id="user-role"
                  v-model="roleId"
                  as="select"
                  :options="roleOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select role"
                  class="w-full"
                />
              </div>
            </div>
            <div class="flex flex-col">
              <label class="mb-1.5 text-xs text-gray-500">Group(s)</label>
              <FormInput
                v-model="groupIds"
                as="multiselect"
                :options="groupOptions"
                :checkboxIcon="false"
                optionLabel="label"
                optionValue="value"
                placeholder="Select group(s)"
                display="comma"
                filter
                filterPlaceholder="Search..."
                class="w-full"
              />
            </div>
          </div>

          <!-- Active Checkbox -->
          <div class="flex items-center gap-2 pt-1">
            <Checkbox v-model="isActive" :binary="true" inputId="isActive" />
            <label for="isActive" class="text-sm text-gray-700 cursor-pointer">
              Active
            </label>
            <span v-if="lastLoginText" class="ml-2 text-xs text-gray-400">
              Last login: {{ lastLoginText }}
            </span>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <div>
        <button
          type="button"
          @click="customFieldsExpanded = !customFieldsExpanded"
          class="flex items-center gap-2 py-2 text-sm font-medium text-gray-900 transition-colors hover:text-gray-700"
        >
          <ChevronDown
            class="h-4 w-4 text-gray-500 transition-transform"
            :class="{ '-rotate-90': !customFieldsExpanded }"
          />
          <span>Custom field(s)</span>
        </button>

        <div v-show="customFieldsExpanded" class="space-y-4 pt-2">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col">
              <FormInput
                id="user-unit"
                v-model="unit"
                as="number"
                label="Unit"
                labelClass="mb-1.5 text-xs text-gray-500"
                showButtons
                :min="0"
                class="w-full"
                inputClass="w-full"
              />
            </div>
            <div class="flex flex-col">
              <FormInput
                id="user-department"
                v-model="department"
                label="Department"
                labelClass="mb-1.5 text-xs text-gray-500"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="closeModal"
          :disabled="isLoading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          @click="onSubmit"
          :disabled="isLoading"
        >
          <svg
            v-if="isLoading"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? 'Saving...' : 'Save changes' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.user-form :deep(.p-inputnumber-input) {
  border-radius: 6px 0 0 6px;
}

.user-form :deep(.p-inputnumber-button) {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.user-form :deep(.p-inputnumber-button:hover) {
  background: #f3f4f6;
}

.user-form :deep(.p-checkbox .p-checkbox-box) {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
}

.user-form :deep(.p-multiselect) {
  width: 100%;
}

.user-form :deep(.p-multiselect-label) {
  padding: 10px 12px;
}
</style>
