<script setup>
/**
 * DeleteConfirmModal - Confirmation dialog for delete actions
 * 
 * Shows a warning message and requires user confirmation before deletion.
 */
import { computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Trash2 } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Delete Item'
  },
  itemName: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const displayTitle = computed(() => {
  if (props.title) return props.title
  return props.itemName ? `Delete ${props.itemName}` : 'Delete Item'
})

const displayMessage = computed(() => {
  if (props.message) return props.message
  return 'This action will permanently delete the user and revoke all access. This action cannot be undone.'
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  dialogVisible.value = false
}
</script>

<template>
  <BaseModal
    v-model:visible="dialogVisible"
    width="400px"
    :closable="!loading"
    :closeOnEscape="!loading"
    :loading="loading"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
          <Trash2 class="w-5 h-5 text-red-500" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900">{{ displayTitle }}</h2>
      </div>
    </template>

    <div class="py-2">
      <p class="text-sm text-gray-600 leading-relaxed">
        {{ displayMessage }}
      </p>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleCancel"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleConfirm"
          :disabled="loading"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
