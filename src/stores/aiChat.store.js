/**
 * Desidia v2 - AI Chat Store
 * 
 * Manages AI chat sidebar state, chat messages, skills, and WebSocket connection
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth.store'
import * as aiChatApi from '@/api/aiChat.api'

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

  // Persistence state
  const conversations = ref([])
  const isLoadingConversation = ref(false)
  
  // WebSocket state
  const connectionStatus = ref('disconnected') // 'connecting' | 'connected' | 'disconnected' | 'error'
  const currentRequestId = ref(null)
  const currentPlan = ref([])
  const currentChecks = ref([])
  const currentToolCalls = ref([])
  const currentToolResults = ref([])
  
  // Socket instance
  let socket = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 3
  
  // Skills - Dummy data for production-ready appearance
  const skills = ref([
    { id: 'find-users', name: 'Find users', icon: '👥', description: 'Search for users in projects' },
    { id: 'active-users', name: 'Active users', icon: '📊', description: 'Find users active in a time period' },
    { id: 'project-members', name: 'Project members', icon: '📋', description: 'List members of a project' },
    { id: 'enkel-pris', name: 'Enkel pris', icon: '🪙', description: 'Calculate simple pricing' },
    { id: 'new-report', name: 'New report', icon: '📝', description: 'Generate a new report' },
    { id: 'board-report', name: 'Board report', icon: '📋', description: 'Create a board meeting report' },
    { id: 'agenda', name: 'Agenda', icon: '📅', description: 'Create meeting agenda' },
    { id: 'brainstorm', name: 'Brainstorm new tasks', icon: '💡', description: 'Brainstorm and create new tasks' },
  ])
  
  // Recent tasks - Dummy data
  const recentTasks = ref([
    { id: 'task-1', title: 'Confirm task example', status: 'in-progress', statusIcon: '○' },
    { id: 'task-2', title: 'Review existing documentation', status: 'todo', statusIcon: '○' },
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
  const isConnected = computed(() => connectionStatus.value === 'connected')
  
  const lastMessage = computed(() =>
    chatMessages.value.length > 0
      ? chatMessages.value[chatMessages.value.length - 1]
      : null
  )

  // ================================
  // WebSocket Connection
  // ================================
  
  function connect() {
    if (socket?.connected) return
    
    const authStore = useAuthStore()
    if (!authStore.accessToken) {
      console.warn('Cannot connect to AI WebSocket: no auth token')
      return
    }
    
    connectionStatus.value = 'connecting'
    
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3333'
    
    socket = io(`${apiUrl}/ai`, {
      transports: ['websocket'],
      auth: {
        token: authStore.accessToken
      },
      query: {
        token: authStore.accessToken
      },
      reconnection: false, // We handle reconnection manually
    })
    
    socket.on('connect', () => {
      console.log('AI WebSocket connected')
      // Send auth message for browsers that can't set headers
      socket.emit('ai:auth', { token: authStore.accessToken })
    })
    
    socket.on('ai:ready', (data) => {
      console.log('AI WebSocket ready:', data)
      connectionStatus.value = 'connected'
      reconnectAttempts = 0
    })
    
    socket.on('ai:plan', (data) => {
      console.log('AI plan:', data)
      if (data.requestId === currentRequestId.value) {
        currentPlan.value = data.plan
      }
    })
    
    socket.on('ai:check', (data) => {
      console.log('AI check:', data)
      if (data.requestId === currentRequestId.value) {
        currentChecks.value.push(data.check)
      }
    })
    
    socket.on('ai:tool_call', (data) => {
      console.log('AI tool call:', data)
      if (data.requestId === currentRequestId.value) {
        currentToolCalls.value.push(data.toolCall)
      }
    })
    
    socket.on('ai:tool_result', (data) => {
      console.log('AI tool result:', data)
      if (data.requestId === currentRequestId.value) {
        currentToolResults.value.push(data.toolResult)
      }
    })
    
    socket.on('ai:final', (data) => {
      console.log('AI final:', data)
      if (data.requestId === currentRequestId.value) {
        // Add AI response to messages
        const aiMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          plan: data.plan,
          checks: data.checks,
          timestamp: new Date().toISOString()
        }
        chatMessages.value.push(aiMessage)
        isGenerating.value = false
        currentRequestId.value = null
      }
    })
    
    socket.on('ai:error', (data) => {
      console.error('AI error:', data)
      if (!data.requestId || data.requestId === currentRequestId.value) {
        const errorMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${data.error?.message || 'An error occurred'}`,
          isError: true,
          timestamp: new Date().toISOString()
        }
        chatMessages.value.push(errorMessage)
        isGenerating.value = false
        currentRequestId.value = null
      }
    })
    
    socket.on('disconnect', () => {
      console.log('AI WebSocket disconnected')
      connectionStatus.value = 'disconnected'
      attemptReconnect()
    })
    
    socket.on('connect_error', (error) => {
      console.error('AI WebSocket connection error:', error)
      connectionStatus.value = 'error'
      attemptReconnect()
    })
  }
  
  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    connectionStatus.value = 'disconnected'
  }
  
  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, falling back to HTTP')
      return
    }
    
    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 8000)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    setTimeout(() => {
      connect()
    }, delay)
  }

  // ================================
  // Sidebar Actions
  // ================================
  
  async function openChatSidebar() {
    isChatSidebarOpen.value = true
    await loadLatestConversation()
    // Connect to WebSocket when sidebar opens
    if (connectionStatus.value === 'disconnected') {
      connect()
    }
  }
  
  function closeChatSidebar() {
    isChatSidebarOpen.value = false
  }
  
  function toggleChatSidebar() {
    if (isChatSidebarOpen.value) {
      closeChatSidebar()
    } else {
      openChatSidebar()
    }
  }
  
  function setChatSidebarWidth(width) {
    const minWidth = 320
    const maxWidth = 600
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    chatSidebarWidth.value = clampedWidth
  }
  
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
  
  async function startNewChat() {
    await createNewConversation()
  }

  async function createNewConversation() {
    isLoadingConversation.value = true
    try {
      const response = await aiChatApi.createConversation()
      const conversation = response.conversation || response
      currentChatId.value = conversation.id
      chatMessages.value = []
      chatHistory.value = []
      currentPlan.value = []
      currentChecks.value = []
      currentToolCalls.value = []
      currentToolResults.value = []
      chatBreadcrumbs.value = [{ id: 'my-tasks', label: 'My tasks', type: 'project' }]
      conversations.value = [conversation, ...conversations.value]
    } finally {
      isLoadingConversation.value = false
    }
  }

  async function loadLatestConversation() {
    if (isLoadingConversation.value) return
    isLoadingConversation.value = true
    try {
      const response = await aiChatApi.listConversations()
      const list = response.conversations || response || []
      conversations.value = list

      if (list.length > 0) {
        await loadConversation(list[0].id)
      } else {
        await createNewConversation()
      }
    } finally {
      isLoadingConversation.value = false
    }
  }

  async function loadConversation(conversationId) {
    if (!conversationId) return
    isLoadingConversation.value = true
    try {
      const response = await aiChatApi.getConversation(conversationId)
      const conversation = response.conversation || response
      const messages = response.messages || []
      currentChatId.value = conversation.id
      chatMessages.value = messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt,
        metadata: message.metadata || {}
      }))
      currentPlan.value = []
      currentChecks.value = []
      currentToolCalls.value = []
      currentToolResults.value = []
    } finally {
      isLoadingConversation.value = false
    }
  }
  
  /**
   * Send a message to the AI
   */
  async function sendMessage(content, mention = null) {
    if (!content.trim()) return

    if (!currentChatId.value) {
      await createNewConversation()
    }

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      mention,
      timestamp: new Date().toISOString()
    }
    
    chatMessages.value.push(userMessage)
    isGenerating.value = true
    
    // Reset current state
    currentPlan.value = []
    currentChecks.value = []
    currentToolCalls.value = []
    currentToolResults.value = []
    
    // Generate request ID
    currentRequestId.value = crypto.randomUUID()
    
    // Build history for context
    const history = chatMessages.value
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10) // Last 10 messages for context
      .map(m => ({ role: m.role, content: m.content }))
    
    // Try WebSocket first
    if (socket?.connected) {
      socket.emit('ai:message', {
        requestId: currentRequestId.value,
        conversationId: currentChatId.value,
        message: content.trim(),
        history: history.slice(0, -1), // Exclude current message
        context: {},
        mode: 'execute'
      })
    } else {
      // Fallback to HTTP
      await sendMessageHttp(content.trim(), history.slice(0, -1))
    }
  }
  
  /**
   * HTTP fallback for sending messages
   */
  async function sendMessageHttp(content, history) {
    try {
      const data = await aiChatApi.sendChatMessage({
        conversationId: currentChatId.value,
        message: content,
        history,
        context: {},
        mode: 'execute'
      })
      
      // Update state with response
      currentPlan.value = data.plan || []
      currentChecks.value = data.checks || []
      
      const aiMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        plan: data.plan,
        checks: data.checks,
        timestamp: new Date().toISOString()
      }
      chatMessages.value.push(aiMessage)
    } catch (error) {
      console.error('HTTP fallback error:', error)
      const errorMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        isError: true,
        timestamp: new Date().toISOString()
      }
      chatMessages.value.push(errorMessage)
    } finally {
      isGenerating.value = false
      currentRequestId.value = null
    }
  }
  
  /**
   * Execute a skill
   */
  async function executeSkill(skillId) {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill) return
    
    // Map skill to a message
    let message = ''
    switch (skillId) {
      case 'find-users':
        message = 'Show me all users in the system'
        break
      case 'active-users':
        message = 'Find users who were active last week'
        break
      case 'project-members':
        message = 'List all projects and their members'
        break
      default:
        message = `Execute skill: ${skill.name}`
    }
    
    await sendMessage(message)
  }
  
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
  
  function clearChat() {
    chatMessages.value = []
    currentChatId.value = null
    currentPlan.value = []
    currentChecks.value = []
  }
  
  function clearState() {
    chatMessages.value = []
    currentChatId.value = null
    currentPlan.value = []
    currentChecks.value = []
    chatBreadcrumbs.value = [{ id: 'my-tasks', label: 'My tasks', type: 'project' }]
    disconnect()
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
    conversations,
    isLoadingConversation,
    skills,
    recentTasks,
    chatBreadcrumbs,
    connectionStatus,
    currentPlan,
    currentChecks,
    currentToolCalls,
    currentToolResults,
    
    // Getters
    chatSidebarWidthPx,
    featuredSkills,
    hasActiveChat,
    lastMessage,
    isConnected,
    
    // WebSocket Actions
    connect,
    disconnect,
    
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
    createNewConversation,
    loadLatestConversation,
    loadConversation,
    sendMessage,
    executeSkill,
    addTaskToBreadcrumbs,
    clearChat,
    clearState
  }
})
