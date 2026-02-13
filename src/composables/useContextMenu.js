import { computed } from 'vue'
import { useUIStore } from '@/stores'

export function useContextMenu() {
  const uiStore = useUIStore()

  function openContextMenu(event, itemsOrOptions = [], data = null) {
    if (Array.isArray(itemsOrOptions)) {
      uiStore.openContextMenu(event, {
        items: itemsOrOptions,
        data
      })
      return
    }

    uiStore.openContextMenu(event, itemsOrOptions || {})
  }

  function moveContextMenu(event) {
    uiStore.updateContextMenuPosition(event)
  }

  function closeContextMenu() {
    uiStore.closeContextMenu()
  }

  return {
    contextMenu: computed(() => uiStore.contextMenu),
    openContextMenu,
    moveContextMenu,
    closeContextMenu
  }
}
