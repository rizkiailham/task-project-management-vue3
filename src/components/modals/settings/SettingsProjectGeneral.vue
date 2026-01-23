<script setup>
/**
 * SettingsProjectGeneral - General project settings (create/update).
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useProjectStore, useUIStore } from '@/stores'
import FormInput from '@/components/ui/FormInput.vue'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const project = computed(() => projectStore.currentProject)
const isSaving = ref(false)

const schema = computed(() => yup.object({
  name: yup.string().nullable(),
  description: yup.string().nullable()
}))

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    description: ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: description } = useField('description')

const hasPendingChanges = computed(() => Boolean(meta.value?.dirty))
const canSave = computed(() => hasPendingChanges.value && !isSaving.value)

watch([canSave, isSaving, hasPendingChanges], () => {
  emit('update:canSave', canSave.value)
  emit('update:isSaving', isSaving.value)
  emit('update:hasPendingChanges', hasPendingChanges.value)
}, { immediate: true })

watch(project, (value) => {
  if (!value) {
    resetForm({
      values: {
        name: '',
        description: ''
      }
    })
    return
  }
  resetForm({
    values: {
      name: value.name || '',
      description: value.description || ''
    }
  })
}, { immediate: true })

const onSubmit = handleSubmit(async (values) => {
  isSaving.value = true
  try {
    const nameValue = values.name?.trim() || t('projects.newProject')
    const descriptionValue = values.description?.trim() || ''
    if (project.value?.id) {
      const response = await projectStore.updateProject(project.value.id, {
        name: nameValue,
        description: descriptionValue
      })
      uiStore.showApiSuccess(response, t('projects.settings.messages.updated'))
      resetForm({ values: { name: nameValue, description: descriptionValue } })
      return
    }
    const response = await projectStore.createNewProject({
      name: nameValue,
      description: descriptionValue
    })
    const created = response?.project || response?.data || response
    if (created?.id) {
      await projectStore.selectProject(created.id)
    }
    await projectStore.fetchProjects()
    uiStore.showApiSuccess(response, t('projects.messages.created'))
    resetForm({ values: { name: nameValue, description: descriptionValue } })
  } catch (error) {
    const fallback = project.value?.id
      ? t('projects.settings.errors.update')
      : t('projects.errors.create')
    uiStore.showApiError(error, fallback)
  } finally {
    isSaving.value = false
  }
})

function saveChanges() {
  onSubmit()
}

defineExpose({ saveChanges })
</script>

<template>
  <div class="settings-project-general">
    <div class="settings-project-header">
      <div class="settings-project-title">{{ t('projects.createModal.title') }}</div>
    </div>

    <form @submit="onSubmit" class="mt-6 space-y-5">
      <div>
        <FormInput
          id="new-project-name"
          v-model="name"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          class="w-full"
          :class="{ 'p-invalid': nameError }"
          :placeholder="t('projects.createModal.placeholders.name')"
          autofocus
        >
          <template #label>
            {{ t('projects.fields.name') }}
          </template>
        </FormInput>
        <small v-if="nameError" class="mt-1 block text-sm text-red-500">{{ nameError }}</small>
      </div>

      <div>
        <FormInput
          id="new-project-description"
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
  </div>
</template>

<style scoped>
.settings-project-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-project-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
</style>
