/**
 * Desidia v2 - UI Store
 * 
 * Manages UI state like sidebar, modals, loading states, and notifications
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ViewType } from '@/models'

export const useUIStore = defineStore('ui', () => {
  // ================================
  // State
  // ================================

  // Sidebar state
  const isSidebarCollapsed = ref(false)
  const isSidebarMobileOpen = ref(false)
  const sidebarExpandedSections = ref(['spaces', 'dashboards'])
  const sidebarCustomWidth = ref(parseInt(localStorage.getItem('sidebarWidth') || '288', 10))
  const isResizingSidebar = ref(false)

  // View state
  const currentView = ref(ViewType.LIST)
  const isTaskPanelOpen = ref(false)
  const myTasksViewMode = ref(ViewType.LIST)

  // Task Detail Sidebar state
  const taskDetailSidebarWidth = ref(parseInt(localStorage.getItem('taskDetailSidebarWidth') || '420', 10))
  const isResizingTaskDetailSidebar = ref(false)

  // Modal state
  const activeModal = ref(null)
  const modalData = ref(null)

  // Context menu state
  const contextMenu = ref({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
    width: '12rem',
    closeOnSelect: true,
    variant: 'default',
    data: null
  })
  const contextMenuRevision = ref(0)

  // Loading states
  const globalLoading = ref(false)
  const loadingMessage = ref('')

  // Toast notifications
  const toasts = ref([])
  let toastIdCounter = 0

  // Search
  const isSearchOpen = ref(false)
  const searchQuery = ref('')

  // Theme
  const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')

  // Responsive state
  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const isTablet = ref(typeof window !== 'undefined' ? (window.innerWidth >= 768 && window.innerWidth < 1024) : false)

  // ================================
  // Getters
  // ================================
  const sidebarWidth = computed(() => {
    if (isMobile.value) return '0px'
    if (isSidebarCollapsed.value) return '0px'
    return `${sidebarCustomWidth.value}px`
  })

  const hasActiveModal = computed(() => !!activeModal.value)

  const unreadToastCount = computed(() =>
    toasts.value.filter(t => !t.dismissed).length
  )

  // ================================
  // Sidebar Actions
  // ================================

  function toggleSidebar() {
    if (isMobile.value) {
      isSidebarMobileOpen.value = !isSidebarMobileOpen.value
    } else {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
      localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.value)
    }
  }

  function openMobileSidebar() {
    isSidebarMobileOpen.value = true
  }

  function closeMobileSidebar() {
    isSidebarMobileOpen.value = false
  }

  function toggleSidebarSection(section) {
    const index = sidebarExpandedSections.value.indexOf(section)
    if (index === -1) {
      sidebarExpandedSections.value.push(section)
    } else {
      sidebarExpandedSections.value.splice(index, 1)
    }
  }

  function isSectionExpanded(section) {
    return sidebarExpandedSections.value.includes(section)
  }

  /**
   * Set sidebar width with clamping (called frequently during resize)
   * Does NOT persist to localStorage - use persistSidebarWidth() for that
   */
  function setSidebarWidth(width) {
    const minWidth = 190
    const maxWidth = 400
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    sidebarCustomWidth.value = clampedWidth
  }

  /**
   * Persist sidebar width to localStorage (call once at end of resize)
   */
  function persistSidebarWidth() {
    localStorage.setItem('sidebarWidth', sidebarCustomWidth.value.toString())
  }

  function startResizingSidebar() {
    isResizingSidebar.value = true
  }

  function stopResizingSidebar() {
    isResizingSidebar.value = false
    // Persist to localStorage only when resize ends
    persistSidebarWidth()
  }

  // ================================
  // View Actions
  // ================================

  function setView(view) {
    if (Object.values(ViewType).includes(view)) {
      currentView.value = view
      localStorage.setItem('preferredView', view)
    }
  }

  function setMyTasksViewMode(view) {
    if (Object.values(ViewType).includes(view)) {
      myTasksViewMode.value = view
    }
  }

  function openTaskPanel() {
    isTaskPanelOpen.value = true
  }

  function closeTaskPanel() {
    isTaskPanelOpen.value = false
  }

  function toggleTaskPanel() {
    isTaskPanelOpen.value = !isTaskPanelOpen.value
  }

  /**
   * Set task detail sidebar width with clamping
   */
  function setTaskDetailSidebarWidth(width) {
    const minWidth = 320
    const maxWidth = 600
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    taskDetailSidebarWidth.value = clampedWidth
  }

  /**
   * Persist task detail sidebar width to localStorage
   */
  function persistTaskDetailSidebarWidth() {
    localStorage.setItem('taskDetailSidebarWidth', taskDetailSidebarWidth.value.toString())
  }

  function startResizingTaskDetailSidebar() {
    isResizingTaskDetailSidebar.value = true
  }

  function stopResizingTaskDetailSidebar() {
    isResizingTaskDetailSidebar.value = false
    persistTaskDetailSidebarWidth()
  }

  // ================================
  // Modal Actions
  // ================================

  function openModal(modalName, data = null) {
    activeModal.value = modalName
    modalData.value = data
  }

  function closeModal() {
    activeModal.value = null
    modalData.value = null
  }

  // ================================
  // Context Menu Actions
  // ================================

  function isRightClickEvent(event) {
    if (!event) return false
    return event.type === 'contextmenu' || event.button === 2
  }

  function normalizeContextMenuWidth(width) {
    if (typeof width === 'number') return `${width}px`
    if (typeof width === 'string' && width.trim()) return width
    return '12rem'
  }

  function wrapContextMenuItems(items, contextData) {
    return items.map((item) => {
      if (!item || typeof item !== 'object') return item

      const wrapped = { ...item }

      if (Array.isArray(item.items)) {
        wrapped.items = wrapContextMenuItems(item.items, contextData)
      }

      if (typeof item.action === 'function') {
        wrapped.action = () => item.action(contextData)
      }

      return wrapped
    })
  }

  function openContextMenu(event, options = {}) {
    if (!isRightClickEvent(event)) return

    event.preventDefault?.()
    event.stopPropagation?.()

    const menuItems = Array.isArray(options.items) ? options.items : []
    const contextData = options.data ?? null

    if (menuItems.length === 0) {
      closeContextMenu()
      return
    }

    contextMenu.value = {
      isOpen: true,
      x: Number.isFinite(event.clientX) ? event.clientX : 0,
      y: Number.isFinite(event.clientY) ? event.clientY : 0,
      items: wrapContextMenuItems(menuItems, contextData),
      width: normalizeContextMenuWidth(options.width),
      closeOnSelect: options.closeOnSelect !== false,
      variant: typeof options.variant === 'string' && options.variant ? options.variant : 'default',
      data: contextData
    }

    contextMenuRevision.value += 1
  }

  function updateContextMenuPosition(event) {
    if (!contextMenu.value.isOpen || !isRightClickEvent(event)) return

    event.preventDefault?.()
    event.stopPropagation?.()

    contextMenu.value = {
      ...contextMenu.value,
      x: Number.isFinite(event.clientX) ? event.clientX : contextMenu.value.x,
      y: Number.isFinite(event.clientY) ? event.clientY : contextMenu.value.y
    }

    contextMenuRevision.value += 1
  }

  function closeContextMenu() {
    if (!contextMenu.value.isOpen) return
    contextMenu.value = {
      ...contextMenu.value,
      isOpen: false
    }
  }

  // ================================
  // Loading Actions
  // ================================

  function setGlobalLoading(loading, message = '') {
    globalLoading.value = loading
    loadingMessage.value = message
  }

  // ================================
  // Toast Actions
  // ================================

  /**
   * Show a toast notification
   * @param {Object} options
   * @param {string} options.message - Toast message
   * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} options.duration - Duration in ms (0 for persistent)
   * @param {string} options.title - Optional title
   * @param {Function} options.action - Optional action callback
   * @param {string} options.actionLabel - Optional action button label
   */
  function showToast(options) {
    const toast = {
      id: ++toastIdCounter,
      message: options.message || '',
      type: options.type || 'info',
      title: options.title || '',
      duration: options.duration ?? 5000,
      action: options.action || null,
      actionLabel: options.actionLabel || '',
      dismissed: false,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    // Auto dismiss if duration > 0
    if (toast.duration > 0) {
      setTimeout(() => {
        dismissToast(toast.id)
      }, toast.duration)
    }

    return toast.id
  }

  function dismissToast(toastId) {
    const index = toasts.value.findIndex(t => t.id === toastId)
    if (index !== -1) {
      toasts.value[index].dismissed = true
      // Remove after animation
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== toastId)
      }, 300)
    }
  }

  function dismissAllToasts() {
    toasts.value.forEach(toast => {
      toast.dismissed = true
    })
    setTimeout(() => {
      toasts.value = []
    }, 300)
  }

  // Convenience methods
  function showSuccess(message, title = '') {
    return showToast({ message, title, type: 'success' })
  }

  function showError(message, title = '') {
    return showToast({ message, title, type: 'error', duration: 8000 })
  }

  function showWarning(message, title = '') {
    return showToast({ message, title, type: 'warning' })
  }

  function showInfo(message, title = '') {
    return showToast({ message, title, type: 'info' })
  }

  function getApiMessage(source, fallback = '') {
    if (!source) return fallback
    if (typeof source === 'string') return source
    return (
      source.message ||
      source.data?.message ||
      source.response?.data?.message ||
      source.response?.data?.detail ||
      source.detail ||
      fallback
    )
  }

  function showApiSuccess(response, fallback = '', title = '') {
    return showSuccess(getApiMessage(response, fallback), title)
  }

  function showApiError(error, fallback = '', title = '') {
    return showError(getApiMessage(error, fallback), title)
  }

  // ================================
  // Search Actions
  // ================================

  function openSearch() {
    isSearchOpen.value = true
  }

  function closeSearch() {
    isSearchOpen.value = false
    searchQuery.value = ''
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  // ================================
  // Theme Actions
  // ================================

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('darkMode', isDarkMode.value)
    document.documentElement.classList.toggle('dark', isDarkMode.value)
  }

  function setDarkMode(enabled) {
    isDarkMode.value = enabled
    localStorage.setItem('darkMode', enabled)
    document.documentElement.classList.toggle('dark', enabled)
  }

  // ================================
  // Responsive Actions
  // ================================

  function updateResponsiveState() {
    const width = window.innerWidth
    isMobile.value = width < 768
    isTablet.value = width >= 768 && width < 1024

    // Close mobile sidebar on resize to desktop
    if (!isMobile.value && isSidebarMobileOpen.value) {
      isSidebarMobileOpen.value = false
    }
  }

  // Initialize responsive listener
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateResponsiveState)

    // Initialize sidebar state from storage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed')
    if (savedCollapsed !== null) {
      isSidebarCollapsed.value = savedCollapsed === 'true'
    }

    // Initialize view from storage
    const savedView = localStorage.getItem('preferredView')
    if (savedView && Object.values(ViewType).includes(savedView)) {
      currentView.value = savedView
    }

    // Initialize dark mode
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
    }
  }

  return {
    // State
    isSidebarCollapsed,
    isSidebarMobileOpen,
    sidebarExpandedSections,
    sidebarCustomWidth,
    isResizingSidebar,
    currentView,
    myTasksViewMode,
    isTaskPanelOpen,
    taskDetailSidebarWidth,
    isResizingTaskDetailSidebar,
    activeModal,
    modalData,
    contextMenu,
    contextMenuRevision,
    globalLoading,
    loadingMessage,
    toasts,
    isSearchOpen,
    searchQuery,
    isDarkMode,
    isMobile,
    isTablet,

    // Getters
    sidebarWidth,
    hasActiveModal,
    unreadToastCount,

    // Sidebar Actions
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    toggleSidebarSection,
    isSectionExpanded,
    setSidebarWidth,
    persistSidebarWidth,
    startResizingSidebar,
    stopResizingSidebar,

    // View Actions
    setView,
    setMyTasksViewMode,
    openTaskPanel,
    closeTaskPanel,
    toggleTaskPanel,
    setTaskDetailSidebarWidth,
    persistTaskDetailSidebarWidth,
    startResizingTaskDetailSidebar,
    stopResizingTaskDetailSidebar,

    // Modal Actions
    openModal,
    closeModal,

    // Context Menu Actions
    openContextMenu,
    updateContextMenuPosition,
    closeContextMenu,

    // Loading Actions
    setGlobalLoading,

    // Toast Actions
    showToast,
    dismissToast,
    dismissAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    getApiMessage,
    showApiSuccess,
    showApiError,

    // Search Actions
    openSearch,
    closeSearch,
    setSearchQuery,

    // Theme Actions
    toggleDarkMode,
    setDarkMode,

    // Responsive Actions
    updateResponsiveState
  }
})

