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
  initial: yup.string().nullable().max(4),
  description: yup.string().nullable()
}))

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    initial: '',
    description: ''
  }
})

const { value: name, errorMessage: nameError, meta: nameMeta } = useField('name')
const { value: initial, meta: initialMeta } = useField('initial')
const { value: description } = useField('description')

const hasPendingChanges = computed(() => Boolean(meta.value?.dirty))
const canSave = computed(() => hasPendingChanges.value && !isSaving.value)

function deriveInitial(projectName) {
  if (!projectName) return ''
  const words = projectName.trim().split(/\s+/)
  if (words.length === 1) {
    return projectName.substring(0, 4).toUpperCase()
  }
  return words.map(w => w[0]).join('').substring(0, 4).toUpperCase()
}

watch(name, (newValue) => {
  if (nameMeta.dirty && !initialMeta.value?.dirty) {
    initial.value = deriveInitial(newValue)
  }
})

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
        initial: '',
        description: ''
      }
    })
    return
  }
  resetForm({
    values: {
      name: value.name || '',
      initial: value.initial || '',
      description: value.description || ''
    }
  })
}, { immediate: true })

const onSubmit = handleSubmit(async (values) => {
  isSaving.value = true
  try {
    const nameValue = values.name?.trim() || t('projects.newProject')
    const initialValue = values.initial?.trim() || ''
    const descriptionValue = values.description?.trim() || ''
    if (project.value?.id) {
      const response = await projectStore.updateProject(project.value.id, {
        name: nameValue,
        initial: initialValue,
        description: descriptionValue
      })
      uiStore.showApiSuccess(response, t('projects.settings.messages.updated'))
      resetForm({ values: { name: nameValue, initial: initialValue, description: descriptionValue } })
      return
    }
    const response = await projectStore.createNewProject({
      name: nameValue,
      initial: initialValue,
      description: descriptionValue
    })
    const created = response?.project || response?.data || response
    if (created?.id) {
      await projectStore.selectProject(created.id)
    }
    await projectStore.fetchProjects()
    uiStore.showApiSuccess(response, t('projects.messages.created'))
    resetForm({ values: { name: nameValue, initial: initialValue, description: descriptionValue } })
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
      <div class="flex gap-4">
        <div class="flex-1">
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
              <span class="text-red-500">*</span>
            </template>
          </FormInput>
          <small v-if="nameError" class="mt-1 block text-sm text-red-500">{{ nameError }}</small>
        </div>
        <div class="w-[120px]">
          <FormInput
            id="new-project-initial"
            v-model="initial"
            labelClass="mb-2 block text-sm font-medium text-gray-700"
            class="w-full"
            placeholder="ABC"
            maxlength="4"
          >
            <template #label>
              {{ t('projects.fields.initial', 'Initial') }}
            </template>
          </FormInput>
        </div>
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
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}
</style>



