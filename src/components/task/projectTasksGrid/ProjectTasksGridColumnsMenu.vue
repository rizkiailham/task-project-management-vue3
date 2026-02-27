<script setup>
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import { MoreHorizontal, X, Search } from 'lucide-vue-next'
import InputText from 'primevue/inputtext'
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

const filterSearchQuery = ref('')

const filteredMenuItems = computed(() => {
  const query = filterSearchQuery.value.trim().toLowerCase()
  if (!query) return props.menuItems
  
  return props.menuItems.filter((item) => {
    if (item.type === 'divider' || item.type === 'header') return false // Hide dividers/headers when searching
    return item.label?.toLowerCase().includes(query)
  })
})

const hasCustomColumns = computed(() => Array.isArray(props.customColumns) && props.customColumns.length > 0)

function isRenderableIcon(icon) {
  return typeof icon === 'object' || typeof icon === 'function'
}

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
    :items="filteredMenuItems"
    position="right"
    width="14rem"
    :closeOnSelect="false"
    contentPosition="before"
    @select="handleMenuSelect"
  >
    <template #trigger>
      
        <MoreHorizontal class="h-4 w-4 text-gray-500" />
    </template>

    <template #item="{ item }">
      <div class="flex items-center gap-2 min-w-0">
        <component v-if="isRenderableIcon(item.icon)" :is="item.icon" class="w-4 h-4 text-gray-500 shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </div>
    </template>

    <template #content>
      <div class="columns-menu__search">
        <Search class="w-3.5 h-3.5 text-gray-400" />
        <InputText
          v-model="filterSearchQuery"
          :placeholder="t('tasks.searchColumns', 'Search columns...')"
          class="columns-menu__search-input w-full !text-[13px] !border-0 !bg-transparent !shadow-none !px-0 !py-0 focus:!shadow-none"
          @click.stop
        />
      </div>
      <div v-if="filteredMenuItems.length === 0" class="columns-menu__empty">
        {{ t('tasks.noColumnsFound', 'No columns found') }}
      </div>

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

<style scoped>
.columns-menu__search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e7eb;
}

.columns-menu__search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--color-gray-700, #374151);
  background: transparent;
  min-width: 0;
}

.columns-menu__search-input::placeholder {
  color: var(--color-gray-400, #9ca3af);
}

.columns-menu__empty {
  padding: 6px 10px 8px;
  font-size: 13px;
  color: var(--color-gray-400, #9ca3af);
  text-align: center;
}
</style>
