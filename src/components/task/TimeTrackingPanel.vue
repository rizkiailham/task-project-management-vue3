<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Avatar from 'primevue/avatar'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const props = defineProps({
  taskId: { type: [String, Number], required: true },
  users: { type: Array, default: () => [] }
})

const STORAGE_PREFIX = 'desidia:time-tracking:'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateInputValue(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatDateLabel(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function minutesFromParts({ hour, minute, ampm }) {
  const h = Math.max(1, Math.min(12, Number(hour) || 12))
  const m = Math.max(0, Math.min(59, Number(minute) || 0))
  const isPm = (ampm || 'AM') === 'PM'
  const hour24 = (h % 12) + (isPm ? 12 : 0)
  return hour24 * 60 + m
}

function partsFromMinutes(totalMinutes) {
  const minutesClamped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hour24 = Math.floor(minutesClamped / 60)
  const minute = minutesClamped % 60
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour: hour12, minute, ampm }
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${h}:${pad2(m)}:${pad2(ss)}`
}

function toDateTime(dateISO, minutes) {
  const [year, month, day] = (dateISO || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const d = new Date(year, month - 1, day, 0, 0, 0, 0)
  d.setMinutes(minutes)
  return d
}

function safeId() {
  return `tte_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

const defaultUsers = [
  { id: 'u1', name: 'Hari W', avatarLabel: 'H', colorClass: 'bg-orange-100 text-orange-700' },
  { id: 'u2', name: 'Erik Olsvik', avatarLabel: 'E', colorClass: 'bg-blue-100 text-blue-700' },
  { id: 'u3', name: 'studio@lomedia.no', avatarLabel: 'S', colorClass: 'bg-amber-100 text-amber-700' }
]

const resolvedUsers = computed(() => {
  const provided = (props.users || [])
    .filter(Boolean)
    .map((u) => ({
      id: u.id ?? u.value ?? u.name,
      name: u.name ?? u.label ?? String(u.value ?? ''),
      avatarLabel: (u.avatarLabel ?? u.avatar ?? (u.name ?? u.label ?? '?').charAt(0)).toUpperCase(),
      colorClass: u.colorClass ?? 'bg-gray-100 text-gray-700'
    }))
    .filter((u) => u.id && u.name)

  const merged = [...provided]
  for (const fallback of defaultUsers) {
    if (!merged.some((u) => u.id === fallback.id)) merged.push(fallback)
  }
  return merged
})

const entries = ref([])
const editingId = ref(null)
const isAdding = ref(false)

function storageKey() {
  return `${STORAGE_PREFIX}${props.taskId}`
}

function load() {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) entries.value = parsed
  } catch {
    // ignore
  }
}

let saveTimer = null
function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(entries.value))
    } catch {
      // ignore
    }
  }, 250)
}

onMounted(load)
onBeforeUnmount(() => {
  if (saveTimer) window.clearTimeout(saveTimer)
})

watch(
  entries,
  () => {
    scheduleSave()
  },
  { deep: true }
)

function ensureValid(entry) {
  const start = minutesFromParts(entry.start)
  const end = minutesFromParts(entry.end)
  const startDt = toDateTime(entry.date, start)
  let endDt = toDateTime(entry.date, end)
  if (!startDt || !endDt) return entry

  if (endDt <= startDt) {
    endDt = new Date(startDt)
    endDt.setMinutes(endDt.getMinutes() + 15)
    entry.end = partsFromMinutes(endDt.getHours() * 60 + endDt.getMinutes())
  }
  return entry
}

function durationSeconds(entry) {
  const startMinutes = minutesFromParts(entry.start)
  const endMinutes = minutesFromParts(entry.end)
  const startDt = toDateTime(entry.date, startMinutes)
  const endDt = toDateTime(entry.date, endMinutes)
  if (!startDt || !endDt) return 0
  const diff = (endDt.getTime() - startDt.getTime()) / 1000
  return Math.max(0, diff)
}

const totalSeconds = computed(() => entries.value.reduce((sum, e) => sum + durationSeconds(e), 0))

const totalsByUser = computed(() => {
  const totals = new Map()
  for (const u of resolvedUsers.value) totals.set(u.id, 0)
  for (const e of entries.value) totals.set(e.userId, (totals.get(e.userId) || 0) + durationSeconds(e))
  return totals
})

const usersWithTotals = computed(() =>
  resolvedUsers.value
    .map((u) => ({ ...u, totalSeconds: totalsByUser.value.get(u.id) || 0 }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
)

function startEdit(id) {
  editingId.value = id
}

function stopEdit() {
  editingId.value = null
  isAdding.value = false
}

function removeEntry(id) {
  entries.value = entries.value.filter((e) => e.id !== id)
  if (editingId.value === id) stopEdit()
}

function addEntry() {
  const now = new Date()
  const date = toDateInputValue(now)
  const start = partsFromMinutes(now.getHours() * 60 + now.getMinutes())
  const end = partsFromMinutes(now.getHours() * 60 + now.getMinutes() + 60)

  const firstUser = resolvedUsers.value[0]
  const entry = ensureValid({
    id: safeId(),
    userId: firstUser?.id,
    date,
    start,
    end
  })

  entries.value.unshift(entry)
  editingId.value = entry.id
  isAdding.value = true
}

const userMenuItems = computed(() =>
  resolvedUsers.value.map((u) => ({
    id: u.id,
    type: 'item',
    label: u.name,
    action: () => {}
  }))
)

function setEntryUser(entry, userId) {
  entry.userId = userId
}
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center gap-2 text-sm font-medium text-gray-800">
        <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
        <span>Time tracking</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 tabular-nums">{{ formatDuration(totalSeconds) }}</span>
        <button type="button" class="p-1 text-gray-400 hover:text-gray-700" @click.stop>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
      </div>
    </div>

    <div class="divide-y divide-gray-100">
      <!-- Users totals -->
      <div
        v-for="user in usersWithTotals"
        :key="user.id"
        class="flex items-center justify-between px-3 py-2"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Avatar
            :label="user.avatarLabel"
            shape="circle"
            size="small"
            :class="user.colorClass"
            style="width: 22px; height: 22px; font-size: 10px;"
          />
          <span class="text-sm text-gray-700 truncate">{{ user.name }}</span>
        </div>
        <span class="text-xs text-gray-500 tabular-nums">{{ formatDuration(user.totalSeconds) }}</span>
      </div>

      <!-- Entries -->
      <div v-for="entry in entries" :key="entry.id" class="px-3 py-2">
        <div
          class="flex items-center justify-between gap-2"
          :class="editingId === entry.id ? '' : 'cursor-pointer hover:bg-gray-50 rounded-md px-2 py-1 -mx-2 -my-1'"
          @click="editingId === entry.id ? null : startEdit(entry.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <DropdownMenu :items="userMenuItems" position="right" width="14rem">
              <template #trigger>
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click.stop
                >
                  <Avatar
                    :label="resolvedUsers.find(u => u.id === entry.userId)?.avatarLabel || '?'"
                    shape="circle"
                    size="small"
                    class="bg-gray-100 text-gray-700"
                    style="width: 22px; height: 22px; font-size: 10px;"
                  />
                </button>
              </template>
              <template v-for="u in resolvedUsers" :key="u.id">
                <div
                  class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  @click="setEntryUser(entry, u.id)"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-800">
                    {{ u.avatarLabel }}
                  </span>
                  <span class="truncate">{{ u.name }}</span>
                </div>
              </template>
            </DropdownMenu>

            <div class="flex items-center gap-2 text-sm text-gray-700 tabular-nums">
              <span class="text-gray-500">{{ formatDateLabel(entry.date) }}</span>
              <span>{{ pad2(entry.start.hour) }}:{{ pad2(entry.start.minute) }} {{ entry.start.ampm }}</span>
              <span class="text-gray-400">→</span>
              <span>{{ pad2(entry.end.hour) }}:{{ pad2(entry.end.minute) }} {{ entry.end.ampm }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 tabular-nums">{{ formatDuration(durationSeconds(entry)) }}</span>
            <button
              v-if="editingId === entry.id"
              type="button"
              class="p-1 text-gray-400 hover:text-red-600"
              @click.stop="removeEntry(entry.id)"
              title="Remove"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="editingId === entry.id" class="mt-2 grid grid-cols-12 gap-2 items-end">
          <div class="col-span-4">
            <label class="block text-[11px] text-gray-500 mb-1">Date</label>
            <input
              type="date"
              v-model="entry.date"
              class="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>

          <div class="col-span-4">
            <label class="block text-[11px] text-gray-500 mb-1">Start</label>
            <div class="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="12"
                v-model.number="entry.start.hour"
                @change="ensureValid(entry)"
                class="w-14 rounded-md border border-gray-200 px-2 py-1 text-sm"
              />
              <span class="text-gray-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                v-model.number="entry.start.minute"
                @change="ensureValid(entry)"
                class="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm"
              />
              <select
                v-model="entry.start.ampm"
                @change="ensureValid(entry)"
                class="rounded-md border border-gray-200 px-2 py-1 text-sm bg-white"
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>

          <div class="col-span-4">
            <label class="block text-[11px] text-gray-500 mb-1">End</label>
            <div class="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="12"
                v-model.number="entry.end.hour"
                @change="ensureValid(entry)"
                class="w-14 rounded-md border border-gray-200 px-2 py-1 text-sm"
              />
              <span class="text-gray-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                v-model.number="entry.end.minute"
                @change="ensureValid(entry)"
                class="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm"
              />
              <select
                v-model="entry.end.ampm"
                @change="ensureValid(entry)"
                class="rounded-md border border-gray-200 px-2 py-1 text-sm bg-white"
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>

          <div class="col-span-12 flex items-center justify-between">
            <span class="text-xs text-gray-500 tabular-nums">
              Duration: {{ formatDuration(durationSeconds(entry)) }}
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                @click="stopEdit"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        @click="addEntry"
      >
        <span class="text-gray-400">+</span>
        <span>Add entry</span>
      </button>
    </div>
  </div>
</template>

