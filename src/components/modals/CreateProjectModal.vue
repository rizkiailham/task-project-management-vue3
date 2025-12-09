<script setup>
/**
 * CreateProjectModal - Modal for creating new projects
 */
import { ref, computed, watch } from 'vue'
import { useProjectStore, useWorkspaceStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ColorPicker from 'primevue/colorpicker'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()

// Modal visibility
const visible = computed({
  get: () => uiStore.activeModal === 'createProject',
  set: (val) => { if (!val) uiStore.closeModal() }
})

const isLoading = ref(false)
const color = ref('6366f1')

// Form validation
const validationSchema = yup.object({
  name: yup.string().required('Project name is required').min(2, 'Name must be at least 2 characters'),
  description: yup.string()
})

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema,
  initialValues: {
    name: '',
    description: ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: description } = useField('description')

// Watch for modal visibility
watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm()
    color.value = '6366f1'
  }
})

// Methods
const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await projectStore.createNewProject({
      ...values,
      color: `#${color.value}`,
      workspaceId: workspaceStore.currentWorkspaceId
    })
    uiStore.showSuccess('Project created successfully')
    uiStore.closeModal()
  } catch (error) {
    uiStore.showError('Failed to create project')
  } finally {
    isLoading.value = false
  }
})

function closeModal() {
  uiStore.closeModal()
}

// Preset colors
const presetColors = [
  '6366f1', // Indigo
  '8b5cf6', // Violet
  'ec4899', // Pink
  'ef4444', // Red
  'f97316', // Orange
  'eab308', // Yellow
  '22c55e', // Green
  '14b8a6', // Teal
  '06b6d4', // Cyan
  '3b82f6'  // Blue
]
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :style="{ width: '450px', maxWidth: '95vw' }"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    class="create-project-modal"
    :pt="{
      root: { class: 'rounded-xl overflow-hidden shadow-2xl border-0' },
      header: { class: 'bg-white border-b border-gray-200 px-6 py-4' },
      content: { class: 'bg-white px-6 py-5' },
      footer: { class: 'bg-gray-50 border-t border-gray-200 px-6 py-4' },
      mask: { class: 'bg-black/40' }
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
          <svg class="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Create New Project</h2>
          <p class="text-sm text-gray-500">Add a new project to your workspace</p>
        </div>
      </div>
    </template>

    <form @submit="onSubmit" class="space-y-5">
      <!-- Name -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Project Name <span class="text-orange-500">*</span>
        </label>
        <InputText
          v-model="name"
          class="w-full"
          :class="{ 'p-invalid': nameError }"
          placeholder="Enter project name..."
          autofocus
        />
        <small v-if="nameError" class="mt-1 block text-sm text-red-500">{{ nameError }}</small>
      </div>

      <!-- Description -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Description
        </label>
        <Textarea
          v-model="description"
          rows="3"
          class="w-full"
          placeholder="Add a description..."
        />
      </div>

      <!-- Color -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Project Color
        </label>

        <!-- Preset Colors -->
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="preset in presetColors"
            :key="preset"
            type="button"
            @click="color = preset"
            :class="[
              'h-8 w-8 rounded-full transition-transform hover:scale-110',
              color === preset ? 'ring-2 ring-offset-2 ring-orange-400' : ''
            ]"
            :style="{ backgroundColor: `#${preset}` }"
          />
        </div>

        <!-- Custom Color Picker -->
        <div class="flex items-center gap-3">
          <ColorPicker v-model="color" />
          <span class="text-sm text-gray-500">#{{ color }}</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p class="mb-2 text-xs text-gray-500">Preview</p>
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg text-white font-medium"
            :style="{ backgroundColor: `#${color}` }"
          >
            {{ name ? name.charAt(0).toUpperCase() : 'P' }}
          </span>
          <span class="font-medium text-gray-900">
            {{ name || 'Project Name' }}
          </span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          @click="closeModal"
          :disabled="isLoading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="onSubmit"
          :disabled="!meta.valid || isLoading"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isLoading ? 'Creating...' : 'Create Project' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.create-project-modal :deep(.p-dialog) {
  border: none !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.create-project-modal :deep(.p-dialog-header-close) {
  color: #9ca3af;
  border-radius: 0.5rem;
  transition: all 0.15s;
  width: 2rem;
  height: 2rem;
}

.create-project-modal :deep(.p-dialog-header-close:hover) {
  color: #4b5563;
  background-color: #f3f4f6;
}

.create-project-modal :deep(.p-inputtext),
.create-project-modal :deep(.p-textarea) {
  border-color: #e5e7eb;
  background-color: #fff;
}

.create-project-modal :deep(.p-inputtext:focus),
.create-project-modal :deep(.p-textarea:focus) {
  border-color: #f97316;
  box-shadow: 0 0 0 1px #f97316;
}

.create-project-modal :deep(.p-inputtext::placeholder),
.create-project-modal :deep(.p-textarea::placeholder) {
  color: #9ca3af;
}
</style>

