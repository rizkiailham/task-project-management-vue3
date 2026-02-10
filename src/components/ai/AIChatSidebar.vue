<script setup>
/**
 * AIChatSidebar - Resizable AI chat sidebar panel
 * 
 * Features:
 * - Adjustable width with drag handle
 * - Chat messages display
 * - TipTap editor with @ mentions
 * - Skills section at bottom
 * - Breadcrumb navigation
 */
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useAIChatStore } from '@/stores'
import TipTapChatEditor from './TipTapChatEditor.vue'
import Button from 'primevue/button'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { Circle, ChevronDown, ChevronRight, Plus, Settings, Sparkles, Trash, X } from 'lucide-vue-next'

const props = defineProps({
  topOffset: {
    type: Number,
    default: 56
  }
})

const { t } = useI18n()
const confirm = useConfirm()
const aiChatStore = useAIChatStore()

// Refs
const sidebarRef = ref(null)
const chatContainerRef = ref(null)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// Computed
const isOpen = computed(() => aiChatStore.isChatSidebarOpen)
const sidebarWidth = computed(() => aiChatStore.chatSidebarWidth)
const messages = computed(() => aiChatStore.chatMessages)
const isGenerating = computed(() => aiChatStore.isGenerating)
const breadcrumbs = computed(() => aiChatStore.chatBreadcrumbs)
const featuredSkills = computed(() => aiChatStore.featuredSkills)
const connectionStatus = computed(() => aiChatStore.connectionStatus)
const currentPlan = computed(() => aiChatStore.currentPlan)
const currentChecks = computed(() => aiChatStore.currentChecks)
const currentToolCalls = computed(() => aiChatStore.currentToolCalls || [])     
const currentToolResults = computed(() => aiChatStore.currentToolResults || []) 
const canClearChat = computed(() => !isGenerating.value && messages.value.length > 0)
const autoScrollEnabled = ref(true)
const showJumpToLatest = ref(false)
const unreadCount = ref(0)
let jumpButtonTimeout = null
let scrollDebounceTimeout = null

// Thresholds with hysteresis to prevent flicker
const SCROLL_THRESHOLD_DISABLE = 80  // pixels from bottom to disable auto-scroll
const SCROLL_THRESHOLD_ENABLE = 40   // pixels from bottom to re-enable auto-scroll
const JUMP_BUTTON_DELAY = 300        // ms before showing jump button
const SCROLL_DEBOUNCE = 100          // ms debounce for scroll handler


// Markdown renderer for AI responses
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

function renderMarkdown(content = '') {
  if (!content) return ''
  const rawHtml = markdown.render(content)
  const sanitized = DOMPurify.sanitize(rawHtml)

  if (typeof window === 'undefined') {
    return sanitized
  }

  const wrapper = document.createElement('div')
  wrapper.innerHTML = sanitized
  wrapper.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
  })
  return wrapper.innerHTML
}

function hasThinking(message) {
  return (
    (message.plan && message.plan.length > 0) ||
    (message.checks && message.checks.length > 0) ||
    (message.toolCalls && message.toolCalls.length > 0) ||
    (message.toolResults && message.toolResults.length > 0)
  )
}

function getScrollDistance() {
  const container = chatContainerRef.value
  if (!container) return 0
  return container.scrollHeight - container.scrollTop - container.clientHeight
}

function scrollToBottom(behavior = 'auto') {
  const container = chatContainerRef.value
  if (!container) return
  container.scrollTo({ top: container.scrollHeight, behavior })
}

function handleChatScroll() {
  // Debounce scroll handling
  if (scrollDebounceTimeout) {
    clearTimeout(scrollDebounceTimeout)
  }
  
  scrollDebounceTimeout = setTimeout(() => {
    const distance = getScrollDistance()
    
    // Hysteresis: use different thresholds for enabling vs disabling
    if (autoScrollEnabled.value) {
      // Currently enabled - disable only if scrolled far enough up
      if (distance > SCROLL_THRESHOLD_DISABLE) {
        autoScrollEnabled.value = false
        scheduleJumpButton()
      }
    } else {
      // Currently disabled - re-enable only if scrolled close to bottom
      if (distance <= SCROLL_THRESHOLD_ENABLE) {
        autoScrollEnabled.value = true
        hideJumpButton()
        unreadCount.value = 0
      }
    }
  }, SCROLL_DEBOUNCE)
}

function scheduleJumpButton() {
  // Clear any existing timeout
  if (jumpButtonTimeout) {
    clearTimeout(jumpButtonTimeout)
  }
  
  // Delay showing the button to prevent flashing on quick scrolls
  jumpButtonTimeout = setTimeout(() => {
    if (!autoScrollEnabled.value) {
      showJumpToLatest.value = true
    }
  }, JUMP_BUTTON_DELAY)
}

function hideJumpButton() {
  if (jumpButtonTimeout) {
    clearTimeout(jumpButtonTimeout)
    jumpButtonTimeout = null
  }
  showJumpToLatest.value = false
}

function maybeAutoScroll() {
  nextTick(() => {
    if (autoScrollEnabled.value) {
      scrollToBottom('auto')
      hideJumpButton()
      unreadCount.value = 0
    }
    // Removed: don't show jump button here - let scroll handler manage it
  })
}

function jumpToLatest() {
  autoScrollEnabled.value = true
  hideJumpButton()
  unreadCount.value = 0
  scrollToBottom('smooth')
}

// Calculate sidebar style with proper positioning below topbar
const sidebarStyle = computed(() => ({
  width: `${sidebarWidth.value}px`,
  top: `${props.topOffset}px`,
  height: `calc(100vh - ${props.topOffset}px)`
}))

// Resize handlers
function startResize(e) {
  e.preventDefault()
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = sidebarWidth.value
  aiChatStore.startResizingChatSidebar()
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e) {
  if (!isResizing.value) return
  
  const diff = startX.value - e.clientX
  const newWidth = startWidth.value + diff
  aiChatStore.setChatSidebarWidth(newWidth)
}

function stopResize() {
  isResizing.value = false
  aiChatStore.stopResizingChatSidebar()
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Methods
function close() {
  aiChatStore.closeChatSidebar()
}

function newChat() {
  aiChatStore.startNewChat()
}


function clearCurrentChat() {
  if (!canClearChat.value) return
  confirm.require({
    message: t('aiChat.clearChatConfirm'),
    header: t('aiChat.clearChat'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      aiChatStore.clearConversation()
    }
  })
}

function handleSend({ content, mentions, attachments }) {
  const mention = mentions.length > 0 ? mentions[0] : null
  aiChatStore.sendMessage(content, mention, attachments)
  // Auto-scroll is handled by the watcher on messages.value.length
}

function executeSkill(skill) {
  aiChatStore.executeSkill(skill.id)
}

function formatFileSize(bytes = 0) {
  if (!bytes || bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  if (jumpButtonTimeout) clearTimeout(jumpButtonTimeout)
  if (scrollDebounceTimeout) clearTimeout(scrollDebounceTimeout)
})

watch(
  () => [
    messages.value.length,
    currentPlan.value.length,
    currentChecks.value.length,
    currentToolCalls.value.length,
    currentToolResults.value.length,
    isGenerating.value
  ],
  () => {
    maybeAutoScroll()
  }
)

watch(
  () => messages.value.length,
  (next, prev) => {
    if (next <= prev) return
    if (autoScrollEnabled.value) {
      unreadCount.value = 0
      return
    }
    unreadCount.value += next - prev
    showJumpToLatest.value = true
  }
)

watch(
  () => isOpen.value,
  (open) => {
    if (open) {
      nextTick(() => scrollToBottom('auto'))
    }
  }
)
</script>

<template>
  <Transition name="slide-left">
    <div
      v-if="isOpen"
      ref="sidebarRef"
      class="ai-chat-sidebar fixed right-0 bg-white border-l border-gray-200 shadow-xl z-[1000] flex flex-col"
      :style="sidebarStyle"
      :class="{ 'select-none': isResizing }"
    >
      <!-- Resize Handle -->
      <div
        class="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 transition-colors z-10"
        @mousedown="startResize"
      ></div>
      
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <Button
            @click="newChat"
            class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            unstyled
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('aiChat.newChat') }}</span>
          </Button>
          <!-- Connection Status -->
          <div class="flex items-center gap-1.5">
            <span 
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': connectionStatus === 'connected',
                'bg-yellow-500 animate-pulse': connectionStatus === 'connecting',
                'bg-gray-400': connectionStatus === 'disconnected',
                'bg-red-500': connectionStatus === 'error'
              }"
            ></span>
            <span class="text-xs text-gray-400">
              {{ connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : '' }}
            </span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Button
            @click="clearCurrentChat"
            :disabled="!canClearChat"
            class="p-1.5 rounded transition-colors"
            :class="canClearChat ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'"
            :title="t('aiChat.clearChat')"
            aria-label="Clear chat"
            unstyled
          >
            <Trash class="w-4 h-4" />
          </Button>
          <Button
            @click="close"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            unstyled
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <!-- Breadcrumbs -->
      <div class="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
        <Circle class="w-4 h-4" />
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
          <span v-if="index > 0" class="text-gray-300">&gt;</span>
          <Button
            class="hover:text-gray-700 transition-colors"
            :class="{ 'text-primary-600': crumb.type === 'task' }"
            unstyled
          >
            {{ crumb.label }}
          </Button>
        </template>
      </div>
      
      <!-- Chat Messages Area -->
      <div class="relative flex-1 min-h-0">
        <div
          ref="chatContainerRef"
          class="h-full overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 pb-16"
          @scroll="handleChatScroll"
        >
          <!-- Empty State -->
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
            <div class="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
              <Sparkles class="w-10 h-10 text-primary-500" />
            </div>
            <p class="text-sm">{{ t('aiChat.mentionHint') }}</p>
          </div>

          <!-- Messages -->
          <div v-for="message in messages" :key="message.id" class="message-item">
            <!-- User Message -->
            <div v-if="message.role === 'user'" class="flex justify-end">
              <div class="max-w-[80%] bg-primary-500 text-white rounded-2xl rounded-br-md px-4 py-2">
                <p v-if="message.content" class="text-sm">{{ message.content }}</p>
                <div
                  v-if="message.attachments && message.attachments.length"
                  class="mt-2 flex flex-wrap gap-2"
                >
                  <a
                    v-for="file in message.attachments"
                    :key="file.id || file.url"
                    :href="file.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2 py-1 text-xs text-white hover:bg-white/25 transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    <span class="truncate max-w-[140px]">{{ file.name }}</span>
                    <span class="text-white/70">{{ formatFileSize(file.size) }}</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- AI Message -->
            <div v-else class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles class="w-4 h-4 text-white" />
              </div>
              <div class="max-w-[80%] bg-white text-gray-800 rounded-2xl rounded-tl-md px-4 py-3 border border-gray-200 shadow-sm">
                <div v-if="hasThinking(message)" class="mb-2 rounded-lg border border-gray-200 bg-gray-50/70">
                  <div class="px-2 py-1.5 text-xs font-semibold text-gray-600 flex items-center gap-2">
                    <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary-500"></span>
                    Thinking
                  </div>
                  <div class="px-2 pb-2 pt-2 space-y-1 text-xs text-gray-600">
                    <details v-if="message.plan?.length" class="rounded-md border border-gray-200 bg-white">
                      <summary class="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold text-gray-500">Plan</summary>
                      <div class="px-2 pb-2 space-y-1">
                        <div
                          v-for="step in message.plan"
                          :key="step.id"
                          class="flex items-center gap-2 text-[11px] text-gray-700"
                        >
                          <span v-if="step.status === 'completed'" class="inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                          <span v-else-if="step.status === 'in_progress'" class="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <span v-else-if="step.status === 'blocked'" class="inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                          <span v-else class="inline-flex h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                          <span>{{ step.title }}</span>
                        </div>
                      </div>
                    </details>

                    <div v-if="message.checks?.length" class="rounded-md border border-gray-200 bg-white">
                      <div class="px-2 py-1 text-[11px] font-semibold text-gray-500">Checks</div>
                      <ul class="px-2 pb-2 space-y-1">
                        <li v-for="(check, idx) in message.checks" :key="idx" class="flex gap-2 text-[11px] text-gray-700">
                          <span class="inline-flex h-1.5 w-1.5 rounded-full bg-green-500 mt-1"></span>
                          <span>{{ check }}</span>
                        </li>
                      </ul>
                    </div>

                    <details v-if="message.toolCalls?.length || message.toolResults?.length" class="rounded-md border border-gray-200 bg-white">
                      <summary class="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold text-gray-500">Tool Details</summary>
                      <div class="px-2 pb-2 space-y-2">
                        <div v-if="message.toolCalls?.length">
                          <div class="font-semibold text-[10px] uppercase text-gray-400 mb-1">Tool Calls</div>
                          <pre class="text-[11px] bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto">{{ JSON.stringify(message.toolCalls, null, 2) }}</pre>
                        </div>
                        <div v-if="message.toolResults?.length">
                          <div class="font-semibold text-[10px] uppercase text-gray-400 mb-1">Tool Results</div>
                          <pre class="text-[11px] bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto">{{ JSON.stringify(message.toolResults, null, 2) }}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                <div class="ai-markdown text-sm" v-html="renderMarkdown(message.content)"></div>
              </div>
            </div>
          </div>

          <!-- Typing Indicator with Plan/Checks -->
          <div v-if="isGenerating" class="space-y-3">
            <div
              v-if="currentPlan.length || currentChecks.length || currentToolCalls.length || currentToolResults.length"
              class="rounded-lg border border-gray-200 bg-gray-50/80"
            >
              <div class="px-2 py-1.5 text-xs font-semibold text-gray-600 flex items-center gap-2">
                <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary-500"></span>
                Thinking
              </div>
              <div class="px-2 pb-2 pt-2 space-y-1 text-xs text-gray-600">
                <details v-if="currentPlan.length > 0" class="rounded-md border border-gray-200 bg-white">
                  <summary class="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold text-gray-500">Plan</summary>
                  <div class="px-2 pb-2 space-y-1">
                    <div
                      v-for="step in currentPlan"
                      :key="step.id"
                      class="flex items-center gap-2 text-[11px]"
                    >
                      <span v-if="step.status === 'completed'" class="inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      <span v-else-if="step.status === 'in_progress'" class="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span v-else-if="step.status === 'blocked'" class="inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      <span v-else class="inline-flex h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                      <span :class="step.status === 'completed' ? 'text-gray-600' : 'text-gray-800'">
                        {{ step.title }}
                      </span>
                    </div>
                  </div>
                </details>

                <div v-if="currentChecks.length > 0" class="rounded-md border border-gray-200 bg-white">
                  <div class="px-2 py-1 text-[11px] font-semibold text-gray-500">Checks</div>
                  <div class="px-2 pb-2 space-y-1">
                    <div
                      v-for="(check, idx) in currentChecks"
                      :key="idx"
                      class="flex items-start gap-2 text-[11px] text-gray-700"
                    >
                      <span class="inline-flex h-1.5 w-1.5 rounded-full bg-green-500 mt-1"></span>
                      <span>{{ check }}</span>
                    </div>
                  </div>
                </div>

                <details
                  v-if="currentToolCalls.length || currentToolResults.length"
                  class="rounded-md border border-gray-200 bg-white"
                >
                  <summary class="cursor-pointer select-none px-2 py-1 text-[11px] font-semibold text-gray-500">Tool Details</summary>
                  <div class="px-2 pb-2 space-y-2">
                    <div v-if="currentToolCalls.length">
                      <div class="font-semibold text-[10px] uppercase text-gray-400 mb-1">Tool Calls</div>
                      <pre class="text-[11px] bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto">{{ JSON.stringify(currentToolCalls, null, 2) }}</pre>
                    </div>
                    <div v-if="currentToolResults.length">
                      <div class="font-semibold text-[10px] uppercase text-gray-400 mb-1">Tool Results</div>
                      <pre class="text-[11px] bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto">{{ JSON.stringify(currentToolResults, null, 2) }}</pre>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <!-- Typing dots -->
            <div class="flex gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles class="w-4 h-4 text-white" />
              </div>
              <div class="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                <div class="flex gap-1">
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Transition name="fade-slide-up">
          <div
            v-if="!autoScrollEnabled && messages.length > 0"
            class="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center"
          >
            <div class="pointer-events-auto flex items-center gap-2">
              <div
                class="rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 shadow-sm backdrop-blur"
              >
                Auto-scroll paused
              </div>
              <Button
                v-if="showJumpToLatest"
                class="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                @click="jumpToLatest"
                unstyled
              >
                <ChevronDown class="w-3 h-3" />
                <span>Jump to latest</span>
                <span
                  v-if="unreadCount > 0"
                  class="inline-flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] px-1.5 min-w-[18px]"
                >
                  {{ unreadCount > 99 ? '99+' : unreadCount }}
                </span>
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Input Area -->
      <div class="px-4 py-3 border-t border-gray-200">
        <TipTapChatEditor
          :placeholder="t('aiChat.typeMessage')"
          :disabled="isGenerating"
          @send="handleSend"
        />
      </div>
      
      <!-- Skills Section -->
      <div class="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">{{ t('aiChat.skills') }}</span>
          <Button class="p-1 text-gray-400 hover:text-gray-600 transition-colors" unstyled>
            <Settings class="w-4 h-4" />
          </Button>
        </div>
        
        <!-- Featured Skills -->
        <div class="space-y-2">
          <Button
            v-for="skill in featuredSkills"
            :key="skill.id"
            @click="executeSkill(skill)"
            class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white transition-colors group"
            unstyled
          >
            <div class="flex items-center gap-3">
              <span class="text-lg">{{ skill.icon }}</span>
              <div class="text-left">
                <p class="text-sm font-medium text-gray-800">{{ skill.name }}</p>
                <p class="text-xs text-gray-500 truncate max-w-[200px]">{{ skill.description }}</p>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Slide animation */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(100%);
}

/* Jump button fade-slide animation */
.fade-slide-up-enter-active {
  transition: all 0.2s ease-out;
}

.fade-slide-up-leave-active {
  transition: all 0.15s ease-in;
}

.fade-slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Simple fade transition for indicator */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Resize handle hover effect */
.resize-handle:hover {
  background-color: #e5e7eb;
}

.resize-handle:active {
  background-color: #e5e7eb;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* AI markdown rendering */
.ai-markdown :deep(p) {
  margin: 0;
}

.ai-markdown :deep(p + p) {
  margin-top: 0.5rem;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.ai-markdown :deep(li) {
  margin: 0.25rem 0;
}

.ai-markdown :deep(strong) {
  font-weight: 600;
}

.ai-markdown :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.ai-markdown :deep(code) {
  background: #f3f4f6;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.85em;
}

.ai-markdown :deep(pre) {
  background: #6b7280;
  color: #f9fafb;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.ai-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}

.ai-markdown :deep(blockquote) {
  border-left: 3px solid #e5e7eb;
  padding-left: 0.75rem;
  color: #6b7280;
  margin: 0.5rem 0;
}

.ai-markdown :deep(table) {
  width: 100%;
  table-layout: fixed;
}

.ai-markdown :deep(th),
.ai-markdown :deep(td) {
  word-break: break-word;
}

details summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

details summary::-webkit-details-marker {
  display: none;
}

details summary::after {
  content: '+';
  margin-left: auto;
  color: #9ca3af;
  font-size: 0.75rem;
}

details[open] summary::after {
  content: '-';
  color: #6b7280;
}

/* History dropdown scrollbar */
.history-scroll::-webkit-scrollbar {
  width: 4px;
}

.history-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.history-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.history-scroll::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>



