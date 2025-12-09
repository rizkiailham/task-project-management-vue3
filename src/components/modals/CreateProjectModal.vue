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
import Button from 'primevue/button'
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
    header="Create New Project"
    :style="{ width: '450px' }"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :pt="{
      root: { class: 'dark:bg-gray-800' },
      header: { class: 'dark:bg-gray-800 dark:text-white' },
      content: { class: 'dark:bg-gray-800' }
    }"
  >
    <form @submit="onSubmit" class="space-y-4">
      <!-- Name -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Name <span class="text-red-500">*</span>
        </label>
        <InputText 
          v-model="name" 
          class="w-full"
          :class="{ 'p-invalid': nameError }"
          placeholder="Enter project name..."
          autofocus
        />
        <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              color === preset ? 'ring-2 ring-offset-2 ring-gray-400' : ''
            ]"
            :style="{ backgroundColor: `#${preset}` }"
          />
        </div>
        
        <!-- Custom Color Picker -->
        <div class="flex items-center gap-3">
          <ColorPicker v-model="color" />
          <span class="text-sm text-gray-500 dark:text-gray-400">#{{ color }}</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">Preview</p>
        <div class="flex items-center gap-3">
          <span 
            class="flex h-10 w-10 items-center justify-center rounded-lg text-white font-medium"
            :style="{ backgroundColor: `#${color}` }"
          >
            {{ name ? name.charAt(0).toUpperCase() : 'P' }}
          </span>
          <span class="font-medium text-gray-900 dark:text-white">
            {{ name || 'Project Name' }}
          </span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button 
          label="Cancel" 
          text 
          @click="closeModal"
          :disabled="isLoading"
        />
        <Button 
          label="Create Project" 
          @click="onSubmit"
          :loading="isLoading"
          :disabled="!meta.valid"
        />
      </div>
    </template>
  </Dialog>
</template>

