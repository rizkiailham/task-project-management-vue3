<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import { useI18n } from 'vue-i18n'
import {
  getPropertyId,
  isPropertyReadonly,
  resolvePropertyValue
} from '@/components/task/cells/propertyCellUtils'

const props = defineProps({
  params: { type: Object, required: true }
})

const { t, locale } = useI18n()
const propertyId = computed(() => getPropertyId(props.params))
const readonly = computed(() => isPropertyReadonly(props.params))

function tr(key, fallback) {
  const translated = t(key)
  return translated && translated !== key ? translated : fallback
}

function toDateValue(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const localDate = ref(toDateValue(resolvePropertyValue(props.params)))
const isOpen = ref(false)
const triggerRef = ref(null)
const popupRef = ref(null)
const popupPosition = ref({ top: 0, left: 0 })
const instanceId = `property-date-cell-${Math.random().toString(36).slice(2, 9)}`

watch(
  () => [props.params?.data, props.params?.value],
  () => {
    localDate.value = toDateValue(resolvePropertyValue(props.params))
  },
  { deep: true }
)

function formatDate(dateValue) {
  if (!dateValue) return tr('taskDetail.addDate', 'Add date')
  const date = toDateValue(dateValue)
  if (!date) return tr('taskDetail.addDate', 'Add date')

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return tr('calendar.today', 'Today')
  if (date.toDateString() === tomorrow.toDateString()) return tr('calendar.tomorrow', 'Tomorrow')

  return date.toLocaleDateString(locale.value || 'en', { month: 'short', day: 'numeric' })
}

const isOverdue = computed(() => {
  if (!localDate.value) return false
  const dueDate = new Date(localDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const status = String(props.params?.data?.status || '').toLowerCase()
  return dueDate < today && status !== 'done' && status !== 'completed'
})

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  popupPosition.value = {
    top: rect.bottom + 8,
    left: rect.left
  }
}

function togglePopover() {
  if (readonly.value) return
  if (isOpen.value) {
    isOpen.value = false
    return
  }
  updatePosition()
  window.dispatchEvent(new CustomEvent('floating-overlay-open', { detail: { id: instanceId, type: 'datepicker' } }))
  isOpen.value = true
}

function handleGlobalOverlayOpen(event) {
  const incomingId = event?.detail?.id
  if (!incomingId || incomingId === instanceId) return
  isOpen.value = false
}

function handleClickOutside(event) {
  if (!isOpen.value) return
  if (triggerRef.value?.contains(event.target)) return
  if (popupRef.value?.contains(event.target)) return
  isOpen.value = false
}

async function handleDateChange(value) {
  if (readonly.value) return

  const nextDate = toDateValue(value)
  localDate.value = nextDate
  isOpen.value = false

  const taskId = props.params?.data?.id
  if (!taskId || !propertyId.value) return

  const formattedValue = nextDate
    ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
    : null

  const updateFn = props.params?.context?.updatePropertyValue
  if (updateFn) {
    await Promise.resolve(updateFn({ taskId, propertyId: propertyId.value, value: formattedValue }))
  }
}

function refresh(nextParams) {
  localDate.value = toDateValue(resolvePropertyValue(nextParams || props.params))
  return true
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('floating-overlay-open', handleGlobalOverlayOpen)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('floating-overlay-open', handleGlobalOverlayOpen)
})

defineExpose({ refresh })
</script>

<template>
  <div class="due-date-cell-wrapper h-full flex items-center property-date-cell" @mousedown.stop @click.stop>
    <span
      ref="triggerRef"
      @mousedown.stop
      @click.stop="togglePopover"
      :class="[
        'flex items-center gap-1 text-xs cursor-pointer hover:bg-black/5 py-1 rounded transition-colors',
        localDate ? (isOverdue ? 'text-red-600' : 'text-gray-700') : 'text-gray-400',
        readonly ? 'is-readonly' : ''
      ]"
    >
      <Calendar class="w-3.5 h-3.5" />
      {{ formatDate(localDate) }}
    </span>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popupRef"
        class="datepicker-popup property-date-popup"
        :style="{
          position: 'fixed',
          top: popupPosition.top + 'px',
          left: popupPosition.left + 'px',
          zIndex: 99999
        }"
      >
        <VDatePicker
          :model-value="localDate"
          mode="date"
          @update:model-value="handleDateChange"
        >
          <template #footer>
            <div class="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="handleDateChange(new Date())">{{ t('calendar.today', 'Today') }}</button>
              <button type="button" class="text-[13px] font-semibold text-gray-700 hover:text-gray-900 cursor-pointer" @click="handleDateChange(null)">{{ t('calendar.clear', 'Clear') }}</button>
            </div>
          </template>
        </VDatePicker>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.due-date-cell-wrapper {
  width: 100%;
}

.is-readonly {
  cursor: default !important;
}

.is-readonly:hover {
  background-color: transparent !important;
}
</style>

<style>
.property-date-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.property-date-popup .vc-container {
  border: none;
  box-shadow: none;
}
</style>
