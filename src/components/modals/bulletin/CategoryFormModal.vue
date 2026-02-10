<script setup>
/**
 * CategoryFormModal - Modal for creating/editing bulletin categories
 */
import { computed, ref, watch } from 'vue'
import { useCategoryStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  category: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'saved'])

const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const { t } = useI18n()

const formData = ref({
  name: '',
  description: ''
})
const isSubmitting = ref(false)

const isEditing = computed(() => !!props.category?.id)
const modalTitle = computed(() => (
  isEditing.value
    ? t('bulletin.modal.category.editTitle')
    : t('bulletin.modal.category.addTitle')
))

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

function applyCategory(category) {
  formData.value = {
    name: category?.name || '',
    description: category?.description || ''
  }
}

function resetForm() {
  formData.value = {
    name: '',
    description: ''
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    if (props.category) {
      applyCategory(props.category)
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.category,
  (category) => {
    if (!props.visible) return
    if (category) {
      applyCategory(category)
    } else {
      resetForm()
    }
  }
)

function closeModal() {
  dialogVisible.value = false
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    uiStore.showError(t('bulletin.validation.categoryNameRequired'))
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim()
    }

    let response
    if (isEditing.value) {
      response = await categoryStore.updateCategory(props.category.id, payload)
    } else {
      response = await categoryStore.createCategory(payload)
    }

    uiStore.showApiSuccess(response)
    emit('saved')
    closeModal()
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    :title="modalTitle"
    width="520px"
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    :loading="isSubmitting"
  >
    <template #header>
      <h2 class="text-base font-semibold text-gray-900">{{ modalTitle }}</h2>
    </template>

    <div class="max-h-[60vh] overflow-y-auto -my-5 -mx-6 px-6 pb-5 space-y-4">
      <FormInput
        id="category-name"
        v-model="formData.name"
        :label="t('bulletin.fields.categoryNameLabel')"
        labelClass="block text-xs text-gray-500 mb-1"
        :placeholder="t('bulletin.placeholders.categoryName')"
        class="w-full"
      />

      <FormInput
        id="category-description"
        v-model="formData.description"
        as="textarea"
        :label="t('bulletin.fields.description')"
        labelClass="block text-xs text-gray-500 mb-1"
        :placeholder="t('bulletin.placeholders.categoryDescription')"
        rows="4"
        class="w-full"
      />
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="closeModal"
          :disabled="isSubmitting"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? t('common.saving') : t('common.saveChanges') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
