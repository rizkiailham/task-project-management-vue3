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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAIChatStore } from '@/stores'
import TipTapChatEditor from './TipTapChatEditor.vue'
import Avatar from 'primevue/avatar'

const { t } = useI18n()
const aiChatStore = useAIChatStore()

// Topbar height constant
const TOPBAR_HEIGHT = 56

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

// Calculate sidebar style with proper positioning below topbar
const sidebarStyle = computed(() => ({
  width: `${sidebarWidth.value}px`,
  top: `${TOPBAR_HEIGHT}px`,
  height: `calc(100vh - ${TOPBAR_HEIGHT}px)`
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

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
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
      class="ai-chat-sidebar fixed right-0 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col"
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
        
        <div class="flex items-center gap-2">
          <button class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
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
              <p class="text-sm">{{ message.content }}</p>
            </div>
          </div>
        </div>
        
        <!-- Typing Indicator -->
        <div v-if="isGenerating" class="flex gap-3">
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
</style>

