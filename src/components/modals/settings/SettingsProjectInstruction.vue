<script setup>
/**
 * SettingsProjectInstruction - Project instruction settings (AI/Language).
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

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Norwegian', value: 'no' }
]

const schema = computed(() => yup.object({
  instruction: yup.string().nullable(),
  language: yup.string().nullable()
}))

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    instruction: '',
    language: 'en'
  }
})

const { value: instruction } = useField('instruction')
const { value: language } = useField('language')

const hasPendingChanges = computed(() => Boolean(meta.value?.dirty))
// Allow saving if dirty and not currently saving
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
        instruction: '',
        language: 'en'
      }
    })
    return
  }
  // TODO: Map actual fields from project when backend is ready.
  // Using mocks/placeholders for now or assuming fields exist on project object
  resetForm({
    values: {
      instruction: value.instruction || '',
      language: value.language || 'en'
    }
  })
}, { immediate: true })

const onSubmit = handleSubmit(async (values) => {
  isSaving.value = true
  try {
    const instructionValue = values.instruction?.trim() || ''
    const languageValue = values.language || 'en'
    
    if (project.value?.id) {
      const response = await projectStore.updateProject(project.value.id, {
        instruction: instructionValue,
        language: languageValue
      })
      uiStore.showApiSuccess(response, t('projects.settings.messages.updated'))
      resetForm({ values: { instruction: instructionValue, language: languageValue } })
    }
  } catch (error) {
    uiStore.showApiError(error, t('projects.settings.errors.update'))
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
  <div class="settings-project-instruction">
    <div class="settings-project-header">
      <div class="settings-project-title">{{ t('settings.project.instruction.title', 'Default AI Custom Instruction') }}</div>
      <p class="settings-project-description">
        {{ t('settings.project.instruction.description', 'Your built-in assistant for project management and productivity. Customize how AI assistant behaves and communicates with you and your team. Leave it empty with default assistant instruction') }}
      </p>
    </div>

    <form @submit="onSubmit" class="mt-6 space-y-6">
      <div>
        <label class="block text-xs text-gray-700 mb-2">
          {{ t('settings.project.instruction.fields.guidelines', 'What guidelines or instructions should the assistant follow for general chat?') }}
        </label>
        <FormInput
          id="instruction"
          v-model="instruction"
          as="textarea"
          rows="3"
          class="w-full text-xs"
          :placeholder="t('settings.project.instruction.placeholders.guidelines', 'e.g. write with clear and concise manners')"
        />
      </div>

      <div class="flex items-center justify-between">
        <label class="block text-xs text-gray-700 mr-4 whitespace-nowrap">
          {{ t('settings.project.instruction.fields.language', 'Preferred language') }}
        </label>
        <div class="w-[200px]">
          <FormInput
            id="language"
            v-model="language"
            as="select"
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full text-xs"
          />
        </div>
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

.settings-project-description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}
</style>
