<script setup>
/**
 * BaseModal - Reusable modal component with slots
 * 
 * Provides header, default (content), and footer slots for flexible modal layouts.
 * Built on top of PrimeVue Dialog with consistent styling.
 */
import { computed } from 'vue'
import Dialog from 'primevue/dialog'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '450px'
  },
  maxWidth: {
    type: String,
    default: '95vw'
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnEscape: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  dialogClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'close'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => {
    emit('update:visible', val)
    if (!val) emit('close')
  }
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :style="{ width: width, maxWidth: maxWidth }"
    :closable="closable && !loading"
    :closeOnEscape="closeOnEscape && !loading"
    class="base-modal"
    :pt="{
      root: { class: ['rounded-xl overflow-hidden shadow-2xl border-0', dialogClass].filter(Boolean).join(' ') },
      header: { class: 'bg-white border-b border-gray-200 px-6 py-4' },
      content: { class: 'bg-white px-6 py-5' },
      footer: { class: 'bg-gray-50 border-t border-gray-200 px-6 py-4' },
      mask: { class: 'bg-black/40' }
    }"
  >
    <template #header>
      <slot name="header">
        <h2 v-if="title" class="text-lg font-semibold text-gray-900">{{ title }}</h2>
      </slot>
    </template>

    <slot></slot>

    <template #footer>
      <slot name="footer"></slot>
    </template>
  </Dialog>
</template>

<style scoped>
.base-modal :deep(.p-dialog) {
  border: none !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.base-modal :deep(.p-dialog-header-close) {
  color: #9ca3af;
  border-radius: 0.5rem;
  transition: all 0.15s;
  width: 2rem;
  height: 2rem;
}

.base-modal :deep(.p-dialog-header-close:hover) {
  color: #4b5563;
  background-color: #f3f4f6;
}

.base-modal :deep(.p-inputtext),
.base-modal :deep(.p-textarea),
.base-modal :deep(.p-select) {
  border-color: #e5e7eb;
  background-color: #fff;
}

.base-modal :deep(.p-inputtext:focus),
.base-modal :deep(.p-textarea:focus),
.base-modal :deep(.p-select:focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

.base-modal :deep(.p-inputtext::placeholder),
.base-modal :deep(.p-textarea::placeholder) {
  color: #9ca3af;
}
</style>
