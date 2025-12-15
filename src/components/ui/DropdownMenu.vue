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
import { ref, onMounted, onUnmounted, watch } from 'vue'

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
   * Dropdown position relative to trigger
   */
  position: {
    type: String,
    default: 'left',
    validator: (val) => ['left', 'right'].includes(val)
  },
  /**
   * Width of the dropdown menu
   */
  width: {
    type: String,
    default: '13rem'
  },
  /**
   * Close dropdown when clicking an item
   */
  closeOnSelect: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['open', 'close', 'select'])

const isOpen = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)
const instanceId = `dropdown-${Math.random().toString(36).slice(2, 9)}`

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
    triggerRef.value &&
    !triggerRef.value.contains(event.target)
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
})

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
          class="dropdown-menu fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[9999]"
          :style="{ 
            width: width,
            top: triggerRef ? `${triggerRef.getBoundingClientRect().bottom + 8}px` : '0',
            left: position === 'left' && triggerRef ? `${triggerRef.getBoundingClientRect().left}px` : 'auto',
            right: position === 'right' && triggerRef ? `${window.innerWidth - triggerRef.getBoundingClientRect().right}px` : 'auto'
          }"
        >
          <template v-for="(item, index) in items" :key="index">
            <!-- Divider -->
            <div v-if="item.type === 'divider'" class="border-t border-gray-100 my-1"></div>
            
            <!-- Section Header -->
            <div v-else-if="item.type === 'header'" class="px-3 py-2">
              <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{{ item.label }}</span>
            </div>
            
            <!-- Menu Item -->
            <button
              v-else
              @click="handleItemClick(item, $event)"
              :disabled="item.disabled"
              :class="[
                'flex items-center justify-between w-full px-3 py-2 text-sm transition-colors',
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50'
              ]"
            >
              <slot name="item" :item="item" :index="index">
                <div class="flex items-center gap-3">
                  <!-- Custom Icon Slot or SVG -->
                  <slot :name="`icon-${item.id || index}`" :item="item">
                    <component 
                      v-if="item.icon" 
                      :is="item.icon" 
                      class="w-4 h-4 text-gray-500"
                    />
                  </slot>
                  <span>{{ item.label }}</span>
                </div>
                <span v-if="item.shortcut" class="text-xs text-gray-400">{{ item.shortcut }}</span>
              </slot>
            </button>
          </template>
          
          <!-- Custom Content Slot -->
          <slot name="content"></slot>
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
</style>
