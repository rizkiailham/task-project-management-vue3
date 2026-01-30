<script setup>
/**
 * AIChatButton - Split button with AI chat trigger and skills dropdown
 * 
 * Features:
 * - Main button opens AI chat sidebar
 * - Arrow button opens skills dropdown menu
 * - Skills list with icons and descriptions
 * - Settings link at bottom
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAIChatStore } from '@/stores'

const { t } = useI18n()
const aiChatStore = useAIChatStore()

// Refs
const isDropdownOpen = ref(false)
const buttonRef = ref(null)
const dropdownRef = ref(null)

// Skills with emojis matching the reference design
const skillsList = computed(() => aiChatStore.skills)

// Dropdown position computed
const dropdownStyle = computed(() => {
  if (!buttonRef.value || typeof window === 'undefined') {
    return { top: '0', right: '0' }
  }
  const rect = buttonRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
})

// Methods
function openChat() {
  aiChatStore.openChatSidebar()
}

function toggleDropdown(event) {
  event.stopPropagation()
  isDropdownOpen.value = !isDropdownOpen.value
  
  if (isDropdownOpen.value) {
    document.addEventListener('click', handleClickOutside)
  }
}

function closeDropdown() {
  isDropdownOpen.value = false
  document.removeEventListener('click', handleClickOutside)
}

function handleClickOutside(event) {
  if (
    dropdownRef.value && 
    !dropdownRef.value.contains(event.target) &&
    buttonRef.value &&
    !buttonRef.value.contains(event.target)
  ) {
    closeDropdown()
  }
}

function handleSkillClick(skill) {
  aiChatStore.openChatSidebar()
  aiChatStore.executeSkill(skill.id)
  closeDropdown()
}

function openSkillsSettings() {
  // TODO: Navigate to skills settings
  closeDropdown()
}
</script>

<template>
  <div class="ai-chat-button-wrapper relative" ref="buttonRef">
    <!-- Split Button -->
    <div class="flex items-stretch">
      <!-- Main AI Chat Button -->
      <button
        @click="openChat"
        class="flex items-center gap-2 h-8 pl-3 pr-2 rounded-l-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
          <path d="M20 3v4"/>
          <path d="M22 5h-4"/>
        </svg>
        <span>{{ t('editor.bubble.askAI') }}</span>
      </button>
      
      <!-- Dropdown Arrow Button -->
      <button
        @click="toggleDropdown"
        class="flex items-center justify-center h-8 px-2 rounded-r-md bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm border-l border-purple-500/40"
      >
        <svg 
          class="w-3.5 h-3.5 transition-transform duration-200" 
          :class="{ 'rotate-180': isDropdownOpen }"
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isDropdownOpen"
          ref="dropdownRef"
          class="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999] w-64"
          :style="dropdownStyle"
        >
          <!-- Skills Header -->
          <div class="px-3 py-1.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {{ t('aiChat.skills') }}
            </span>
          </div>
          
          <!-- Skills List -->
          <div class="max-h-72 overflow-y-auto">
            <button
              v-for="skill in skillsList"
              :key="skill.id"
              @click="handleSkillClick(skill)"
              class="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <span class="text-lg flex-shrink-0">{{ skill.icon }}</span>
              <span class="truncate">{{ skill.name }}</span>
            </button>
          </div>
          
          <!-- Divider -->
          <div class="border-t border-gray-100 my-1"></div>
          
          <!-- Skills Settings -->
          <button
            @click="openSkillsSettings"
            class="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            </svg>
            <span>{{ t('aiChat.skillsSettings') }}</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
  transform-origin: top right;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* Custom scrollbar for skills list */
.max-h-72::-webkit-scrollbar {
  width: 4px;
}

.max-h-72::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-72::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.max-h-72::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>

