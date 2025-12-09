<script setup>
/**
 * TaskCard - Reusable task card component
 */
import { computed } from 'vue'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import Avatar from 'primevue/avatar'
import Checkbox from 'primevue/checkbox'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  showProject: {
    type: Boolean,
    default: false
  },
  showCheckbox: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click', 'toggle-status'])

const isCompleted = computed(() => props.task.status === TaskStatus.DONE)

const priorityConfig = {
  [TaskPriority.URGENT]: { icon: 'pi pi-exclamation-circle', color: 'text-red-600', border: 'border-l-red-500' },
  [TaskPriority.HIGH]: { icon: 'pi pi-arrow-up', color: 'text-orange-500', border: 'border-l-orange-500' },
  [TaskPriority.MEDIUM]: { icon: 'pi pi-minus', color: 'text-yellow-500', border: 'border-l-yellow-500' },
  [TaskPriority.LOW]: { icon: 'pi pi-arrow-down', color: 'text-gray-400', border: 'border-l-gray-300' }
}

const priorityStyle = computed(() => priorityConfig[props.task.priority] || priorityConfig[TaskPriority.LOW])

function isOverdue() {
  if (!props.task.dueDate || props.task.status === TaskStatus.DONE) return false
  return new Date(props.task.dueDate) < new Date()
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function handleClick() {
  emit('click', props.task)
}

function handleToggle() {
  emit('toggle-status', props.task)
}
</script>

<template>
  <div
    :class="[
      'task-card flex items-start gap-3 rounded-lg border-l-4 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:bg-gray-800',
      priorityStyle.border
    ]"
    @click="handleClick"
  >
    <!-- Checkbox -->
    <Checkbox 
      v-if="showCheckbox"
      :modelValue="isCompleted"
      @update:modelValue="handleToggle"
      :binary="true"
      @click.stop
      class="mt-0.5"
    />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h4 
        :class="[
          'font-medium',
          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
        ]"
      >
        {{ task.title }}
      </h4>
      
      <p v-if="showProject && task.projectName" class="text-xs text-gray-500 dark:text-gray-400">
        {{ task.projectName }}
      </p>

      <!-- Meta -->
      <div class="mt-2 flex items-center gap-3">
        <!-- Priority -->
        <i :class="[priorityStyle.icon, priorityStyle.color, 'text-sm']"></i>

        <!-- Due Date -->
        <span 
          v-if="task.dueDate"
          :class="[
            'flex items-center gap-1 text-xs',
            isOverdue() ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'
          ]"
        >
          <i class="pi pi-calendar text-[10px]"></i>
          {{ formatDate(task.dueDate) }}
        </span>

        <!-- Subtasks -->
        <span 
          v-if="task.subtaskCount > 0"
          class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
        >
          <i class="pi pi-check-square text-[10px]"></i>
          {{ task.completedSubtaskCount || 0 }}/{{ task.subtaskCount }}
        </span>

        <!-- Comments -->
        <span 
          v-if="task.commentCount > 0"
          class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
        >
          <i class="pi pi-comment text-[10px]"></i>
          {{ task.commentCount }}
        </span>
      </div>
    </div>

    <!-- Assignee -->
    <Avatar 
      v-if="task.assignee"
      :label="task.assignee.name?.charAt(0)"
      :image="task.assignee.avatar"
      shape="circle"
      size="small"
      class="bg-primary-100 text-primary-700 flex-shrink-0"
      v-tooltip="task.assignee.name"
    />
  </div>
</template>

<style scoped>
.task-card {
  cursor: pointer;
}

.task-card:hover {
  transform: translateY(-1px);
}
</style>

