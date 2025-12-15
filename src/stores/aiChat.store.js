/**
 * Desidia v2 - AI Chat Store
 * 
 * Manages AI chat sidebar state, chat messages, skills, and recent tasks
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAIChatStore = defineStore('aiChat', () => {
  // ================================
  // State
  // ================================
  
  // Sidebar state
  const isChatSidebarOpen = ref(false)
  const chatSidebarWidth = ref(parseInt(localStorage.getItem('aiChatSidebarWidth') || '360', 10))
  const isResizingChatSidebar = ref(false)
  
  // Chat state
  const currentChatId = ref(null)
  const chatMessages = ref([])
  const chatHistory = ref([])
  const isTyping = ref(false)
  const isGenerating = ref(false)
  
  // Skills - Dummy data for production-ready appearance
  const skills = ref([
    { id: 'enkel-pris', name: 'Enkel pris', icon: '🪙', description: 'Calculate simple pricing' },
    { id: 'new-report', name: 'New report', icon: '📝', description: 'Generate a new report' },
    { id: 'board-report', name: 'Board report', icon: '📋', description: 'Create a board meeting report' },
    { id: 'agenda', name: 'Agenda', icon: '📅', description: 'Create meeting agenda' },
    { id: 'booking-reply', name: 'Svare på booking henvendelser', icon: '💬', description: 'Reply to booking inquiries' },
    { id: 'price-inquiry', name: 'Price Inquiry Handler', icon: '💰', description: 'Handle price inquiry requests' },
    { id: 'extract-email', name: 'Extract newest email query', icon: '📧', description: 'Extract data from emails' },
    { id: 'brainstorm', name: 'Brainstorm new tasks', icon: '💡', description: 'Brainstorm and create new tasks that complement the project' },
    { id: 'plan-project', name: 'Plan this project', icon: '📆', description: 'Update all of the tasks in this dartboard to make them complete' },
    { id: 'standup-report', name: 'Standup report', icon: '📊', description: 'Write and save a doc that is a per-person standup report' },
    { id: 'changelog', name: 'Write a changelog', icon: '📜', description: 'Generate a changelog for the project' }
  ])
  
  // Recent tasks - Dummy data
  const recentTasks = ref([
    { id: 'task-1', title: 'Confirm asdKia asdasdasdasdasdasd...', status: 'in-progress', statusIcon: '○' },
    { id: 'task-2', title: 'Review existing documentation and agreeme...', status: 'todo', statusIcon: '○' },
    { id: 'task-3', title: 'Define success metrics for Test Kia initiative', status: 'todo', statusIcon: '○' },
    { id: 'task-4', title: 'Reference', status: 'done', statusIcon: '✓' },
    { id: 'task-5', title: 'Preoject reference VueJS', status: 'todo', statusIcon: '○' }
  ])
  
  // Chat breadcrumbs
  const chatBreadcrumbs = ref([
    { id: 'my-tasks', label: 'My tasks', type: 'project' }
  ])

  // ================================
  // Getters
  // ================================
  
  const chatSidebarWidthPx = computed(() => `${chatSidebarWidth.value}px`)
  
  const featuredSkills = computed(() => skills.value.slice(0, 3))
  
  const hasActiveChat = computed(() => chatMessages.value.length > 0)
  
  const lastMessage = computed(() => 
    chatMessages.value.length > 0 
      ? chatMessages.value[chatMessages.value.length - 1] 
      : null
  )

  // ================================
  // Sidebar Actions
  // ================================
  
  function openChatSidebar() {
    isChatSidebarOpen.value = true
  }
  
  function closeChatSidebar() {
    isChatSidebarOpen.value = false
  }
  
  function toggleChatSidebar() {
    isChatSidebarOpen.value = !isChatSidebarOpen.value
  }
  
  /**
   * Set sidebar width with clamping
   */
  function setChatSidebarWidth(width) {
    const minWidth = 320
    const maxWidth = 600
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    chatSidebarWidth.value = clampedWidth
  }
  
  /**
   * Persist sidebar width to localStorage
   */
  function persistChatSidebarWidth() {
    localStorage.setItem('aiChatSidebarWidth', chatSidebarWidth.value.toString())
  }
  
  function startResizingChatSidebar() {
    isResizingChatSidebar.value = true
  }
  
  function stopResizingChatSidebar() {
    isResizingChatSidebar.value = false
    persistChatSidebarWidth()
  }

  // ================================
  // Chat Actions
  // ================================
  
  function startNewChat() {
    currentChatId.value = `chat-${Date.now()}`
    chatMessages.value = []
    chatBreadcrumbs.value = [{ id: 'my-tasks', label: 'My tasks', type: 'project' }]
  }
  
  /**
   * Send a message to the AI
   * @param {string} content - Message content
   * @param {Object|null} mention - Optional mention data (skill or task)
   */
  async function sendMessage(content, mention = null) {
    if (!content.trim()) return
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      mention,
      timestamp: new Date().toISOString()
    }
    
    chatMessages.value.push(userMessage)
    isGenerating.value = true
    
    // Simulate AI response (replace with actual API call later)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: getSimulatedResponse(content, mention),
        timestamp: new Date().toISOString()
      }
      
      chatMessages.value.push(aiMessage)
    } finally {
      isGenerating.value = false
    }
  }
  
  /**
   * Get simulated AI response based on input
   */
  function getSimulatedResponse(content, mention) {
    if (mention?.type === 'skill') {
      return `I'll help you with "${mention.name}". Let me analyze the current context and provide relevant suggestions based on your project data.`
    }
    if (mention?.type === 'task') {
      return `Looking at the task "${mention.title}", I can see it's currently ${mention.status}. How would you like me to help with this task?`
    }
    return `I understand you're asking about: "${content}". Let me help you with that. Is there anything specific about your project tasks you'd like me to focus on?`
  }
  
  /**
   * Execute a skill
   */
  async function executeSkill(skillId) {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill) return
    
    isGenerating.value = true
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Executing "${skill.name}"... ${skill.description}`,
        skillExecution: true,
        timestamp: new Date().toISOString()
      }
      
      chatMessages.value.push(message)
    } finally {
      isGenerating.value = false
    }
  }
  
  /**
   * Add a task reference to breadcrumbs
   */
  function addTaskToBreadcrumbs(task) {
    const exists = chatBreadcrumbs.value.some(b => b.id === task.id)
    if (!exists) {
      chatBreadcrumbs.value.push({
        id: task.id,
        label: task.title,
        type: 'task'
      })
    }
  }
  
  /**
   * Clear chat
   */
  function clearChat() {
    chatMessages.value = []
    currentChatId.value = null
  }
  
  /**
   * Clear all state
   */
  function clearState() {
    chatMessages.value = []
    currentChatId.value = null
    chatBreadcrumbs.value = [{ id: 'my-tasks', label: 'My tasks', type: 'project' }]
  }

  return {
    // State
    isChatSidebarOpen,
    chatSidebarWidth,
    isResizingChatSidebar,
    currentChatId,
    chatMessages,
    chatHistory,
    isTyping,
    isGenerating,
    skills,
    recentTasks,
    chatBreadcrumbs,
    
    // Getters
    chatSidebarWidthPx,
    featuredSkills,
    hasActiveChat,
    lastMessage,
    
    // Sidebar Actions
    openChatSidebar,
    closeChatSidebar,
    toggleChatSidebar,
    setChatSidebarWidth,
    persistChatSidebarWidth,
    startResizingChatSidebar,
    stopResizingChatSidebar,
    
    // Chat Actions
    startNewChat,
    sendMessage,
    executeSkill,
    addTaskToBreadcrumbs,
    clearChat,
    clearState
  }
})

