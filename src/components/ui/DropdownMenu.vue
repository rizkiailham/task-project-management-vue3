<script setup>
/**
 * DropdownMenu - Reusable dropdown menu component
 * 
 * Features:
 * - Customizable trigger slot
 * - Menu items with icons, labels, and keyboard shortcuts
 * - Section headers and dividers
 * - Click outside to close
 * - Smooth animations
 * - Configurable position (left, right)
 * 
 * @example
 * <DropdownMenu :items="menuItems" position="left">
 *   <template #trigger>
 *     <button>Open Menu</button>
 *   </template>
 * </DropdownMenu>
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ChevronRight, Check } from 'lucide-vue-next'

const props = defineProps({
  /**
   * Menu items array
   * Each item can have: { type, label, icon, shortcut, action, disabled }
   * type: 'item' | 'divider' | 'header'
   */
  items: {
    type: Array,
    default: () => []
  },
  /**
   * Dropdown position relative to trigger (horizontal)
   */
  position: {
    type: String,
    default: 'left',
    validator: (val) => ['left', 'right'].includes(val)
  },
  /**
   * Open dropdown upwards (above trigger) instead of downwards
   */
  openUp: {
    type: Boolean,
    default: false
  },
  /**
   * Width of the dropdown menu
   */
  width: {
    type: String,
    default: '13rem'
  },
  /**
   * Optional fixed anchor coordinates in viewport pixels
   * When provided, menu positioning uses this point instead of trigger bounds.
   */
  anchor: {
    type: Object,
    default: null
  },
  /**
   * Distance in px between trigger and menu
   */
  offset: {
    type: [Number, String],
    default: 8
  },
  /**
   * Close dropdown when clicking an item
   */
  closeOnSelect: {
    type: Boolean,
    default: true
  },
  /**
   * Position custom content slot before or after items
   */
  contentPosition: {
    type: String,
    default: 'after',
    validator: (val) => ['before', 'after'].includes(val)
  },
  /**
   * Visual variant for menu styling
   */
  variant: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['open', 'close', 'select'])

const isOpen = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)
const instanceId = `dropdown-${Math.random().toString(36).slice(2, 9)}`
const viewportWidth = ref(0)
const menuHeightTick = ref(0)

function resolveMinDropdownHeight() {
  if (!menuRef.value) return 300
  const minHeightEl = menuRef.value.querySelector('[data-dropdown-min-height]')
  if (!minHeightEl) return 300
  const raw = minHeightEl.getAttribute('data-dropdown-min-height')
  const parsed = Number.parseFloat(raw || '')
  return Number.isNaN(parsed) ? 300 : parsed
}

function resolveMenuWidth() {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    if (rect.width) return rect.width
  }

  if (typeof props.width === 'number') return props.width
  if (typeof props.width !== 'string') return 0

  const parsed = Number.parseFloat(props.width)
  if (Number.isNaN(parsed)) return 0
  if (props.width.endsWith('rem')) {
    const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return parsed * rootSize
  }
  if (props.width.endsWith('em')) {
    const baseSize = triggerRef.value
      ? Number.parseFloat(getComputedStyle(triggerRef.value).fontSize)
      : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return parsed * baseSize
  }
  return parsed
}

function resolveAnchorRect() {
  if (!props.anchor || typeof props.anchor !== 'object') return null
  const x = Number(props.anchor.x)
  const y = Number(props.anchor.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    left: x,
    right: x,
    top: y,
    bottom: y
  }
}

const menuStyle = computed(() => {
  if (typeof window === 'undefined') return { width: props.width, top: '0', left: '0' }
  const vw = viewportWidth.value // Dependency to trigger re-calc on resize
  const heightTick = menuHeightTick.value // Force recompute after open
  const anchorRect = resolveAnchorRect()

  if (!triggerRef.value && !anchorRect) {
    return { width: props.width, top: '0', left: '0' }
  }

  const rect = anchorRect || triggerRef.value.getBoundingClientRect()
  const viewportPadding = 8
  const parsedOffset = Number.parseFloat(String(props.offset))
  const menuOffset = Number.isNaN(parsedOffset) ? 8 : parsedOffset
  const menuWidth = resolveMenuWidth()
  const viewportHeight = window.innerHeight
  const availableTop = rect.top - viewportPadding
  const availableBottom = viewportHeight - rect.bottom - viewportPadding
  const shouldOpenUp = props.openUp && availableTop >= 120

  // Calculate vertical position (with auto-flip)
  let verticalStyle = {}
  
  // Decide whether to open up or down based on space
  // Default decision based on props
  let effectiveOpenUp = props.openUp && availableTop >= 120;
  
  // Auto-flip if not enough space below but enough space above
  // Increase threshold to account for expanded content (e.g. Color Picker)
  const minDropdownHeight = resolveMinDropdownHeight()
  if (!effectiveOpenUp && availableBottom < minDropdownHeight && availableTop > availableBottom) {
    effectiveOpenUp = true
  }
  
  if (effectiveOpenUp) {
    // Open upwards: position bottom of menu at top of trigger
    verticalStyle = {
      bottom: `${viewportHeight - rect.top + menuOffset}px`,
      top: 'auto',
      maxHeight: `${Math.max(availableTop, 120)}px`
    }
  } else {
    // Open downwards: position top of menu at bottom of trigger
    verticalStyle = {
      top: `${Math.max(rect.bottom + menuOffset, viewportPadding)}px`,
      bottom: 'auto',
      maxHeight: `${Math.max(availableBottom, 120)}px`
    }
  }

  if (props.position === 'right') {
    const right = Math.max(viewportPadding, viewportWidth.value - rect.right)
    return {
      width: props.width,
      ...verticalStyle,
      right: `${right}px`,
      left: 'auto'
    }
  }

  const maxLeft = Math.max(viewportPadding, viewportWidth.value - menuWidth - viewportPadding)
  const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft)

  return {
    width: props.width,
    ...verticalStyle,
    left: `${left}px`,
    right: 'auto'
  }
})

const menuClass = computed(() => {
  if (props.variant === 'dark') {
    return 'dropdown-menu dropdown-menu--dark fixed rounded-[6px] shadow-md py-1 z-[9999] overflow-y-auto overflow-x-hidden'
  }
  if (props.variant === 'sidebar') {
    return 'dropdown-menu fixed bg-[#f3f5f7] rounded-[6px] shadow-md border border-gray-200 py-1 z-[9999] overflow-y-auto overflow-x-hidden'
  }
  return 'dropdown-menu fixed bg-[#f3f5f7] rounded-[6px] shadow-md border border-gray-300 py-1 z-[9999] overflow-y-auto overflow-x-hidden'
})

const dividerClass = computed(() => {
  if (props.variant === 'sidebar') {
    return 'border-t border-gray-200 my-1'
  }
  return 'border-t border-gray-200 my-1'
})

const itemBaseClass = computed(() => {
  if (props.variant === 'sidebar') {
    return 'flex items-center justify-between w-full px-3 py-2 text-sm transition-colors'
  }
  return 'flex items-center justify-between w-full px-3 py-2 text-sm transition-colors'
})

const itemActiveClass = computed(() => {
  if (props.variant === 'sidebar') {
    return 'text-gray-700 hover:bg-[#e5e6ec]'
  }
  return 'text-gray-700 hover:bg-[#e5e6ec]'
})

const headerClass = computed(() => {
  if (props.variant === 'sidebar') {
    return 'px-3 py-2'
  }
  return 'px-3 py-2'
})

function toggle() {
  isOpen.value = !isOpen.value
}

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function handleItemClick(item, event) {
  if (item.disabled) return

  // Stop propagation to prevent click outside handler from interfering
  event.stopPropagation()

  emit('select', item)

  // Close first for immediate visual feedback
  if (props.closeOnSelect) {
    close()
  }

  // Then execute action
  if (item.action && typeof item.action === 'function') {
    item.action()
  }
}

function handleClickOutside(event) {
  // Use nextTick timing to ensure click events are processed first
  if (
    menuRef.value &&
    !menuRef.value.contains(event.target) &&
    (!triggerRef.value || !triggerRef.value.contains(event.target))
  ) {
    close()
  }
}

function handleEscape(event) {
  if (event.key === 'Escape' && isOpen.value) {
    close()
  }
}

function handlePeerOpen(event) {
  if (event.detail !== instanceId) {
    close()
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    emit('open')
    window.dispatchEvent(new CustomEvent('dropdown-open', { detail: instanceId }))
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    setTimeout(() => {
      menuHeightTick.value += 1
    }, 0)
  } else {
    emit('close')
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  window.removeEventListener('dropdown-open', handlePeerOpen)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

onMounted(() => {
  window.addEventListener('dropdown-open', handlePeerOpen)
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
    window.addEventListener('resize', handleResize)
  }
})

function handleResize() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Submenu handling
const activeSubmenuKey = ref(null)
const submenuPosition = ref({ top: 0, left: 0 })
const submenuTimeout = ref(null)

const submenuStyle = computed(() => {
  return {
    top: `${submenuPosition.value.top}px`,
    left: `${submenuPosition.value.left}px`
  }
})

function handleSubmenuEnter(item, event) {
  if (submenuTimeout.value) clearTimeout(submenuTimeout.value)
  
  // Use key if available, otherwise fallback to item itself (though key is safer)
  // Ensure we have a valid key for comparison
  const key = item.key || item.label || item.id
  if (!key) return 
  
  activeSubmenuKey.value = key
  
  // Calculate position
  const rect = event.currentTarget.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const submenuWidth = 192 // 12rem approx
  
  // Overlap slightly to ensure mouse move doesn't trigger leave
  let left = rect.right
  // Flip if not enough space on right
  if (left + submenuWidth > viewportWidth) {
    left = rect.left - submenuWidth
  }
  
  submenuPosition.value = {
    top: rect.top - 4, // Align slightly higher
    left: left - 5 // Overlap by 5px
  }
}

function handleSubmenuClick(item, event) {
  const key = item.key || item.label || item.id
  if (!key) return

  if (activeSubmenuKey.value === key) {
    activeSubmenuKey.value = null
  } else {
    handleSubmenuEnter(item, event)
  }
}

function handleSubmenuLeave() {
  submenuTimeout.value = setTimeout(() => {
    activeSubmenuKey.value = null
  }, 100)
}

function handleSubmenuListEnter() {
  if (submenuTimeout.value) clearTimeout(submenuTimeout.value)
}

// Expose methods for parent component
defineExpose({ open, close, toggle, isOpen })
</script>

<template>
  <div class="dropdown-menu-wrapper relative inline-block">
    <!-- Trigger Slot -->
    <div ref="triggerRef" @click.stop="toggle" class="dropdown-trigger cursor-pointer">
      <slot name="trigger"></slot>
    </div>

    <!-- Menu Portal - Rendered at body level to avoid overflow issues -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="menuRef"
          :class="menuClass"
          :style="menuStyle"
        >
          <template v-if="contentPosition === 'before'">
            <slot name="content"></slot>
          </template>

          <template v-for="(item, index) in items" :key="item.key || index">
            <!-- Divider -->
            <div v-if="item.type === 'divider'" :class="dividerClass"></div>
            
            <!-- Section Header -->
            <div v-else-if="item.type === 'header'" :class="headerClass">
              <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{{ item.label }}</span>
            </div>
            
            <!-- Menu Item -->
            <!-- Submenu Item (has items) -->
            <!-- Submenu Item (has items) -->
            <div
              v-else-if="item.items && item.items.length"
              class="relative w-full"
              @click.stop="handleSubmenuClick(item, $event)"
            >
              <button
                :class="[itemBaseClass, itemActiveClass]"
                class="justify-between"
              >
                <div class="flex items-center gap-3">
                  <component 
                    v-if="item.icon" 
                    :is="item.icon" 
                    class="w-4 h-4 text-gray-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <ChevronRight class="w-3.5 h-3.5 text-gray-400" />
              </button>
              
              <!-- Submenu Dropdown (Teleported) -->
              <Teleport to="body">
                <Transition name="dropdown">
                  <div 
                    v-if="activeSubmenuKey === (item.key || item.label || item.id)"
                    class="dropdown-menu fixed z-[50000] min-w-[12rem] bg-[#f3f5f7] border border-gray-300 rounded-[6px] shadow-xl py-1"
                    :style="submenuStyle"
                    @click.stop
                  >
                     <template v-for="(subItem, subIndex) in item.items" :key="subIndex">
                        <!-- Divider -->
                        <div v-if="subItem.type === 'divider'" :class="dividerClass"></div>
                        
                        <!-- Section Header -->
                        <div v-else-if="subItem.type === 'header'" :class="headerClass">
                          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{{ subItem.label }}</span>
                        </div>

                        <!-- Submenu Item (Recursive not fully supported here, simplified for 2 levels) -->
                        <button
                          v-else
                          @click="handleItemClick(subItem, $event)"
                          :class="[itemBaseClass, itemActiveClass]"
                        >
                           <div class="flex items-center gap-3">
                              <component 
                                v-if="subItem.icon" 
                                :is="subItem.icon" 
                                class="w-4 h-4 text-gray-500"
                              />
                              <span>{{ subItem.label }}</span>
                           </div>
                           <component v-if="subItem.active" :is="Check" class="w-3.5 h-3.5 text-blue-600" />
                        </button>
                     </template>
                  </div>
                </Transition>
              </Teleport>
            </div>

            <!-- Standard Menu Item -->
            <button
              v-else
              @click="handleItemClick(item, $event)"
              :disabled="item.disabled"
              :class="[
                itemBaseClass,
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : itemActiveClass
              ]"
            >
              <slot name="item" :item="item" :index="index">
                <div class="flex items-center gap-3">
                  <!-- Custom Icon Slot or SVG -->
                  <slot :name="`icon-${item.id || index}`" :item="item">
                    <component 
                      v-if="item.icon" 
                      :is="item.icon" 
                      :class="item.iconClass || 'w-4 h-4 text-gray-500'"
                    />
                  </slot>
                  <span>{{ item.label }}</span>
                </div>
                <span v-if="item.shortcut" class="text-xs text-gray-400">{{ item.shortcut }}</span>
              </slot>
            </button>
          </template>
          
          <!-- Custom Content Slot -->
          <template v-if="contentPosition === 'after'">
            <slot name="content"></slot>
          </template>
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
  transform-origin: top left;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* Menu shadow */
.dropdown-menu {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dropdown-menu :deep(button:hover) {
  background: #e5e6ec;
}

.dropdown-menu :deep(button[aria-selected='true']),
.dropdown-menu :deep(button.is-selected) {
  background: #e5e6ec;
  color: var(--color-gray-700);
}

.dropdown-menu :deep(input),
.dropdown-menu :deep(.p-inputtext) {
  background: transparent;
  border: none;
  box-shadow: none;
}

/* ─── Dark variant ────────────────────────────────────── */
.dropdown-menu--dark {
  background: #2f2f33 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.dropdown-menu--dark :deep(button:hover) {
  background: #3a3a3f !important;
}

.dropdown-menu--dark :deep(button.is-selected) {
  background: rgba(37, 99, 235, 0.2) !important;
  color: #93c5fd !important;
}
</style>


