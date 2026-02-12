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

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)
const isLoading = ref(false)

const languageOptions = computed(() => ([
  { label: t('settings.languageOptions.en', 'English'), value: 'en' },
  { label: t('settings.languageOptions.no', 'Norwegian'), value: 'no' }
]))

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

function normalizeInstructionResponse(response) {
  const data = response?.instruction || response?.data?.instruction || response?.data || response
  if (!data || typeof data !== 'object') return null
  return {
    prompt: data.prompt || '',
    preferredLanguage: data.preferredLanguage || 'en'
  }
}

async function loadInstruction() {
  if (!projectId.value) {
    resetForm({
      values: {
        instruction: '',
        language: 'en'
      }
    })
    return
  }

  isLoading.value = true
  try {
    const response = await projectStore.fetchProjectInstruction(projectId.value)
    const normalized = normalizeInstructionResponse(response)
    resetForm({
      values: {
        instruction: normalized?.prompt || '',
        language: normalized?.preferredLanguage || 'en'
      }
    })
  } catch (error) {
    // 404/no data should keep defaults without surfacing as blocking error.
    resetForm({
      values: {
        instruction: '',
        language: 'en'
      }
    })
  } finally {
    isLoading.value = false
  }
}

watch(projectId, () => {
  loadInstruction()
}, { immediate: true })

const onSubmit = handleSubmit(async (values) => {
  if (!projectId.value || isLoading.value) return
  isSaving.value = true
  try {
    const instructionValue = values.instruction?.trim() || ''
    const languageValue = values.language || 'en'

    if (!instructionValue) {
      const response = await projectStore.deleteProjectInstruction(projectId.value)
      uiStore.showApiSuccess(response, t('settings.project.instruction.messages.reset', 'Project AI instruction reset to default'))
      resetForm({
        values: {
          instruction: '',
          language: 'en'
        }
      })
      return
    }

    const response = await projectStore.upsertProjectInstruction({
      projectId: projectId.value,
      prompt: instructionValue,
      preferredLanguage: languageValue
    })

    const normalized = normalizeInstructionResponse(response)
    resetForm({
      values: {
        instruction: normalized?.prompt || instructionValue,
        language: normalized?.preferredLanguage || languageValue
      }
    })

    uiStore.showApiSuccess(response, t('settings.project.instruction.messages.saved', 'Project AI instruction saved successfully'))
  } catch (error) {
    uiStore.showApiError(error, t('settings.project.instruction.messages.saveFailed', 'Failed to save project AI instruction'))
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
  <div v-if="!projectId" class="settings-project-empty">
    <div class="settings-project-empty-title">{{ t('settings.project.empty.title') }}</div>
    <p class="settings-project-empty-text">{{ t('settings.project.empty.description') }}</p>
  </div>

  <div v-else class="settings-project-instruction">
    <div class="settings-project-header">
      <div class="settings-project-title">{{ t('settings.project.instruction.title', 'Default AI Custom Instruction') }}</div>
      <p class="settings-project-description">
        {{ t('settings.project.instruction.description', 'Your built-in assistant for project management and productivity. Customize how AI assistant behaves and communicates with you and your team. Leave it empty with default assistant instruction') }}
      </p>
    </div>

    <form @submit="onSubmit" class="mt-6 space-y-6">
      <div>
        <label class="block text-xs mb-2">
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
        <label class="block text-xs mr-4 whitespace-nowrap">
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
.settings-project-empty {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
}

.settings-project-empty-title {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
}

.settings-project-empty-text {
  font-size: 12px;
  color: var(--color-gray-400);
  margin-top: 6px;
}

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

.settings-project-description {
  font-size: 12px;
  color: var(--color-gray-500);
  line-height: 1.5;
  font-weight: var(--font-weight-medium);
}
</style>



