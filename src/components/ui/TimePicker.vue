<script setup>
import { ref, computed, watch } from 'vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { Clock, ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String, // Expected format "HH:mm"
    default: null
  },
  placeholder: {
    type: String,
    default: 'Select time'
  }
})

const emit = defineEmits(['update:modelValue'])

const hour = ref(11)
const minute = ref(30)
const isOpen = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    const [h, m] = val.split(':')
    hour.value = parseInt(h, 10) || 0
    minute.value = parseInt(m, 10) || 0
  } else {
    // Default to 11:30 if empty
    hour.value = 11
    minute.value = 30
  }
}, { immediate: true })

const formattedTime = computed(() => {
  return `${hour.value.toString().padStart(2, '0')}:${minute.value.toString().padStart(2, '0')}`
})

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  return props.modelValue
})

function updateValue() {
  emit('update:modelValue', formattedTime.value)
}

function incrementHour() {
  hour.value = (hour.value + 1) % 24
  updateValue()
}

function decrementHour() {
  hour.value = (hour.value - 1 + 24) % 24
  updateValue()
}

function incrementMinute() {
  minute.value = (minute.value + 30) % 60
  if (minute.value === 0 && (minute.value - 30 + 60) % 60 !== 0) {
     incrementHour()
  }
  updateValue()
}

function decrementMinute() {
  minute.value = (minute.value - 30 + 60) % 60
  if (minute.value === 30) {
     decrementHour()
  }
  updateValue()
}

function incrementMinuteBy1() {
  minute.value = (minute.value + 1) % 60
  updateValue()
}

function decrementMinuteBy1() {
  minute.value = (minute.value - 1 + 60) % 60
  updateValue()
}

// Continuous hold logic
let interval = null
let holdTimeout = null

function startHold(action) {
  action()
  holdTimeout = setTimeout(() => {
    interval = setInterval(action, 80)
  }, 400)
}

function stopHold() {
  if (holdTimeout) clearTimeout(holdTimeout)
  if (interval) clearInterval(interval)
}

function setExactTime() {
  updateValue()
}
</script>

<template>
  <DropdownMenu
    :close-on-select="false"
    position="bottom"
    width="160px"
    @open="isOpen = true"
    @close="isOpen = false"
  >
    <template #trigger="{ toggle }">
      <slot name="trigger" :toggle="toggle" :displayValue="displayValue" :hasValue="!!modelValue">
        <button
          type="button"
          class="flex items-center justify-between min-w-[100px] px-3 py-1.5 border border-gray-300 rounded-[6px] text-sm font-medium hover:bg-gray-50 focus:outline-none transition-colors"
          :class="modelValue ? 'text-gray-900 border-gray-400' : 'text-gray-500'"
          @click="toggle"
        >
          <span>{{ displayValue }}</span>
          <Clock class="w-4 h-4 text-gray-700 ml-2" />
        </button>
      </slot>
    </template>
    
    <template #content>
      <div class="px-2 py-4 flex flex-col items-center justify-center bg-white rounded-lg" @click.stop>
        <div class="flex items-center gap-4">
          <!-- Hour Column -->
          <div class="flex flex-col items-center gap-1">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
              @mousedown="startHold(incrementHour)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @click.stop="incrementHour"
            >
              <ChevronUp class="w-5 h-5" />
            </button>
            <span class="text-xl font-semibold text-gray-800 w-10 text-center select-none tracking-wide">{{ hour.toString().padStart(2, '0') }}</span>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
              @mousedown="startHold(decrementHour)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @click.stop="decrementHour"
            >
              <ChevronDown class="w-5 h-5" />
            </button>
          </div>

          <!-- Separator -->
          <span class="text-xl font-semibold text-gray-600 pb-1">:</span>

          <!-- Minute Column -->
          <div class="flex flex-col items-center gap-1">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
              @mousedown="startHold(incrementMinuteBy1)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @click.stop="incrementMinuteBy1"
            >
              <ChevronUp class="w-5 h-5" />
            </button>
            <span class="text-xl font-semibold text-gray-800 w-10 text-center select-none tracking-wide">{{ minute.toString().padStart(2, '0') }}</span>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
              @mousedown="startHold(decrementMinuteBy1)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @click.stop="decrementMinuteBy1"
            >
              <ChevronDown class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </DropdownMenu>
</template>
