<script setup>
/**
 * WorkspaceSettingsView - Workspace settings page
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()
const confirm = useConfirm()

const workspace = computed(() => workspaceStore.currentWorkspace)
const isLoading = ref(false)

// Form validation
const validationSchema = yup.object({
  name: yup.string().required('Workspace name is required').min(2, 'Name must be at least 2 characters')
})

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema,
  initialValues: {
    name: workspace.value?.name || ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')

onMounted(() => {
  if (workspace.value) {
    resetForm({ values: { name: workspace.value.name } })
  }
})

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await workspaceStore.updateCurrentWorkspace(values)
    uiStore.showSuccess('Workspace updated successfully')
  } catch (error) {
    uiStore.showError('Failed to update workspace')
  } finally {
    isLoading.value = false
  }
})

function confirmDelete() {
  confirm.require({
    message: 'Are you sure you want to delete this workspace? All projects and tasks will be permanently deleted.',
    header: 'Delete Workspace',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await workspaceStore.deleteWorkspace(workspace.value.id)
        uiStore.showSuccess('Workspace deleted')
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showError('Failed to delete workspace')
      }
    }
  })
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Workspace Settings</h1>

      <form @submit="onSubmit" class="space-y-6">
        <!-- General Settings -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">General</h2>
          
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Workspace Name
              </label>
              <InputText 
                v-model="name" 
                class="w-full"
                :class="{ 'p-invalid': nameError }"
              />
              <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
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
        <div class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
          <h2 class="mb-4 text-lg font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
          
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">Delete Workspace</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete this workspace and all its data.
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
      </form>
    </div>

    <ConfirmDialog />
  </div>
</template>

