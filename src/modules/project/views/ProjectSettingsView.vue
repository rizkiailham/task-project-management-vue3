<script setup>
/**
 * ProjectSettingsView - Project settings page
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useWorkspaceStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import FormInput from '@/components/ui/FormInput.vue'
import Button from 'primevue/button'
import ColorPicker from 'primevue/colorpicker'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const router = useRouter()
const { t } = useI18n()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()
const confirm = useConfirm()

const project = computed(() => projectStore.currentProject)
const isLoading = ref(false)

// Form validation
const validationSchema = computed(() => yup.object({
  name: yup
    .string()
    .required(t('projects.settings.validation.nameRequired'))
    .min(2, t('projects.settings.validation.nameMin')),
  description: yup.string()
}))

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
    const response = await projectStore.updateProject(project.value.id, {
      ...values,
      color: `#${color.value}`
    })
    uiStore.showApiSuccess(response, t('projects.settings.messages.updated'))
  } catch (error) {
    uiStore.showApiError(error, t('projects.settings.errors.update'))
  } finally {
    isLoading.value = false
  }
})

function confirmArchive() {
  confirm.require({
    message: t('projects.settings.archiveConfirm.message'),
    header: t('projects.settings.archiveConfirm.title'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-warning',
    accept: async () => {
      try {
        await projectStore.archiveProject(project.value.id)
        uiStore.showApiSuccess(null, t('projects.settings.messages.archived'))
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showApiError(error, t('projects.settings.errors.archive'))
      }
    }
  })
}

function confirmDelete() {
  confirm.require({
    dialogType: 'delete',
    header: t('projects.settings.deleteConfirm.title'),
    message: t('projects.settings.deleteConfirm.message'),
    accept: async () => {
      try {
        const response = await projectStore.deleteProject(project.value.id)
        uiStore.showApiSuccess(response, t('projects.settings.messages.deleted'))
        router.push({ name: 'Home' })
      } catch (error) {
        uiStore.showApiError(error, t('projects.settings.errors.delete'))
      }
    }
  })
}
</script>

<template>
  <div class="p-6">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-xl font-bold text-gray-900 dark-edit:text-white">{{ t('projects.settings.title') }}</h1>

      <form @submit="onSubmit" class="space-y-6">
        <!-- General Settings -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark-edit:border-gray-700 dark-edit:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('projects.settings.sections.general') }}</h2>
          
          <div class="space-y-4">
            <!-- Name -->
            <div>
              <FormInput
                id="project-name"
                v-model="name" 
                :label="t('projects.settings.fields.name')"
                labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
                class="w-full"
                :class="{ 'p-invalid': nameError }"
              />
              <small v-if="nameError" class="text-red-500">{{ nameError }}</small>
            </div>

            <!-- Description -->
            <div>
              <FormInput
                id="project-description"
                v-model="description" 
                as="textarea"
                :label="t('projects.settings.fields.description')"
                labelClass="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300"
                rows="3"
                class="w-full"
                :placeholder="t('projects.settings.placeholders.description')"
              />
            </div>

            <!-- Color -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark-edit:text-gray-300">
                {{ t('projects.settings.fields.color') }}
              </label>
              <div class="flex items-center gap-3">
                <ColorPicker v-model="color" />
                <span class="text-sm text-gray-500">{{ t('projects.settings.colorLabel', { value: color }) }}</span>
              </div>
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
          <h2 class="mb-4 text-lg font-semibold text-red-700 dark-edit:text-red-400">{{ t('projects.settings.sections.danger') }}</h2>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900 dark-edit:text-white">{{ t('projects.settings.actions.archiveTitle') }}</h3>
                <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                  {{ t('projects.settings.actions.archiveDescription') }}
                </p>
              </div>
              <Button 
                :label="t('projects.settings.actions.archiveButton')" 
                severity="warning" 
                outlined
                @click="confirmArchive"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900 dark-edit:text-white">{{ t('projects.settings.actions.deleteTitle') }}</h3>
                <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                  {{ t('projects.settings.actions.deleteDescription') }}
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
        </div>
      </form>
    </div>

    <ConfirmDialog />
  </div>
</template>
