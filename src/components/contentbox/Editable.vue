<template>
  <div class="is-wrapper" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import { upload } from '@/api'
import { splitContentHtml } from '@/modules/bulletin/contentbox/util'
import '@/assets/contentbox.css'
import '@/assets/contentbuilder.css'

const props = defineProps({
  contentHtml: { type: String, default: '' }
})

const emit = defineEmits(['ready', 'change'])
const { t } = useI18n()
const uiStore = useUIStore()

const builder = ref(null)
const hasInitialized = ref(false)

function isScriptAlreadyIncluded(src) {
  const scripts = document.getElementsByTagName('script')
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].getAttribute('src') === src) return true
  }
  return false
}

function loadLanguageFile(src) {
  return new Promise((resolve) => {
    if (isScriptAlreadyIncluded(src)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

async function uploadFile(event, onSuccess) {
  const file = event?.target?.files?.[0]
  if (!file) return

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

    onSuccess(url)
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function loadContent(contentHtml) {
  if (!builder.value) return
  const { html, mainCss, sectionCss } = splitContentHtml(contentHtml)
  builder.value.loadStyles(mainCss, sectionCss)
  builder.value.loadHtml(html)
}

function createBuilder() {
  const ContentBox = window.ContentBox
  if (!ContentBox) {
    uiStore.showError(t('bulletin.contentEditor.loadError'))
    return
  }

  builder.value = new ContentBox({
    wrapper: '.is-wrapper',
    canvas: true,
    previewURL: '/preview.html',
    controlPanel: true,
    iframeSrc: '/blank.html',
    zoom: 1,
    screenMode: 'desktop',
    onStart: () => {
      emit('ready')
    },
    AIToolbar: false,
    htmlButton: false,
    startAIAssistant: false,
    speechRecognitionLang: 'en-US',
    triggerWords: {
      send: ['send', 'okay', 'ok', 'execute', 'run'],
      abort: ['abort', 'cancel'],
      clear: ['clear', 'erase']
    },
    imageSelect: '/assets.html',
    videoSelect: '/assets.html',
    audioSelect: '/assets.html',
    fileSelect: '/assets.html',
    mediaSelect: '/assets.html',
    slider: 'glide',
    navbar: true,
    onUploadCoverImage: (event) => {
      uploadFile(event, (url) => {
        builder.value?.boxImage(url)
      })
    },
    onImageUpload: (event) => {
      uploadFile(event, (url) => {
        builder.value?.returnUrl(url)
      })
    },
    onVideoUpload: (event) => {
      uploadFile(event, (url) => {
        builder.value?.returnUrl(url)
      })
    },
    onAudioUpload: (event) => {
      uploadFile(event, (url) => {
        builder.value?.returnUrl(url)
      })
    },
    onMediaUpload: (event) => {
      uploadFile(event, (url) => {
        builder.value?.returnUrl(url)
      })
    },
    onFileUpload: (event) => {
      uploadFile(event, (url) => {
        builder.value?.returnUrl(url)
      })
    },
    onChange: () => {
      emit('change')
    },
    templates: [
      {
        url: '/assets/templates-simple/templates.js',
        path: '/assets/templates-simple/',
        pathReplace: [],
        numbering: true,
        showNumberOnHover: true
      },
      {
        url: '/assets/templates-quick/templates.js',
        path: '/assets/templates-quick/',
        pathReplace: [],
        numbering: true,
        showNumberOnHover: true
      },
      {
        url: '/assets/templates-animated/templates.js',
        path: '/assets/templates-animated/',
        pathReplace: [],
        numbering: true,
        showNumberOnHover: true
      }
    ],
    modulePath: '/assets/modules/',
    fontAssetPath: '/assets/fonts/',
    assetPath: '/assets/',
    contentStylePath: '/assets/styles/',
    snippetUrl: '/assets/minimalist-blocks/content.js',
    snippetPath: '/assets/minimalist-blocks/',
    pluginPath: '/contentbuilder/'
  })

  builder.value.addButton({
    pos: 2,
    title: t('common.undo'),
    html:
      '<svg class="is-icon-flex" style="width:14px;height:14px;"><use xlink:href="#icon-undo"></use></svg>',
    onClick: () => {
      builder.value?.undo()
    }
  })

  builder.value.addButton({
    pos: 3,
    title: t('common.redo'),
    html:
      '<svg class="is-icon-flex" style="width:14px;height:14px;"><use xlink:href="#icon-redo"></use></svg>',
    onClick: () => {
      builder.value?.redo()
    }
  })

  builder.value.addButton({
    pos: 9,
    title: t('common.preview'),
    html:
      '<svg class="is-icon-flex" style="width:16px;height:16px;"><use xlink:href="#icon-eye"></use></svg>',
    onClick: () => {
      const html = builder.value?.html() || ''
      const mainCss = builder.value?.mainCss() || ''
      const sectionCss = builder.value?.sectionCss() || ''
      localStorage.setItem('preview-html', html)
      localStorage.setItem('preview-maincss', mainCss)
      localStorage.setItem('preview-sectioncss', sectionCss)
      window.open('/preview.html', '_blank')?.focus()
    }
  })

  loadContent(props.contentHtml)
}

onMounted(async () => {
  localStorage.removeItem('_zoom')
  await loadLanguageFile('/contentbox/lang/en.js')
  createBuilder()
  hasInitialized.value = true
})

onBeforeUnmount(() => {
  builder.value?.destroy()
  builder.value = null
})

watch(
  () => props.contentHtml,
  (content) => {
    if (!hasInitialized.value) return
    loadContent(content)
  }
)

function getContent() {
  if (!builder.value) {
    return { html: '', mainCss: '', sectionCss: '' }
  }
  return {
    html: builder.value.html(),
    mainCss: builder.value.mainCss(),
    sectionCss: builder.value.sectionCss()
  }
}

defineExpose({ getContent })
</script>
