<script setup>
/**
 * ProjectCell - AG Grid cell renderer for Project column (read-only)
 * Simple display of project name without edit or sidebar features
 */
const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const projectName = props.params.data?.dartboard || props.params.data?.project?.name || props.params.value || '-'
</script>

<template>
  <div class="project-cell h-full flex items-center">
    <span class="project-name text-xs text-gray-700 truncate">
      {{ projectName }}
    </span>
  </div>
</template>

<style scoped>
.project-cell {
  width: 100%;
}

.project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
