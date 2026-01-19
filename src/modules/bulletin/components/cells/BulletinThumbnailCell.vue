<script setup>
const props = defineProps({
  params: Object
})

const fallbackColors = [
  'from-orange-300 via-pink-400 to-purple-500',
  'from-green-300 via-emerald-400 to-teal-500',
  'from-sky-300 via-blue-400 to-indigo-500',
  'from-amber-300 via-orange-400 to-red-500'
]

function getGradient() {
  const title = props.params.data?.title || ''
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % fallbackColors.length
  return fallbackColors[index]
}
</script>

<template>
  <div class="flex items-center h-full">
    <div class="w-9 h-9 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
      <img
        v-if="params.data?.thumbnail"
        :src="params.data.thumbnail"
        alt=""
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-gradient-to-br" :class="getGradient()"></div>
    </div>
  </div>
</template>
