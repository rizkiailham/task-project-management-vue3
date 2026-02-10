<script setup>
/**
 * CreateProjectModal - Modal for creating new projects
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Dialog from 'primevue/dialog'
import FormInput from '@/components/ui/FormInput.vue'

const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t } = useI18n()

// Modal visibility
const visible = computed({
  get: () => uiStore.activeModal === 'createProject',
  set: (val) => { if (!val) uiStore.closeModal() }
})

const isLoading = ref(false)
const color = ref('6366f1')

// Form validation
const validationSchema = yup.object({
  name: yup.string().required(t('projects.validation.nameRequired')).min(2, t('projects.validation.nameMin')),
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
    const response = await projectStore.createNewProject({
      name: values.name,
      description: values.description,
      color: `#${color.value}`
    })
    // Refresh the projects list to ensure sidebar updates
    await projectStore.fetchProjects()
    uiStore.showApiSuccess(response, t('projects.messages.created'))
    uiStore.closeModal()
  } catch (error) {
    uiStore.showApiError(error, t('projects.errors.create'))
  } finally {
    isLoading.value = false
  }
})

function closeModal() {
  uiStore.closeModal()
}

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
      content: { class: 'bg-white px-6 pb-5' },
      footer: { class: 'bg-gray-50 border-t border-gray-200 px-6 py-4' },
      mask: { class: 'bg-black/40' }
    }"
  >
    <template #header>
      <h2 class="text-lg font-semibold text-gray-900">{{ t('projects.createModal.title') }}</h2>
    </template>

    <form @submit="onSubmit" class="space-y-5">
      <!-- Name -->
      <div>
        <FormInput
          id="project-name"
          v-model="name"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          class="w-full"
          :class="{ 'p-invalid': nameError }"
          :placeholder="t('projects.createModal.placeholders.name')"
          autofocus
        >
          <template #label>
            {{ t('projects.fields.name') }} <span class="text-red-500">*</span>
          </template>
        </FormInput>
        <small v-if="nameError" class="mt-1 block text-sm text-red-500">{{ nameError }}</small>
      </div>

      <!-- Description -->
      <div>
        <FormInput
          id="project-description"
          v-model="description"
          as="textarea"
          :label="t('projects.fields.description')"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          rows="3"
          class="w-full"
          :placeholder="t('projects.createModal.placeholders.description')"
        />
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
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          {{ isLoading ? t('projects.createModal.creating') : t('projects.createModal.cta') }}
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

