<script setup>
/**
 * ProjectSettingsView - Project settings page
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore, useWorkspaceStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ColorPicker from 'primevue/colorpicker'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const router = useRouter()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()
const confirm = useConfirm()

const project = computed(() => projectStore.currentProject)
const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  name: yup.string().required('Project name is required').min(2, 'Name must be at least 2 characters'),
  description: yup.string()
})

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema,
  initialValues: {
    name: project.value?.name || '',
    description: project.value?.description || ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: description } = useField('description')
const color = ref(project.value?.color || '#6366f1')

// Watch for project changes
onMounted(() => {
  if (project.value) {
    resetForm({
      values: {
        name: project.value.name,
        description: project.value.description || ''
      }
    })
    color.value = project.value.color || '#6366f1'
  }
})

// Methods
const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await projectStore.updateProject(project.value.id, {
      ...values,
      color: `#${color.value}`
    })
    uiStore.showSuccess('Project updated successfully')
  } catch (error) {
    uiStore.showError('Failed to update project')
  } finally {
    isLoading.value = false
  }
})

function confirmArchive() {
  confirm.require({
    message: 'Are you sure you want to archive this project? You can restore it later.',
    header: 'Archive Project',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-warning',
    accept: async () => {
      try {
        await projectStore.archiveProject(project.value.id)
        uiStore.showSuccess('Project archived')
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showError('Failed to archive project')
      }
    }
  })
}

function confirmDelete() {
  confirm.require({
    message: 'Are you sure you want to delete this project? This action cannot be undone.',
    header: 'Delete Project',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await projectStore.deleteProject(project.value.id)
        uiStore.showSuccess('Project deleted')
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showError('Failed to delete project')
      }
    }
  })
}
</script>

<template>
  <div class="p-6">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-xl font-bold text-gray-900 dark-edit:text-white">Project Settings</h1>

      <form @submit="onSubmit" class="space-y-6">
        <!-- General Settings -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">General</h2>
          
          <div class="space-y-4">
            <!-- Name -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
                Project Name
              </label>
              <InputText 
                v-model="name" 
                class="w-full"
                :class="{ 'p-invalid': nameError }"
              />
              <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
            </div>

            <!-- Description -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
                Description
              </label>
              <Textarea 
                v-model="description" 
                rows="3"
                class="w-full"
                placeholder="Add a description for this project..."
              />
            </div>

            <!-- Color -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
                Project Color
              </label>
              <div class="flex items-center gap-3">
                <ColorPicker v-model="color" />
                <span class="text-sm text-gray-500">#{{ color }}</span>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <Button 
              type="submit" 
              label="Save Changes" 
              :loading="isLoading"
              :disabled="!meta.valid"
            />
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="rounded-lg border border-red-200 bg-red-50 p-6 dark-edit:border-red-900/30 dark-edit:bg-red-900/10">
          <h2 class="mb-4 text-lg font-semibold text-red-700 dark-edit:text-red-400">Danger Zone</h2>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900 dark-edit:text-white">Archive Project</h3>
                <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                  Archive this project. You can restore it later.
                </p>
              </div>
              <Button 
                label="Archive" 
                severity="warning" 
                outlined
                @click="confirmArchive"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900 dark-edit:text-white">Delete Project</h3>
                <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                  Permanently delete this project and all its tasks.
                </p>
              </div>
              <Button 
                label="Delete" 
                severity="danger" 
                outlined
                @click="confirmDelete"
              />
            </div>
          </div>
        </div>
      </form>
    </div>

    <ConfirmDialog />
  </div>
</template>

