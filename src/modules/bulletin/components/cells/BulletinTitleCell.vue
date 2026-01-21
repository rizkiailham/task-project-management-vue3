<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { FilePenLine, MoreHorizontal, Pencil, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  params: Object
})

const { t } = useI18n()

function onEdit() {
  props.params.onEdit?.(props.params.data)
}

function onContent() {
  props.params.onContent?.(props.params.data)
}

function onDelete() {
  props.params.onDelete?.(props.params.data)
}

const menuItems = computed(() => ([
  { id: 'edit', label: t('common.edit'), icon: Pencil, action: onEdit },
  { id: 'content', label: t('bulletin.actions.contentEditor'), icon: FilePenLine, action: onContent },
  { id: 'delete', label: t('common.delete'), icon: Trash2, action: onDelete }
]))
</script>

<template>
  <div class="flex items-center gap-3 h-full w-full group">
    <div class="flex-1 min-w-0">
      <div class="text-sm text-gray-900 font-medium truncate">{{ params.data?.title }}</div>
      <div v-if="params.data?.description" class="text-xs text-gray-400 line-clamp-1">
        {{ params.data.description }}
      </div>
    </div>
    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu :items="menuItems" position="right" width="12rem" :openUp="true">
        <template #trigger>
          <button
            type="button"
            class="h-7 w-7 flex items-center justify-center rounded-md text-gray-500"
            title="More"
          >
            <MoreHorizontal class="w-4 h-4" />
          </button>
        </template>
      </DropdownMenu>
    </div>
  </div>
</template>
