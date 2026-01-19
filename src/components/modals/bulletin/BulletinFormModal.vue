<script setup>
/**
 * BulletinFormModal - Modal for creating/editing bulletin items
 */
import { computed, ref, watch } from 'vue'
import { useBulletinStore, useUIStore } from '@/stores'
import { upload } from '@/api'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormInput from '@/components/ui/FormInput.vue'
import ToggleSwitch from 'primevue/toggleswitch'
import { Plus, Upload, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  bulletin: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'saved'])

const bulletinStore = useBulletinStore()
const uiStore = useUIStore()
const { t } = useI18n()

const fileInputRef = ref(null)
const isSubmitting = ref(false)
const isUploading = ref(false)

const formData = ref({
  title: '',
  description: '',
  categoryId: null,
  groupIds: [],
  content: '',
  thumbnail: '',
  isPublished: false
})

const isEditing = computed(() => !!props.bulletin?.id)
const modalTitle = computed(() => (
  isEditing.value
    ? t('bulletin.modal.bulletin.editTitle')
    : t('bulletin.modal.bulletin.addTitle')
))

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const categoryOptions = computed(() =>
  (props.categories || []).map((category) => ({
    label: category?.name || category?.label || category?.id,
    value: category?.id
  }))
)

const groupOptions = computed(() =>
  (props.groups || []).map((group) => ({
    label: group?.name || group?.label || group?.id,
    value: group?.id
  }))
)

function normalizeGroupIds(source) {
  if (Array.isArray(source)) return source
  if (source === 'all' || !source) return []
  return []
}

function applyBulletin(bulletin) {
  formData.value = {
    title: bulletin?.title || '',
    description: bulletin?.description || '',
    categoryId: bulletin?.categoryId || bulletin?.category?.id || null,
    groupIds: normalizeGroupIds(bulletin?.groupAccess || bulletin?.groupIds),
    content: bulletin?.content || '',
    thumbnail: bulletin?.thumbnail || '',
    isPublished: !!bulletin?.isPublished
  }
}

function resetForm() {
  formData.value = {
    title: '',
    description: '',
    categoryId: null,
    groupIds: [],
    content: '',
    thumbnail: '',
    isPublished: false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    if (props.bulletin) {
      applyBulletin(props.bulletin)
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.bulletin,
  (bulletin) => {
    if (!props.visible) return
    if (bulletin) {
      applyBulletin(bulletin)
    } else {
      resetForm()
    }
  }
)

function closeModal() {
  dialogVisible.value = false
}

function triggerFileSelect() {
  if (isUploading.value) return
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

async function handleFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  isUploading.value = true
  try {
    const payload = new FormData()
    payload.append('file', file)
    const response = await upload('/upload', payload)
    const url =
      (typeof response === 'string' && response) ||
      response?.url ||
      response?.data?.url ||
      response?.path ||
      response?.data?.path

    if (!url) {
      throw new Error('Upload failed')
    }

    formData.value.thumbnail = url
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isUploading.value = false
  }
}

function removeThumbnail() {
  formData.value.thumbnail = ''
}

async function handleSubmit() {
  if (!formData.value.title.trim()) {
    uiStore.showError(t('bulletin.validation.titleRequired'))
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      categoryId: formData.value.categoryId || null,
      groupIds: formData.value.groupIds || [],
      content: formData.value.content || null,
      thumbnail: formData.value.thumbnail || null,
      isPublished: !!formData.value.isPublished
    }

    let response
    if (isEditing.value) {
      response = await bulletinStore.updateBulletin(props.bulletin.id, payload)
    } else {
      response = await bulletinStore.createBulletin(payload)
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
    width="640px"
    :closable="!isSubmitting"
    :closeOnEscape="!isSubmitting"
    :loading="isSubmitting"
  >
    <template #header>
      <h2 class="text-base font-semibold text-gray-900">{{ modalTitle }}</h2>
    </template>

    <div class="max-h-[60vh] overflow-y-auto -my-5 -mx-6 px-6 py-5 space-y-4">
      <FormInput
        id="bulletin-title"
        v-model="formData.title"
        :label="t('bulletin.fields.titleLabel')"
        labelClass="block text-xs text-gray-500 mb-1"
        :placeholder="t('bulletin.placeholders.title')"
        class="w-full"
      />

      <FormInput
        id="bulletin-description"
        v-model="formData.description"
        as="textarea"
        :label="t('bulletin.fields.description')"
        labelClass="block text-xs text-gray-500 mb-1"
        :placeholder="t('bulletin.placeholders.description')"
        rows="3"
        class="w-full"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col">
          <label for="bulletin-category" class="mb-1.5 text-xs text-gray-500">
            {{ t('bulletin.fields.category') }}
          </label>
          <FormInput
            id="bulletin-category"
            v-model="formData.categoryId"
            as="select"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('bulletin.placeholders.selectCategory')"
            class="w-full"
          />
        </div>

        <div class="flex flex-col">
          <label for="bulletin-access-group" class="mb-1.5 text-xs text-gray-500">
            {{ t('bulletin.fields.accessGroup') }}
          </label>
          <FormInput
            id="bulletin-access-group"
            v-model="formData.groupIds"
            as="multiselect"
            :options="groupOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('common.all')"
            class="w-full"
            display="chip"
          />
        </div>
      </div>

      <FormInput
        id="bulletin-content"
        v-model="formData.content"
        as="textarea"
        :label="t('bulletin.fields.content')"
        labelClass="block text-xs text-gray-500 mb-1"
        :placeholder="t('bulletin.placeholders.content')"
        rows="4"
        class="w-full"
      />

      <div class="space-y-2">
        <div class="text-xs text-gray-500 font-medium">{{ t('bulletin.fields.thumbnail') }}</div>
        <div class="flex items-center gap-4">
          <div
            v-if="formData.thumbnail"
            class="relative h-24 w-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
          >
            <img :src="formData.thumbnail" alt="" class="h-full w-full object-cover" />
            <div class="absolute inset-0 flex items-center justify-center gap-2 bg-white/70">
              <button
                type="button"
                class="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                @click="triggerFileSelect"
                :disabled="isUploading"
              >
                <Upload class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50"
                @click="removeThumbnail"
                :disabled="isUploading"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="h-24 w-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:text-gray-500 hover:border-gray-400 flex items-center justify-center"
            @click="triggerFileSelect"
            :disabled="isUploading"
          >
            <Plus class="w-6 h-6" />
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <ToggleSwitch v-model="formData.isPublished" class="min-w-[40px] max-h-[26px]" />
        <span class="text-sm text-gray-600">{{ t('bulletin.fields.published') }}</span>
      </div>
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
