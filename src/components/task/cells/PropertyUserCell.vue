<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import Avatar from 'primevue/avatar'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import { useUserStore } from '@/stores'
import { normalizeUserForDisplay } from '@/utils/user'
import { User as UserIcon } from 'lucide-vue-next'
import {
  getPropertyId,
  isPropertyReadonly,
  resolvePropertyValue
} from '@/components/task/cells/propertyCellUtils'

const props = defineProps({
  params: { type: Object, required: true }
})

const { t } = useI18n()
const userStore = useUserStore()
const propertyId = computed(() => getPropertyId(props.params))
const readonly = computed(() => isPropertyReadonly(props.params))

function isUnassignedLike(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return !normalized || normalized === 'unassigned' || normalized === 'none' || normalized === 'null' || normalized === 'undefined'
  }
  if (typeof value === 'object') {
    const id = value.id ?? value.userId ?? value.value ?? null
    const name = String(value.name ?? value.label ?? value.firstName ?? '').trim().toLowerCase()
    const avatar = value.avatarUrl || value.avatar || null
    if (!avatar && (name === 'unassigned' || name === 'none' || name === 'null' || name === 'undefined')) {
      return true
    }
    if ((id === null || id === undefined || id === '') && !avatar) {
      return !name || name === 'unassigned' || name === 'none' || name === 'null' || name === 'undefined'
    }
  }
  return false
}

function normalizeUser(value) {
  if (isUnassignedLike(value)) return null
  if (!value) return null

  if (typeof value === 'object' && value.id) {
    const matched = userStore.users.find((user) => String(user.id) === String(value.id))
    if (matched) return normalizeUserForDisplay(matched)
  }

  if (typeof value === 'string') {
    const matched = userStore.users.find((user) => String(user.id) === String(value))
    if (matched) return normalizeUserForDisplay(matched)
    return normalizeUserForDisplay(value)
  }

  return normalizeUserForDisplay(value)
}

function resolveUser() {
  return normalizeUser(resolvePropertyValue(props.params))
}

const localAssignee = ref(resolveUser())

watch(
  () => [props.params?.data, props.params?.value, userStore.users],
  () => {
    localAssignee.value = resolveUser()
  },
  { deep: true }
)

const displayName = computed(() => {
  return localAssignee.value?.name || t('taskDetail.unassigned', 'Unassigned')
})

const avatarInitial = computed(() => {
  return localAssignee.value?.initials || '?'
})

const avatarColor = computed(() => {
  if (!localAssignee.value) return '#9CA3AF'
  return localAssignee.value.color
})

const avatarStyle = computed(() => ({
  width: '24px',
  height: '24px',
  minWidth: '24px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#ffffff',
  border: 'none',
  boxShadow: 'none',
  flexShrink: 0,
  backgroundColor: avatarColor.value
}))
const unassignedStyle = {
  width: '24px',
  height: '24px',
  minWidth: '24px',
  borderRadius: '50%',
  border: '1.5px dashed #d1d5db',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
  background: 'transparent',
  boxSizing: 'border-box',
  overflow: 'hidden',
  flexShrink: 0
}

async function handleSelectUser(user) {
  if (readonly.value) return

  localAssignee.value = normalizeUser(user)

  const taskId = props.params?.data?.id
  if (!taskId || !propertyId.value) return

  const updateFn = props.params?.context?.updatePropertyValue
  if (updateFn) {
    await Promise.resolve(
      updateFn({
        taskId,
        propertyId: propertyId.value,
        value: user ? user.id : null,
        user: localAssignee.value
      })
    )
  }
}

function refresh(nextParams) {
  localAssignee.value = normalizeUser(resolvePropertyValue(nextParams || props.params))
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div class="assignee-cell-wrapper h-full flex items-center justify-start">
    <UserSearchDropdown
      v-if="!readonly"
      :model-value="localAssignee"
      @select="handleSelectUser"
    >
      <template #trigger>
        <AppTooltip :content="displayName" placement="top" :z-index="2147483000">
          <div class="assignee-cell flex items-center justify-start cursor-pointer">
            <Avatar
              v-if="localAssignee"
              :image="localAssignee.avatarUrl || localAssignee.avatar || undefined"
              :label="!(localAssignee.avatarUrl || localAssignee.avatar) ? avatarInitial : undefined"
              shape="circle"
              class="assignee-avatar"
              :style="{
                ...avatarStyle,
                backgroundColor: !(localAssignee.avatarUrl || localAssignee.avatar) ? avatarColor : 'transparent'
              }"
            />
            <span v-else class="assignee-unassigned-avatar" :style="unassignedStyle">
              <UserIcon class="h-3.5 w-3.5" />
            </span>
          </div>
        </AppTooltip>
      </template>
    </UserSearchDropdown>

    <AppTooltip v-else :content="displayName" placement="top" :z-index="2147483000">
      <div class="assignee-cell flex items-center justify-start">
        <Avatar
          v-if="localAssignee"
          :image="localAssignee.avatarUrl || localAssignee.avatar || undefined"
          :label="!(localAssignee.avatarUrl || localAssignee.avatar) ? avatarInitial : undefined"
          shape="circle"
          class="assignee-avatar"
          :style="{
            ...avatarStyle,
            backgroundColor: !(localAssignee.avatarUrl || localAssignee.avatar) ? avatarColor : 'transparent'
          }"
        />
        <span v-else class="assignee-unassigned-avatar" :style="unassignedStyle">
          <UserIcon class="h-3.5 w-3.5" />
        </span>
      </div>
    </AppTooltip>
  </div>
</template>

<style scoped>
.assignee-cell {
  cursor: pointer;
  height: 100%;
  align-items: center;
}

.assignee-cell-wrapper {
  height: 100%;
}

:deep(.app-tooltip-root),
:deep(.app-tooltip-trigger) {
  display: inline-flex !important;
  align-items: center !important;
  height: 100% !important;
  line-height: 1 !important;
  vertical-align: middle !important;
}

:deep(.assignee-avatar) {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
  overflow: hidden !important;
  vertical-align: middle !important;
  border-radius: 9999px;
}

:deep(.assignee-avatar .p-avatar-label) {
  font-size: 11px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
}

:deep(.assignee-avatar img),
:deep(.assignee-avatar .p-avatar-image) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 9999px;
  vertical-align: middle !important;
}

.assignee-unassigned-avatar {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  border-radius: 50% !important;
  border: 1.5px dashed #d1d5db !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #9ca3af !important;
  background: transparent !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  flex-shrink: 0 !important;
  line-height: 1 !important;
}
</style>
