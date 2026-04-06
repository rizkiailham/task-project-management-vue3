<script setup>
/**
 * FileUploadProgress - Displays a list of files being uploaded with individual
 * progress bars and percentage indicators.
 *
 * Reusable across any page that needs file upload feedback (task attachments,
 * chat file uploads, form submissions, etc.).
 *
 * Usage:
 *   <FileUploadProgress :files="uploadingFiles" @cancel="handleCancel" />
 *
 * Each file object in the `files` array should have:
 *   - id: string          — unique identifier
 *   - name: string        — display filename
 *   - size: number        — file size in bytes (optional)
 *   - progress: number    — 0–100 percentage
 *   - status: string      — 'uploading' | 'completed' | 'error'
 *   - error: string       — error message (when status === 'error')
 */
import { useI18n } from 'vue-i18n'
import { X, Check, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()

defineProps({
  files: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['cancel', 'retry'])

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div v-if="files.length" class="file-upload-progress">
    <div
      v-for="file in files"
      :key="file.id"
      class="upload-item py-1.5 px-1 -mx-1"
    >
      <div class="flex items-center justify-between gap-2 min-h-[20px]">
        <span class="text-xs text-gray-500 truncate min-w-0" :title="file.name">
          {{ file.name }}
        </span>
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Size -->
          <span v-if="file.size && file.status === 'uploading'" class="text-[10px] text-gray-400">
            {{ formatSize(file.size) }}
          </span>
          <!-- Percentage -->
          <span v-if="file.status === 'uploading'" class="text-[10px] font-medium text-blue-600 tabular-nums w-7 text-right">
            {{ file.progress || 0 }}%
          </span>
          <!-- Completed icon -->
          <Check v-else-if="file.status === 'completed'" class="w-3.5 h-3.5 text-green-500" />
          <!-- Error icon -->
          <AlertCircle v-else-if="file.status === 'error'" class="w-3.5 h-3.5 text-red-500" />
          <!-- Cancel button -->
          <button
            v-if="file.status === 'uploading'"
            type="button"
            class="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
            :title="t('common.cancel', 'Cancel')"
            @click="emit('cancel', file)"
          >
            <X class="w-3 h-3" />
          </button>
          <!-- Retry button for errors -->
          <button
            v-if="file.status === 'error'"
            type="button"
            class="text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            @click="emit('retry', file)"
          >
            {{ t('common.retry', 'Retry') }}
          </button>
        </div>
      </div>
      <!-- Progress bar -->
      <div v-if="file.status === 'uploading'" class="upload-bar-track">
        <div
          class="upload-bar-fill"
          :style="{ width: `${Math.min(file.progress || 0, 100)}%` }"
        ></div>
      </div>
      <!-- Error message -->
      <p v-if="file.status === 'error' && file.error" class="text-[10px] text-red-500 mt-0.5 truncate">
        {{ file.error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.file-upload-progress {
  display: flex;
  flex-direction: column;
}

.upload-bar-track {
  margin-top: 3px;
  height: 2px;
  border-radius: 2px;
  background-color: #e5e7eb;
  overflow: hidden;
}

.upload-bar-fill {
  height: 100%;
  border-radius: 2px;
  background-color: #3b82f6;
  transition: width 0.2s ease;
}
</style>
