<script setup>
/**
 * DueDateCell - AG Grid cell renderer for Due Date with datepicker
 * Uses Vue Teleport to render datepicker popup in body for proper z-index
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { DatePicker as VDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import { useTaskStore } from '@/stores'
import { useI18n } from 'vue-i18n'

const taskStore = useTaskStore()
const { t, locale } = useI18n()

const props = defineProps({
  params: {
    type: Object,
    required: true
  }
})

const localDate = ref(props.params.data?.dueDate || null)
const isOpen = ref(false)
const triggerRef = ref(null)
const popupRef = ref(null)
const popupPosition = ref({ top: 0, left: 0 })

watch(() => props.params.data?.dueDate, (newVal) => {
  localDate.value = newVal
})

function formatDate(date) {
  if (!date) return 'Add date'
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return t('calendar.today') || 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return t('calendar.tomorrow') || 'Tomorrow'

  return d.toLocaleDateString(locale.value || 'en', { month: 'short', day: 'numeric' })
}

const isOverdue = computed(() => {
  if (!localDate.value) return false
  const dueDate = new Date(localDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const status = props.params.data?.status
  return dueDate < today && status !== 'DONE' && status !== 'completed'
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
  if (isOpen.value) {
    isOpen.value = false
  } else {
    updatePosition()
    isOpen.value = true
  }
}

function handleClickOutside(event) {
  if (!isOpen.value) return
  if (triggerRef.value?.contains(event.target)) return
  if (popupRef.value?.contains(event.target)) return
  isOpen.value = false
}

async function handleDateChange(val) {
  localDate.value = val
  isOpen.value = false
  
  const taskId = props.params.data?.id
  const pathKey = props.params.data?.pathKey
  
  // Format date for API
  const formattedVal = val ? new Date(val).toISOString().split('T')[0] : null
  
  // Update via context if available (for tree grid)
  if (props.params.context?.updateField) {
    props.params.context.updateField(pathKey, 'dueDate', formattedVal)
  }
  
  // Also update via task store for real API call
  if (taskId) {
    try {
      await taskStore.updateTask(taskId, { dueDate: formattedVal })
    } catch (error) {
      console.error('Failed to update due date:', error)
    }
  }
}

function refresh(nextParams) {
  localDate.value = nextParams?.data?.dueDate || null
  return true
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineExpose({ refresh })
</script>

<template>
  <div class="due-date-cell-wrapper h-full flex items-center">
    <span
      ref="triggerRef"
      @click.stop="togglePopover"
      :class="[
        'flex items-center gap-1 text-xs cursor-pointer hover:bg-black/5 dark-edit:hover:bg-white/5 px-2 py-1 rounded transition-colors',
        localDate ? (isOverdue ? 'text-red-600' : 'text-gray-700 dark-edit:text-gray-300') : 'text-gray-400'
      ]"
    >
      <Calendar class="w-3.5 h-3.5" />
      {{ formatDate(localDate) }}
    </span>
    
    <!-- Teleport datepicker to body -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popupRef"
        class="datepicker-popup"
        :style="{
          position: 'fixed',
          top: popupPosition.top + 'px',
          left: popupPosition.left + 'px',
          zIndex: 99999
        }"
      >
        <VDatePicker
          v-model="localDate"
          mode="date"
          @update:model-value="handleDateChange"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.due-date-cell-wrapper {
  width: 100%;
}
</style>

<style>
/* Ensure datepicker popup is on top */
.datepicker-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.datepicker-popup .vc-container {
  border: none;
  box-shadow: none;
}
</style>
