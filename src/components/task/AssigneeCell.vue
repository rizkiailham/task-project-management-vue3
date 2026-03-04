<script setup>
/**
 * AssigneeCell - AG Grid cell renderer for Assignee with UserSearchDropdown
 * 
 * Uses the real UserSearchDropdown component for fetching and searching users
 */
import { ref, computed, watch } from 'vue'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import Avatar from 'primevue/avatar'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import { normalizeUserForDisplay } from '@/utils/user'
import { User as UserIcon } from 'lucide-vue-next'
import { useUserStore } from '@/stores'

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})
const userStore = useUserStore()

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

function normalizeAssignee(user) {
  if (isUnassignedLike(user)) return null
  if (user && typeof user === 'object' && user.id) {
    const matched = userStore.users.find((item) => String(item.id) === String(user.id))
    if (matched) return normalizeUserForDisplay(matched)
  }
  if (typeof user === 'string') {
    const matched = userStore.users.find((item) => String(item.id) === String(user))
    if (matched) return normalizeUserForDisplay(matched)
  }
  return normalizeUserForDisplay(user)
}

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function readMapValue(map, candidates = []) {
  if (!map || typeof map !== 'object') return undefined
  for (const candidate of candidates) {
    const rawKey = String(candidate || '').trim()
    if (!rawKey) continue
    if (rawKey in map) return map[rawKey]
    const normalized = normalizeLookupKey(rawKey)
    if (normalized in map) return map[normalized]
  }
  return undefined
}

function resolveAssigneeFromRow(rowData) {
  const data = rowData || {}
  const definitions = props.params?.context?.propertyDefinitions?.value
  const assigneeProperty = Array.isArray(definitions)
    ? definitions.find((property) => normalizeLookupKey(property?.key) === 'assignee')
    : null

  const candidates = [
    assigneeProperty?.id,
    assigneeProperty?.key,
    assigneeProperty?.settings?.sourceField,
    'assignee'
  ].filter(Boolean)

  const mapValue = readMapValue(data?.propertyValueMap, candidates)
  if (mapValue !== undefined && mapValue !== null && mapValue !== '') {
    return normalizeAssignee(mapValue)
  }

  const customMapValue = readMapValue(data?.customFieldMap, candidates)
  if (customMapValue !== undefined && customMapValue !== null && customMapValue !== '') {
    return normalizeAssignee(customMapValue)
  }

  const entrySources = [data?.propertyValues, data?.customValues, data?._raw?.propertyValues, data?._raw?.customValues]
  for (const source of entrySources) {
    if (!Array.isArray(source)) continue
    const entry = source.find((item) => {
      const property = item?.property || {}
      const id = String(item?.propertyId || property?.id || '').trim()
      const key = normalizeLookupKey(item?.propertyKey || item?.key || property?.key || '')
      return candidates.some((candidate) => String(candidate) === id || normalizeLookupKey(candidate) === key)
    })
    if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
      return normalizeAssignee(entry.value)
    }
  }

  return normalizeAssignee(data?.assigneeData || data?.assignee || data?._raw?.assignTo || data?._raw?.assignee || null)
}

const localAssignee = ref(resolveAssigneeFromRow(props.params.data))

watch(
  () => [props.params?.data, userStore.users],
  () => {
    localAssignee.value = resolveAssigneeFromRow(props.params?.data)
  },
  { deep: true }
)

const displayName = computed(() => (localAssignee.value?.name || 'Unassigned'))

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
  localAssignee.value = normalizeAssignee(user)
  const taskId = props.params?.data?.id
  const userId = user ? user.id : null
  if (!taskId) return

  const updateFn = props.params?.context?.updatePropertyValue
  if (!updateFn) return

  const properties = props.params?.context?.propertyDefinitions?.value
  const assigneeProperty = Array.isArray(properties)
    ? properties.find((property) => String(property?.key || '').trim().toLowerCase() === 'assignee')
    : null

  const propertyId = assigneeProperty?.id || 'assignee'
  await Promise.resolve(
    updateFn({
      taskId,
      propertyId,
      value: userId,
      user: localAssignee.value
    })
  )
}

function refresh(nextParams) {
  localAssignee.value = resolveAssigneeFromRow(nextParams?.data || props.params?.data)
  return true
}

defineExpose({ refresh })
</script>

<template>
  <div class="assignee-cell-wrapper h-full flex items-center justify-start">
    <UserSearchDropdown
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
