<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoreHorizontal, X } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  menuItems: {
    type: Array,
    default: () => []
  },
  customColumns: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'toggle-column',
  'remove-custom-column'
])

const { t } = useI18n()

const hasCustomColumns = computed(() => Array.isArray(props.customColumns) && props.customColumns.length > 0)

function handleMenuSelect(item) {
  if (!item?.key || item.disabled) return
  emit('toggle-column', item.key)
}

function handleRemoveCustomColumn(columnId) {
  emit('remove-custom-column', columnId)
}
</script>

<template>
  <DropdownMenu
    :items="menuItems"
    position="right"
    width="18rem"
    :closeOnSelect="false"
    @select="handleMenuSelect"
  >
    <template #trigger>
      
        <MoreHorizontal class="h-4 w-4 text-gray-500" />
    </template>

    <template #item="{ item }">
      <span class="truncate">{{ item.label }}</span>
    </template>

    <template #content>
      <div v-if="hasCustomColumns" class="columns-menu-content border-t border-gray-200 px-3 pb-3 pt-2">
        <div class="mt-2 max-h-28 space-y-1 overflow-y-auto">
          <div
            v-for="column in customColumns"
            :key="column.id"
            class="flex items-center justify-between rounded-md bg-white px-2 py-1 text-[12px] text-gray-700"
          >
            <span class="truncate">{{ column.label }}</span>
            <button
              type="button"
              class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              :title="t('tasks.columnOptions.removeCustom', 'Remove custom column')"
              @click.stop="handleRemoveCustomColumn(column.id)"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </DropdownMenu>
</template>
