<script setup>
import { computed } from 'vue'
import ProjectTasksGridColumnsMenu from '@/components/task/projectTasksGrid/ProjectTasksGridColumnsMenu.vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const menuItems = computed(() => props.params?.context?.columnMenuItems?.value || [])
const customColumns = computed(() => props.params?.context?.customColumns?.value || [])

function handleToggleColumn(columnId) {
  props.params?.context?.toggleColumnOption?.(columnId)
}

function handleRemoveCustomColumn(columnId) {
  props.params?.context?.removeCustomColumnOption?.(columnId)
}
</script>

<template>
  <div class="column-options-header flex h-full w-full items-center justify-center">
    <ProjectTasksGridColumnsMenu
      :menuItems="menuItems"
      :customColumns="customColumns"
      @toggle-column="handleToggleColumn"
      @remove-custom-column="handleRemoveCustomColumn"
    />
  </div>
</template>

<style scoped>
.column-options-header :deep(.columns-menu-trigger) {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.column-options-header :deep(.columns-menu-trigger span) {
  display: none;
}
</style>
