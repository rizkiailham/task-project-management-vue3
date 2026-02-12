<script setup>
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useBulletinStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import Editable from '@/components/contentbox/Editable.vue'
import { mergeContentHtml } from '@/modules/bulletin/contentbox/util'

const route = useRoute()
const router = useRouter()
const bulletinStore = useBulletinStore()
const uiStore = useUIStore()
const { t } = useI18n()

const bulletinId = computed(() => route.params.bulletinId || route.params.id)
const bulletin = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isAssetsReady = ref(false)
const isDirty = ref(false)
const editorRef = ref(null)

const headerTitle = computed(() => t('bulletin.contentEditor.title'))
const headerSubtitle = computed(() => bulletin.value?.title || t('bulletin.contentEditor.untitled'))

function confirmLeave() {
  if (!isDirty.value) return true
  return window.confirm(t('bulletin.contentEditor.confirmLeave'))
}

onBeforeRouteLeave(() => {
  return confirmLeave()
})

function loadStyleOnce(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    document.head.appendChild(link)
  })
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

async function ensureContentBoxAssets() {
  const styleUrls = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.2/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/@furcan/iconpicker@1.5.0/dist/iconpicker-1.5.0.css',
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Lobster&family=Playfair+Display&family=Raleway&family=Cutive+Mono&display=swap',
    '/contentbox/contentbox.css',
    '/assets/scripts/glide/css/glide.core.css',
    '/assets/scripts/glide/css/glide.theme.css',
    '/assets/scripts/navbar/navbar.css'
  ]

  const scriptUrls = [
    'https://cdn.jsdelivr.net/npm/@furcan/iconpicker@1.5.0/dist/iconpicker-1.5.0.min.js',
    'https://cdn.rawgit.com/beautify-web/js-beautify/v1.13.6/js/lib/beautify-html.js',
    '/assets/scripts/glide/glide.js',
    '/assets/scripts/navbar/navbar.min.js',
    '/box/box-flex.js',
    '/contentbox/contentbox.js'
  ]

  await Promise.all(styleUrls.map(loadStyleOnce))
  for (const src of scriptUrls) {
    await loadScriptOnce(src)
  }
  isAssetsReady.value = true
}

async function fetchBulletin() {
  if (!bulletinId.value) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const data = await bulletinStore.fetchBulletin(bulletinId.value)
    bulletin.value = data
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([ensureContentBoxAssets(), fetchBulletin()])
  } catch (error) {
    uiStore.showApiError(error)
  }
})

function markDirty() {
  isDirty.value = true
}

async function handleSave() {
  if (!editorRef.value || !bulletinId.value) return
  isSaving.value = true
  try {
    const { html, mainCss, sectionCss } = editorRef.value.getContent()
    const content = mergeContentHtml(html, mainCss, sectionCss)
    const response = await bulletinStore.updateBulletin(bulletinId.value, { content })
    uiStore.showApiSuccess(response)
    isDirty.value = false
    if (response?.bulletin) {
      bulletin.value = { ...bulletin.value, ...response.bulletin }
    }
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  if (!confirmLeave()) return
  router.push({ name: 'Bulletin' })
}
</script>

<template>
  <div class="content-editor-view">
    <div class="content-editor-header">
      <div class="header-copy">
        <div class="header-title">{{ headerTitle }}</div>
        <div class="header-subtitle">{{ headerSubtitle }}</div>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="editor-btn editor-btn-secondary"
          @click="handleClose"
          :disabled="isSaving"
        >
          {{ t('common.close') }}
        </button>
        <button
          type="button"
          class="editor-btn editor-btn-primary"
          @click="handleSave"
          :disabled="isSaving || isLoading || !isAssetsReady"
        >
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </div>

    <div class="content-editor-body">
      <div v-if="isLoading || !isAssetsReady" class="content-editor-loading">
        <div class="text-sm text-gray-500">{{ t('common.loading') }}</div>
      </div>
      <Editable
        v-else
        ref="editorRef"
        :contentHtml="bulletin?.content || ''"
        @change="markDirty"
      />
    </div>
  </div>
</template>

<style scoped>
.content-editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
}

.content-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
  gap: 16px;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 15px;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.header-subtitle {
  font-size: 12px;
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  transition: all 0.15s ease;
}

.editor-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.editor-btn-primary {
  background-color: #2563eb;
  color: var(--color-white);
}

.editor-btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.editor-btn-secondary {
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  color: var(--color-gray-700);
}

.editor-btn-secondary:hover:not(:disabled) {
  border-color: #cbd5f5;
  color: var(--color-gray-800);
}

.content-editor-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

.content-editor-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.is-wrapper) {
  height: 100%;
}
</style>





