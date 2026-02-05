<script setup>
/**
 * ColorPicker - Full-featured color picker
 * 
 * Features:
 * - Preset colors
 * - Gradient canvas with movable indicator
 * - Hue slider
 * - Mode switching (HEX, RGB, HSL)
 * - Editable value inputs
 */
import { ref, computed, watch } from 'vue'
import { ChevronDown, ChevronUp, ChevronRight, Pipette, Shuffle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: '#6366f1'
  },
  presetColors: {
    type: Array,
    default: () => [
      '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#ef4444',
      '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#f97316', '#fb923c',
      '#92400e', '#ca8a04', '#059669', '#84cc16', '#eab308', '#fbbf24'
    ]
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedColor = ref(props.modelValue)
const customExpanded = ref(false)
const hue = ref(250)
const saturation = ref(50)
const lightness = ref(50)
const colorMode = ref('hex') // 'hex', 'rgb', 'hsl'
const modes = ['hex', 'rgb', 'hsl']

// Canvas position (0-100%)
const canvasX = ref(50)
const canvasY = ref(50)

// RGB computed
const rgb = computed(() => {
  const hex = selectedColor.value.replace('#', '')
  return {
    r: parseInt(hex.substring(0, 2), 16) || 0,
    g: parseInt(hex.substring(2, 4), 16) || 0,
    b: parseInt(hex.substring(4, 6), 16) || 0
  }
})

// HSL computed
const hsl = computed(() => {
  const r = rgb.value.r / 255
  const g = rgb.value.g / 255
  const b = rgb.value.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
})

// Hue color for gradient
const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`)

// Hex input value
const hexInput = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  selectedColor.value = newVal
  hexInput.value = newVal
  syncFromColor(newVal)
})

watch(selectedColor, (newVal) => {
  emit('update:modelValue', newVal)
  hexInput.value = newVal
  syncFromColor(newVal)
})

// Sync canvas position and hue from color value
function syncFromColor(hexColor) {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  hue.value = Math.round(h * 360)
  saturation.value = Math.round(s * 100)
  lightness.value = Math.round(l * 100)
  
  // Update canvas position based on saturation and lightness
  canvasX.value = s * 100
  canvasY.value = (1 - l) * 100
  canvasX.value = s * 100
  canvasY.value = (1 - l) * 100
}

function generateRandomColor() {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  selectedColor.value = color
}

function selectPresetColor(color) {
  selectedColor.value = color
}

function isSelectedColor(color) {
  return selectedColor.value.toLowerCase() === color.toLowerCase()
}

function toggleCustom() {
  customExpanded.value = !customExpanded.value
}

function cycleMode() {
  const idx = modes.indexOf(colorMode.value)
  colorMode.value = modes[(idx + 1) % modes.length]
}

function handleHueChange(e) {
  hue.value = parseInt(e.target.value)
  updateColorFromHSL()
}

function handleCanvasClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
  
  canvasX.value = x
  canvasY.value = y
  saturation.value = x
  lightness.value = 100 - y
  
  updateColorFromHSL()
}

function updateColorFromHSL() {
  selectedColor.value = hslToHex(hue.value / 360, saturation.value / 100, lightness.value / 100)
}

function hslToHex(h, s, l) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHex(r, g, b) {
  const toHex = x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function updateHexInput(e) {
  let val = e.target.value.trim().replace(/[^0-9A-Fa-f#]/g, '')
  if (!val.startsWith('#')) val = '#' + val
  // Limit to 7 characters (#RRGGBB)
  val = val.slice(0, 7)
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    selectedColor.value = val.toLowerCase()
  }
  hexInput.value = val.toUpperCase()
}

function limitHexInput(e) {
  // Only allow hex characters
  const allowed = /[0-9A-Fa-f#]/
  if (!allowed.test(e.key) && e.key.length === 1) {
    e.preventDefault()
  }
}

function updateRGB(component, value) {
  const val = Math.max(0, Math.min(255, parseInt(value) || 0))
  const newRgb = { ...rgb.value, [component]: val }
  selectedColor.value = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

function updateHSL(component, value) {
  const max = component === 'h' ? 360 : 100
  const val = Math.max(0, Math.min(max, parseInt(value) || 0))
  if (component === 'h') hue.value = val
  else if (component === 's') saturation.value = val
  else lightness.value = val
  updateColorFromHSL()
}

// Eyedropper API
async function pickColorFromScreen() {
  if (!window.EyeDropper) {
    alert('EyeDropper API is not supported in your browser')
    return
  }
  
  try {
    const eyeDropper = new EyeDropper()
    const result = await eyeDropper.open()
    selectedColor.value = result.sRGBHex
  } catch (err) {
    // User cancelled or error
    console.log('EyeDropper cancelled')
  }
}
</script>

<template>
  <div class="color-picker">
    <!-- Preset Colors Grid -->
    <div class="grid grid-cols-6 gap-2 mb-3 px-3 py-3">
      <button
        v-for="color in presetColors"
        :key="color"
        type="button"
        class="relative w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        :class="isSelectedColor(color) ? 'ring-2 ring-offset-2 ring-gray-900' : ''"
        :style="{ backgroundColor: color }"
        :title="color"
        @click="selectPresetColor(color)"
      >
        <slot v-if="isSelectedColor(color)" name="selected-item" :color="color">
          <span class="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white drop-shadow">
            &#10003;
          </span>
        </slot>
      </button>
    </div>

    <!-- Custom Section -->
    <div class="border-t border-gray-200 pt-3">
      <button
        type="button"
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#e5e6ec] rounded transition-colors"
        @click.stop="toggleCustom"
      >
        <span>Custom</span>
        <ChevronRight v-if="!customExpanded" class="w-3.5 h-3.5 text-gray-400" />
        <ChevronUp v-else class="w-3.5 h-3.5 text-gray-400" />
        <div 
          class="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 ml-1"
          :style="{ backgroundColor: selectedColor }"
        ></div>
        <div class="ml-auto flex items-center">
          <!-- Random color button -->
          <button 
            type="button"
            class="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            @click.stop="generateRandomColor"
            title="Random color"
          >
            <Shuffle class="w-3 h-3" />
          </button>
        </div>
      </button>

      <!-- Custom Picker UI -->
      <div v-if="customExpanded" class="mt-3 space-y-3 px-3">
        <!-- Gradient Canvas -->
        <div 
          class="relative w-full h-40 rounded-lg cursor-crosshair overflow-hidden"
          :style="{ background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})` }"
          @mousedown="handleCanvasClick"
          @mousemove="(e) => e.buttons === 1 && handleCanvasClick(e)"
        >
          <!-- Movable position indicator -->
          <div 
            class="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none"
            :style="{ 
              left: `${canvasX}%`, 
              top: `${canvasY}%`, 
              transform: 'translate(-50%, -50%)', 
              boxShadow: '0 0 4px rgba(0,0,0,0.5)' 
            }"
          ></div>
        </div>

        <!-- Controls Row: Eyedropper + Color Preview + Hue Slider -->
        <div class="flex items-center gap-2">
          <!-- Eyedropper -->
          <button
            type="button"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Pick color from screen"
            @click="pickColorFromScreen"
          >
            <Pipette class="w-5 h-5" />
          </button>

          <!-- Color Preview Circle -->
          <div 
            class="w-8 h-8 rounded-full border border-gray-300 flex-shrink-0"
            :style="{ backgroundColor: selectedColor }"
          ></div>

          <!-- Hue Slider -->
          <div class="flex-1 relative h-3 rounded-full overflow-hidden">
            <div 
              class="absolute inset-0 rounded-full"
              style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);"
            ></div>
            <input
              type="range"
              min="0"
              max="360"
              :value="hue"
              @input="handleHueChange"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <!-- Slider thumb -->
            <div 
              class="absolute top-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full pointer-events-none"
              :style="{ left: `${(hue / 360) * 100}%`, transform: 'translate(-50%, -50%)' }"
            ></div>
          </div>
        </div>

        <!-- Value Input Section -->
        <div>
          <!-- HEX Mode -->
          <div v-if="colorMode === 'hex'" class="flex gap-1">
            <div class="flex-1 border border-gray-300 rounded overflow-hidden">
              <input
                type="text"
                :value="selectedColor.toUpperCase()"
                @blur="updateHexInput"
                @keyup.enter="updateHexInput"
                @keypress="limitHexInput"
                maxlength="7"
                class="w-full px-3 py-2 text-sm font-mono text-gray-700 bg-white outline-none"
              />
            </div>
            <button 
              @click="cycleMode" 
              class="flex flex-col items-center justify-center px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <ChevronUp class="w-3 h-3 text-gray-400" />
              <ChevronDown class="w-3 h-3 text-gray-400 -mt-1" />
            </button>
          </div>
          
          <!-- RGB Mode -->
          <div v-else-if="colorMode === 'rgb'" class="flex gap-1">
            <div class="flex-1 flex gap-1">
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="rgb.r"
                  @input="e => updateRGB('r', e.target.value)"
                  min="0" max="255"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="rgb.g"
                  @input="e => updateRGB('g', e.target.value)"
                  min="0" max="255"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="rgb.b"
                  @input="e => updateRGB('b', e.target.value)"
                  min="0" max="255"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
            </div>
            <button 
              @click="cycleMode" 
              class="flex flex-col items-center justify-center px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <ChevronUp class="w-3 h-3 text-gray-400" />
              <ChevronDown class="w-3 h-3 text-gray-400 -mt-1" />
            </button>
          </div>
          
          <!-- HSL Mode -->
          <div v-else class="flex gap-1">
            <div class="flex-1 flex gap-1">
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="hsl.h"
                  @input="e => updateHSL('h', e.target.value)"
                  min="0" max="360"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="hsl.s"
                  @input="e => updateHSL('s', e.target.value)"
                  min="0" max="100"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
              <div class="flex-1 border border-gray-300 rounded overflow-hidden">
                <input
                  type="number"
                  :value="hsl.l"
                  @input="e => updateHSL('l', e.target.value)"
                  min="0" max="100"
                  class="w-full px-2 py-2 text-sm text-center text-gray-700 bg-white outline-none"
                />
              </div>
            </div>
            <button 
              @click.stop="cycleMode" 
              class="flex flex-col items-center justify-center px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <ChevronUp class="w-3 h-3 text-gray-400" />
              <ChevronDown class="w-3 h-3 text-gray-400 -mt-1" />
            </button>
          </div>

          <!-- Mode Label -->
          <div class="text-center mt-1">
            <span class="text-xs text-gray-500 font-medium uppercase">{{ colorMode }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  max-width: 240px;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
