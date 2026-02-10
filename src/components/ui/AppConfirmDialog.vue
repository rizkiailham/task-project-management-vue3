<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { 
  AlertTriangle, 
  Trash, 
  Info, 
  CheckCircle
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  acceptCallback: {
    type: Function,
    required: true
  },
  rejectCallback: {
    type: Function,
    required: true
  }
})
const { t } = useI18n()

// Configuration for different dialog types
// types: 'delete', 'countdown', 'info' (default), 'success', 'warning'
const config = computed(() => {
  const type = props.message.group || props.message.dialogType || 'info'
  
  switch (type) {
    case 'delete':
    case 'destructive':
      return {
        icon: Trash,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        cancelBtnClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
        confirmLabel: props.message.acceptLabel || t('common.delete'),
        cancelLabel: props.message.rejectLabel || t('common.cancel')
      }
    case 'countdown':
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
        cancelBtnClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
        confirmLabel: props.message.acceptLabel || t('common.confirm'),
        cancelLabel: props.message.rejectLabel || t('common.cancel')
      }
    case 'success':
      return {
        icon: CheckCircle,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        confirmBtnClass: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
        cancelBtnClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
        confirmLabel: props.message.acceptLabel || t('common.confirm'),
        cancelLabel: props.message.rejectLabel || t('common.cancel')
      }
    case 'info':
    default:
      return {
        icon: Info,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        cancelBtnClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
        confirmLabel: props.message.acceptLabel || t('common.confirm'),
        cancelLabel: props.message.rejectLabel || t('common.cancel')
      }
  }
})

// Countdown Logic
const timeLeft = ref(0)
const timer = ref(null)
const isCountdownActive = computed(() => 
  (props.message.dialogType === 'countdown' || props.message.countdown) && timeLeft.value > 0
)

onMounted(() => {
  if (props.message.dialogType === 'countdown' || props.message.countdown) {
    timeLeft.value = props.message.timeout || props.message.countdown || 3
    timer.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        clearInterval(timer.value)
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer.value) clearInterval(timer.value)
})

function handleAccept() {
  if (isCountdownActive.value) return
  props.acceptCallback()
}

function handleReject() {
  props.rejectCallback()
}
</script>

<template>
  <div class="flex flex-col gap-4 p-5 bg-white rounded-md shadow-xl max-w-md w-full border border-gray-100">
    <!-- Header -->
    <div class="flex items-start gap-4">
      <div 
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        :class="config.iconBg"
      >
        <component :is="config.icon" class="h-5 w-5" :class="config.iconColor" />
      </div>
      
      <div class="flex-1">
        <h3 class="text-base font-semibold leading-6 text-gray-900" v-if="message.header">
          {{ message.header }}
        </h3>
        <div class="mt-2">
          <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {{ message.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-3 mt-2">
      <Button
        type="button"
        unstyled
        class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-colors"
        @click="handleReject"
      >
        {{ config.cancelLabel }}
      </Button>
      
      <Button
        type="button"
        unstyled
        class="inline-flex justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          config.confirmBtnClass,
          isCountdownActive ? 'opacity-60 cursor-not-allowed' : ''
        ]"
        @click="handleAccept"
        :disabled="isCountdownActive"
      >
        <span v-if="isCountdownActive" class="mr-1">
          ({{ timeLeft }})
        </span>
        {{ config.confirmLabel }}
      </Button>
    </div>
  </div>
</template>

