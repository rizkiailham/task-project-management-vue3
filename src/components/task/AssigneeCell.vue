<script setup>
/**
 * AssigneeCell - AG Grid cell renderer for Assignee with UserSearchDropdown
 * 
 * Uses the real UserSearchDropdown component for fetching and searching users
 */
import { ref, computed, watch } from 'vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import Avatar from 'primevue/avatar'
import { useTaskStore } from '@/stores'
import AppTooltip from '@/components/ui/AppTooltip.vue'

const taskStore = useTaskStore()

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const localAssignee = ref(props.params.data?.assigneeData || null)

watch(() => props.params.data?.assigneeData, (newVal) => {
  localAssignee.value = newVal
})

const displayName = computed(() => {
  if (!localAssignee.value) return 'Unassigned'
  return localAssignee.value.name || localAssignee.value.firstName || 'Unassigned'
})

const avatarInitial = computed(() => {
  const name = displayName.value
  return name.charAt(0).toUpperCase()
})

// Color palette for assignee avatars
const avatarColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

const avatarColor = computed(() => {
  const name = displayName.value
  if (!name || name === 'Unassigned') return '#9CA3AF' // gray for unassigned
  // Generate consistent color based on name hash
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
})

async function handleSelectUser(user) {
  localAssignee.value = user
  const taskId = props.params.data?.id
  const pathKey = props.params.data?.pathKey
  const userId = user ? user.id : null
  
  // Update via context if available (for tree grid)
  if (props.params.context?.updateField) {
    props.params.context.updateField(pathKey, 'assignee', user?.name || 'Unassigned')
  }
  
  // Also update via task store for real API call
  if (taskId) {
    try {
      await taskStore.changeTaskAssignee(taskId, userId)
    } catch (error) {
      console.error('Failed to update assignee:', error)
    }
  }
}

function refresh(nextParams) {
  localAssignee.value = nextParams?.data?.assigneeData || null
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div class="assignee-cell-wrapper h-full flex items-center justify-center">
    <UserSearchDropdown
      :model-value="localAssignee"
      @select="handleSelectUser"
    >
      <template #trigger>
        <div 
          class="assignee-cell flex items-center justify-center cursor-pointer"
        >
          <AppTooltip :content="displayName" placement="top">
            <Avatar
              v-if="localAssignee"
              :image="localAssignee.avatar"
              :label="!localAssignee.avatar ? avatarInitial : undefined"
              shape="circle"
              class="h-6 w-6 flex-shrink-0 text-[10px] font-semibold text-white border-2 border-white shadow-sm"
              :style="!localAssignee.avatar ? { backgroundColor: avatarColor } : { backgroundColor: 'transparent' }"
            />
            <span 
              v-else
              class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white flex-shrink-0 border-2 border-white shadow-sm"
              :style="{ backgroundColor: avatarColor }"
            >
              {{ avatarInitial }}
            </span>
          </AppTooltip>
        </div>
      </template>
    </UserSearchDropdown>
  </div>
</template>

<style scoped>
.assignee-cell {
  cursor: pointer;
}
</style>
