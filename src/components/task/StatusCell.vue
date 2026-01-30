<template>
  <div class="flex items-center justify-center h-full w-full">
    <TaskProgressIcon 
      :status="status" 
      :progress="progress" 
      class="scale-90"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'
import { TaskStatus } from '@/models'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const status = computed(() => props.params.value || TaskStatus.TODO)
// If we have subtasks, calculate progress? Or just use a default?
// For now, let's assume 0 unless we calculate it. 
// However, the grid data might have `completedSubtaskCount` and `subtaskCount`.
const progress = computed(() => {
  const data = props.params.data
  if (data && data.subtaskCount > 0) {
    return Math.round((data.completedSubtaskCount / data.subtaskCount) * 100)
  }
  return 0
})
</script>
