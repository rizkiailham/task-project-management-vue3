<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const route = useRoute()
const uiStore = useUIStore()
const dropdownRef = ref(null)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0)

const contextMenuState = computed(() => uiStore.contextMenu)
const contextAnchor = computed(() => ({
  x: contextMenuState.value.x,
  y: contextMenuState.value.y
}))

const triggerStyle = computed(() => ({
  position: 'fixed',
  left: `${contextMenuState.value.x}px`,
  top: `${contextMenuState.value.y}px`,
  width: '0',
  height: '0',
  opacity: '0',
  pointerEvents: 'none'
}))

const openUp = computed(() => {
  if (typeof window === 'undefined') return false
  const estimatedMenuHeight = 220
  return contextMenuState.value.y + estimatedMenuHeight > viewportHeight.value
})

async function syncDropdownState() {
  if (!dropdownRef.value) return

  if (contextMenuState.value.isOpen) {
    dropdownRef.value.close()
    await nextTick()
    dropdownRef.value.open()
    return
  }

  dropdownRef.value.close()
}

function handleMenuClose() {
  uiStore.closeContextMenu()
}

function handleWindowResize() {
  if (typeof window === 'undefined') return
  viewportHeight.value = window.innerHeight
  uiStore.closeContextMenu()
}

function handleWindowScroll() {
  uiStore.closeContextMenu()
}

watch(
  () => uiStore.contextMenuRevision,
  async () => {
    if (!contextMenuState.value.isOpen) return
    await nextTick()
    await syncDropdownState()
  }
)

watch(
  () => contextMenuState.value.isOpen,
  (isOpen) => {
    if (isOpen) return
    dropdownRef.value?.close()
  }
)

watch(
  () => route.fullPath,
  () => {
    uiStore.closeContextMenu()
  }
)

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('scroll', handleWindowScroll, true)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('scroll', handleWindowScroll, true)
})
</script>

<template>
  <DropdownMenu
    ref="dropdownRef"
    class="app-context-menu"
    :items="contextMenuState.items"
    :position="'left'"
    :anchor="contextAnchor"
    :openUp="openUp"
    :width="contextMenuState.width"
    :offset="0"
    :closeOnSelect="contextMenuState.closeOnSelect"
    :variant="contextMenuState.variant"
    @close="handleMenuClose"
  >
    <template #trigger>
      <div class="app-context-menu-trigger" :style="triggerStyle"></div>
    </template>
  </DropdownMenu>
</template>
