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
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAIChatStore } from '@/stores'
import TipTapChatEditor from './TipTapChatEditor.vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  topOffset: {
    type: Number,
    default: 56
  }
})

const { t } = useI18n()
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
const conversations = computed(() => aiChatStore.conversations)
const currentChatId = computed(() => aiChatStore.currentChatId)
const isLoadingConversation = computed(() => aiChatStore.isLoadingConversation)
const isGenerating = computed(() => aiChatStore.isGenerating)
const breadcrumbs = computed(() => aiChatStore.chatBreadcrumbs)
const featuredSkills = computed(() => aiChatStore.featuredSkills)
const connectionStatus = computed(() => aiChatStore.connectionStatus)
const currentPlan = computed(() => aiChatStore.currentPlan)
const currentChecks = computed(() => aiChatStore.currentChecks)
const canClearChat = computed(() => !isGenerating.value && messages.value.length > 0)

const historyMenuRef = ref(null)

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

function handleHistoryOpen() {
  aiChatStore.refreshConversations()
}

function selectConversation(conversationId) {
  if (!conversationId) return
  aiChatStore.loadConversation(conversationId)
  historyMenuRef.value?.close()
}

function clearCurrentChat() {
  if (!canClearChat.value) return
  const confirmMessage = t('aiChat.clearChatConfirm')
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return
  }
  aiChatStore.clearConversation()
}

function handleSend({ content, mentions }) {
  const mention = mentions.length > 0 ? mentions[0] : null
  aiChatStore.sendMessage(content, mention)
  
  // Scroll to bottom after message
  setTimeout(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  }, 100)
}

function executeSkill(skill) {
  aiChatStore.executeSkill(skill.id)
}

function formatConversationTitle(conversation) {
  if (!conversation) return t('aiChat.newChat')
  const title = conversation.title?.trim()
  return title && title.length ? title : t('aiChat.newChat')
}

function formatConversationMeta(conversation) {
  if (!conversation?.lastMessageAt) {
    return t('aiChat.noMessages')
  }

  const date = new Date(conversation.lastMessageAt)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
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
          <button
            @click="newChat"
            class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{{ t('aiChat.newChat') }}</span>
          </button>
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
          <DropdownMenu
            ref="historyMenuRef"
            :items="[]"
            position="right"
            width="20rem"
            :close-on-select="false"
            @open="handleHistoryOpen"
          >
            <template #trigger>
              <button
                class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                :title="t('aiChat.history')"
                aria-label="History"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 7v5l3 3"></path>
                </svg>
              </button>
            </template>
            <template #content>
              <div class="px-3 py-2 border-b border-gray-100">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {{ t('aiChat.history') }}
                </span>
              </div>
              <div class="history-scroll max-h-72 overflow-y-auto py-1">
                <div v-if="isLoadingConversation" class="px-3 py-2 text-xs text-gray-400">
                  {{ t('common.loading') }}
                </div>
                <button
                  v-for="conversation in conversations"
                  :key="conversation.id"
                  @click="selectConversation(conversation.id)"
                  class="flex flex-col gap-0.5 w-full px-3 py-2 text-left transition-colors"
                  :class="conversation.id === currentChatId ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'"
                >
                  <span class="text-sm font-medium truncate">{{ formatConversationTitle(conversation) }}</span>
                  <span class="text-xs text-gray-400">{{ formatConversationMeta(conversation) }}</span>
                </button>
                <div
                  v-if="!isLoadingConversation && conversations.length === 0"
                  class="px-3 py-2 text-xs text-gray-400"
                >
                  {{ t('aiChat.noHistory') }}
                </div>
              </div>
            </template>
          </DropdownMenu>
          <button
            @click="clearCurrentChat"
            :disabled="!canClearChat"
            class="p-1.5 rounded transition-colors"
            :class="canClearChat ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'"
            :title="t('aiChat.clearChat')"
            aria-label="Clear chat"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M8 6v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"></path>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <button
            @click="close"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Breadcrumbs -->
      <div class="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
          <span v-if="index > 0" class="text-gray-300">›</span>
          <button
            class="hover:text-gray-700 transition-colors"
            :class="{ 'text-primary-600': crumb.type === 'task' }"
          >
            {{ crumb.label }}
          </button>
        </template>
      </div>
      
      <!-- Chat Messages Area -->
      <div ref="chatContainerRef" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <!-- Empty State -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
          <div class="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
            <svg class="w-10 h-10 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <p class="text-sm">{{ t('aiChat.mentionHint') }}</p>
        </div>
        
        <!-- Messages -->
        <div v-for="message in messages" :key="message.id" class="message-item">
          <!-- User Message -->
          <div v-if="message.role === 'user'" class="flex justify-end">
            <div class="max-w-[80%] bg-primary-500 text-white rounded-2xl rounded-br-md px-4 py-2">
              <p class="text-sm">{{ message.content }}</p>
            </div>
          </div>
          
          <!-- AI Message -->
          <div v-else class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="max-w-[80%] bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md px-4 py-2">
              <div class="ai-markdown text-sm" v-html="renderMarkdown(message.content)"></div>
            </div>
          </div>
        </div>
        
        <!-- Typing Indicator with Plan/Checks -->
        <div v-if="isGenerating" class="space-y-3">
          <!-- Plan Steps -->
          <div v-if="currentPlan.length > 0" class="bg-blue-50 rounded-lg p-3">
            <div class="text-xs font-medium text-blue-700 mb-2">Plan</div>
            <div class="space-y-1">
              <div 
                v-for="step in currentPlan" 
                :key="step.id"
                class="flex items-center gap-2 text-sm"
              >
                <span v-if="step.status === 'completed'" class="text-green-500">✓</span>
                <span v-else-if="step.status === 'in_progress'" class="text-blue-500 animate-pulse">●</span>
                <span v-else-if="step.status === 'blocked'" class="text-red-500">✗</span>
                <span v-else class="text-gray-400">○</span>
                <span :class="step.status === 'completed' ? 'text-gray-600' : 'text-gray-800'">
                  {{ step.title }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Checks -->
          <div v-if="currentChecks.length > 0" class="bg-green-50 rounded-lg p-3">
            <div class="text-xs font-medium text-green-700 mb-2">Checks</div>
            <div class="space-y-1">
              <div 
                v-for="(check, idx) in currentChecks" 
                :key="idx"
                class="flex items-start gap-2 text-sm text-gray-700"
              >
                <span class="text-green-500 mt-0.5">✓</span>
                <span>{{ check }}</span>
              </div>
            </div>
          </div>
          
          <!-- Typing dots -->
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
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
          <button class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            </svg>
          </button>
        </div>
        
        <!-- Featured Skills -->
        <div class="space-y-2">
          <button
            v-for="skill in featuredSkills"
            :key="skill.id"
            @click="executeSkill(skill)"
            class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white transition-colors group"
          >
            <div class="flex items-center gap-3">
              <span class="text-lg">{{ skill.icon }}</span>
              <div class="text-left">
                <p class="text-sm font-medium text-gray-800">{{ skill.name }}</p>
                <p class="text-xs text-gray-500 truncate max-w-[200px]">{{ skill.description }}</p>
              </div>
            </div>
            <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
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
  background: #e5e7eb;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.85em;
}

.ai-markdown :deep(pre) {
  background: #111827;
  color: #f9fafb;
  padding: 0.75rem;
  border-radius: 8px;
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

