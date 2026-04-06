<script setup>
/**
 * FilePreviewModal - Modal for previewing file attachments.
 *
 * Built on BaseModal for consistent styling with the rest of the app.
 * Supports images, PDFs, videos, audio, and plain text.
 * Falls back to a download prompt for unsupported types.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Download, FileText, FileImage, FileVideo, FileAudio, File as FileIcon } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'download'])

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const ext = computed(() => {
  if (!props.file) return ''
  const name = props.file.name || props.file.url || ''
  const match = name.match(/\.(\w+)(?:\?.*)?$/)
  return match ? match[1].toLowerCase() : ''
})

const mimeType = computed(() => {
  if (props.file?.type) return props.file.type.toLowerCase()
  return ''
})

const fileCategory = computed(() => {
  const e = ext.value
  const m = mimeType.value

  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(e)) return 'image'
  if (m === 'application/pdf' || e === 'pdf') return 'pdf'
  if (m.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(e)) return 'video'
  if (m.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(e)) return 'audio'
  if (m.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'sh', 'bash', 'sql'].includes(e)) return 'text'
  return 'unsupported'
})

const categoryIcon = computed(() => {
  const map = { image: FileImage, video: FileVideo, audio: FileAudio, text: FileText }
  return map[fileCategory.value] || FileIcon
})

function download() {
  emit('download', props.file)
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <BaseModal
    v-model:visible="modalVisible"
    width="90vw"
    max-width="1200px"
    dialog-class="file-preview-modal"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3 min-w-0">
          <component :is="categoryIcon" class="w-4 h-4 text-gray-400 shrink-0" />
          <span class="text-sm font-medium text-gray-900 truncate">{{ file?.name || t('taskDetail.filePreview', 'File preview') }}</span>
          <span v-if="file?.size" class="text-xs text-gray-400 shrink-0">{{ formatSize(file.size) }}</span>
        </div>
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0 ml-3"
          :title="t('common.download', 'Download')"
          @click="download"
        >
          <Download class="w-4 h-4" />
        </button>
      </div>
    </template>

    <!-- Content area -->
    <div class="flex items-center justify-center preview-content">
      <!-- Image -->
      <img
        v-if="fileCategory === 'image'"
        :src="file?.url"
        :alt="file?.name"
        class="max-w-full max-h-full object-contain rounded"
        @error="($event) => $event.target.style.display = 'none'"
      />

      <!-- PDF -->
      <iframe
        v-else-if="fileCategory === 'pdf'"
        :src="file?.url"
        class="w-full h-full rounded border border-gray-200"
        :title="file?.name"
      />

      <!-- Video -->
      <video
        v-else-if="fileCategory === 'video'"
        :src="file?.url"
        controls
        class="max-w-full max-h-full rounded"
        preload="metadata"
      >
        {{ t('taskDetail.videoNotSupported', 'Your browser does not support video playback.') }}
      </video>

      <!-- Audio -->
      <div v-else-if="fileCategory === 'audio'" class="flex flex-col items-center gap-6">
        <FileAudio class="w-16 h-16 text-gray-300" />
        <span class="text-sm text-gray-700">{{ file?.name }}</span>
        <audio :src="file?.url" controls preload="metadata" class="w-80">
          {{ t('taskDetail.audioNotSupported', 'Your browser does not support audio playback.') }}
        </audio>
      </div>

      <!-- Text -->
      <div v-else-if="fileCategory === 'text'" class="w-full h-full overflow-auto">
        <iframe
          :src="file?.url"
          class="w-full h-full bg-gray-50 rounded border border-gray-200"
          :title="file?.name"
        />
      </div>

      <!-- Unsupported / fallback -->
      <div v-else class="flex flex-col items-center gap-4 text-center py-12">
        <FileIcon class="w-16 h-16 text-gray-300" />
        <div>
          <p class="text-sm text-gray-700 font-medium">{{ file?.name }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ t('taskDetail.previewNotAvailable', 'Preview not available for this file type.') }}</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
          @click="download"
        >
          <Download class="w-4 h-4" />
          {{ t('common.download', 'Download') }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.preview-content {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
}

.preview-content iframe {
  min-height: 400px;
  height: 60vh;
}
</style>
