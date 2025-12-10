<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  focusedKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:title', 'commit'])

const title = ref(props.node.data.title || '')
const inputRef = ref(null)

function focusInput() {
  if (inputRef.value) {
    inputRef.value.focus()
    inputRef.value.select()
  }
}

watch(
  () => props.node.data.title,
  (val) => {
    title.value = val || ''
  }
)

watch(title, (val) => emit('update:title', val))

watch(
  () => props.focusedKey,
  (key) => {
    if (key === props.node.key) {
      nextTick(() => {
        focusInput()
      })
    }
  },
  { immediate: true }
)

// Also check focus on mount in case this is a newly created subtask
onMounted(() => {
  if (props.focusedKey === props.node.key) {
    nextTick(() => {
      focusInput()
    })
  }
})

function handleBlur() {
  emit('commit')
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      v-model="title"
      type="text"
      ref="inputRef"
      class="task-title-input"
      :style="{ width: `${Math.min(420, Math.max(160, (title?.length || 0) * 8 + 40))}px` }"
      @blur="handleBlur"
    />
  </div>
</template>

<style scoped>
.task-title-input {
  border: 1px solid transparent;
  background: #ffffff;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  color: #0f172a;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.task-title-input:hover {
  border-color: #cbd5e1;
}

.task-title-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
  background: #eef2ff;
}
</style>
