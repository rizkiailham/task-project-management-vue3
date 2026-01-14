<script setup>
/**
 * WorkspaceSettingsView - Workspace settings page
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWorkspaceStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const router = useRouter()
const { t } = useI18n()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()
const confirm = useConfirm()

const workspace = computed(() => workspaceStore.currentWorkspace)
const isLoading = ref(false)

// Form validation
const validationSchema = computed(() => yup.object({
  name: yup
    .string()
    .required(t('workspace.settings.validation.nameRequired'))
    .min(2, t('workspace.settings.validation.nameMin'))
}))

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
    const response = await workspaceStore.updateCurrentWorkspace(values)
    uiStore.showApiSuccess(response, t('workspace.settings.messages.updated'))
  } catch (error) {
    uiStore.showApiError(error, t('workspace.settings.errors.update'))
  } finally {
    isLoading.value = false
  }
})

function confirmDelete() {
  confirm.require({
    message: t('workspace.settings.deleteConfirm.message'),
    header: t('workspace.settings.deleteConfirm.title'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const response = await workspaceStore.deleteWorkspace(workspace.value.id)
        uiStore.showApiSuccess(response, t('workspace.settings.messages.deleted'))
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showApiError(error, t('workspace.settings.errors.delete'))
      }
    }
  })
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-xl font-bold text-gray-900 dark-edit:text-white">{{ t('workspace.settings.title') }}</h1>

      <form @submit="onSubmit" class="space-y-6">
        <!-- General Settings -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('workspace.settings.sections.general') }}</h2>
          
          <div class="space-y-4">
            <div>
              <FormInput
                id="workspace-name"
                v-model="name" 
                :label="t('workspace.settings.fields.name')"
                labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
                class="w-full"
                :class="{ 'p-invalid': nameError }"
              />
              <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <Button 
              type="submit" 
              :label="t('common.save')"
              :loading="isLoading"
              :disabled="!meta.valid"
            />
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="rounded-lg border border-red-200 bg-red-50 p-6 dark-edit:border-red-900/30 dark-edit:bg-red-900/10">
          <h2 class="mb-4 text-lg font-semibold text-red-700 dark-edit:text-red-400">{{ t('workspace.settings.sections.danger') }}</h2>
          
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-900 dark-edit:text-white">{{ t('workspace.settings.actions.deleteTitle') }}</h3>
              <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                {{ t('workspace.settings.actions.deleteDescription') }}
              </p>
            </div>
            <Button 
              :label="t('common.delete')"
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
