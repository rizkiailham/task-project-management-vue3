<script setup>
/**
 * UserFormModal - Add/Edit User modal form
 * 
 * Comprehensive form for creating or editing user accounts with:
 * - User information (name, email, phone, etc.)
 * - Project & Access settings
 * - Custom fields section
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore, useUIStore, useProjectStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import BaseModal from '@/components/ui/BaseModal.vue'
import { User, Pencil, ChevronDown, ChevronUp } from 'lucide-vue-next'

// PrimeVue
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import Password from 'primevue/password'

const userStore = useUserStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()

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
const customFieldsExpanded = ref(false)

// Loading state
const isLoading = ref(false)

// Avatar color (randomly generated for new users)
const avatarColor = ref('#3b82f6')

// Form validation
const validationSchema = computed(() => {
  const baseSchema = {
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().required('Email is required').email('Invalid email format'),
    phone: yup.string(),
    language: yup.string(),
    organization: yup.string(),
    roleId: yup.string().required('Role is required'),
    projectIds: yup.array(),
    groupIds: yup.array(),
    isActive: yup.boolean(),
    unit: yup.string()
  }

  // Only require password for new users
  if (!isEditMode.value) {
    baseSchema.password = yup.string().required('Password is required').min(8, 'Password must be at least 8 characters')
    baseSchema.confirmPassword = yup.string()
      .required('Confirm password is required')
      .oneOf([yup.ref('password')], 'Passwords must match')
  } else {
    baseSchema.password = yup.string().min(8, 'Password must be at least 8 characters')
    baseSchema.confirmPassword = yup.string()
      .oneOf([yup.ref('password')], 'Passwords must match')
  }

  return yup.object(baseSchema)
})

const { handleSubmit, meta, resetForm, setValues } = useForm({
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
    roleId: '',
    projectIds: [],
    groupIds: [],
    isActive: true,
    unit: ''
  }
})

const { value: firstName, errorMessage: firstNameError } = useField('firstName')
const { value: lastName, errorMessage: lastNameError } = useField('lastName')
const { value: email, errorMessage: emailError } = useField('email')
const { value: phone } = useField('phone')
const { value: language } = useField('language')
const { value: organization } = useField('organization')
const { value: password, errorMessage: passwordError } = useField('password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField('confirmPassword')
const { value: roleId, errorMessage: roleError } = useField('roleId')
const { value: projectIds } = useField('projectIds')
const { value: groupIds } = useField('groupIds')
const { value: isActive } = useField('isActive')
const { value: unit } = useField('unit')

// Computed options for dropdowns
const roleOptions = computed(() => 
  userStore.availableRoles.map(r => ({ label: r.name, value: r.id }))
)
const groupOptions = computed(() => 
  userStore.availableGroups.map(g => ({ label: g.name, value: g.id }))
)
const projectOptions = computed(() => 
  userStore.availableProjects.map(p => ({ label: p.name, value: p.id }))
)

// Watch for modal opening and populate form
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    // Fetch dropdown options
    await userStore.initializeOptions()
    
    if (props.user) {
      // Edit mode - populate form with user data
      setValues({
        firstName: props.user.firstName || '',
        lastName: props.user.lastName || '',
        email: props.user.email || '',
        phone: props.user.phone || '',
        language: props.user.language || 'English',
        organization: props.user.organization || '',
        password: '',
        confirmPassword: '',
        roleId: props.user.roleId || props.user.role?.id || '',
        projectIds: props.user.projects?.map(p => p.id || p) || [],
        groupIds: props.user.groups?.map(g => g.id || g) || [],
        isActive: props.user.isActive ?? true,
        unit: props.user.customValues?.unit || ''
      })
      avatarColor.value = props.user.avatarColor || '#3b82f6'
    } else {
      // Add mode - reset form
      resetForm()
      avatarColor.value = getRandomColor()
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

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const userData = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      language: values.language,
      organization: values.organization,
      roleId: values.roleId,
      groupIds: values.groupIds,
      projectIds: values.projectIds,
      isActive: values.isActive,
      customValues: values.unit ? { unit: values.unit } : {}
    }

    // Only send password if provided
    if (values.password) {
      userData.password = values.password
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
    width="520px"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :loading="isLoading"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-base font-semibold text-gray-900">{{ modalTitle }}</h2>
      </div>
    </template>

    <form @submit.prevent="onSubmit" class="space-y-4 -mx-2 px-2 max-h-[60vh] overflow-y-auto">
      <!-- Avatar Section -->
      <div class="flex justify-center py-4">
        <div class="relative">
          <div 
            class="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
            :style="{ backgroundColor: avatarColor }"
          >
            {{ avatarInitial }}
          </div>
          <button
            type="button"
            class="absolute bottom-0 right-0 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Pencil class="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      <!-- User Information Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          @click="userInfoExpanded = !userInfoExpanded"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span class="text-sm font-medium text-gray-900">User information</span>
          <ChevronDown v-if="!userInfoExpanded" class="w-4 h-4 text-gray-500" />
          <ChevronUp v-else class="w-4 h-4 text-gray-500" />
        </button>
        
        <div v-show="userInfoExpanded" class="p-4 space-y-4">
          <!-- Name Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                First name <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="firstName"
                class="w-full"
                :class="{ 'p-invalid': firstNameError }"
                placeholder="Enter your full name"
              />
              <small v-if="firstNameError" class="mt-1 block text-xs text-red-500">{{ firstNameError }}</small>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                Last name <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="lastName"
                class="w-full"
                :class="{ 'p-invalid': lastNameError }"
                placeholder="Your last name"
              />
              <small v-if="lastNameError" class="mt-1 block text-xs text-red-500">{{ lastNameError }}</small>
            </div>
          </div>

          <!-- Email & Phone Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                Email <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="email"
                type="email"
                class="w-full"
                :class="{ 'p-invalid': emailError }"
                placeholder="name@example.com"
              />
              <small v-if="emailError" class="mt-1 block text-xs text-red-500">{{ emailError }}</small>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Phone</label>
              <InputText
                v-model="phone"
                class="w-full"
                placeholder="+1 2354687"
              />
            </div>
          </div>

          <!-- Language & Organization Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Preferred language</label>
              <Select
                v-model="language"
                :options="userStore.availableLanguages"
                class="w-full"
                placeholder="Select language"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Organization</label>
              <InputText
                v-model="organization"
                class="w-full"
                placeholder="Company, school or union name"
              />
            </div>
          </div>

          <!-- Password Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                Password {{ isEditMode ? '' : '*' }}
              </label>
              <Password
                v-model="password"
                class="w-full"
                :class="{ 'p-invalid': passwordError }"
                :feedback="false"
                toggleMask
                :placeholder="isEditMode ? 'Leave blank to keep current' : '••••••••'"
              />
              <small v-if="passwordError" class="mt-1 block text-xs text-red-500">{{ passwordError }}</small>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                Confirm Password {{ isEditMode ? '' : '*' }}
              </label>
              <Password
                v-model="confirmPassword"
                class="w-full"
                :class="{ 'p-invalid': confirmPasswordError }"
                :feedback="false"
                toggleMask
                placeholder="••••••••"
              />
              <small v-if="confirmPasswordError" class="mt-1 block text-xs text-red-500">{{ confirmPasswordError }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Project & Access Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          @click="projectAccessExpanded = !projectAccessExpanded"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span class="text-sm font-medium text-gray-900">Project & Access</span>
          <ChevronDown v-if="!projectAccessExpanded" class="w-4 h-4 text-gray-500" />
          <ChevronUp v-else class="w-4 h-4 text-gray-500" />
        </button>
        
        <div v-show="projectAccessExpanded" class="p-4 space-y-4">
          <!-- Role Row -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">
              Role <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="roleId"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              :class="{ 'p-invalid': roleError }"
              placeholder="Select role..."
            />
            <small v-if="roleError" class="mt-1 block text-xs text-red-500">{{ roleError }}</small>
          </div>

          <!-- Project & Group Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Project</label>
              <MultiSelect
                v-model="projectIds"
                :options="projectOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Select project(s)..."
                :maxSelectedLabels="2"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Group</label>
              <MultiSelect
                v-model="groupIds"
                :options="groupOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Select group(s)..."
                filter
                filterPlaceholder="Search for group"
                :maxSelectedLabels="2"
              />
            </div>
          </div>

          <!-- Active Checkbox -->
          <div class="flex items-center gap-2">
            <Checkbox v-model="isActive" :binary="true" inputId="isActive" />
            <label for="isActive" class="text-sm text-gray-700 cursor-pointer">Active</label>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          @click="customFieldsExpanded = !customFieldsExpanded"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span class="text-sm font-medium text-gray-900">Custom field(s)</span>
          <ChevronDown v-if="!customFieldsExpanded" class="w-4 h-4 text-gray-500" />
          <ChevronUp v-else class="w-4 h-4 text-gray-500" />
        </button>
        
        <div v-show="customFieldsExpanded" class="p-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Unit</label>
            <InputText
              v-model="unit"
              class="w-full"
              placeholder="Enter unit"
            />
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="closeModal"
          :disabled="isLoading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="onSubmit"
          :disabled="isLoading"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}

:deep(.p-multiselect) {
  width: 100%;
}
</style>
