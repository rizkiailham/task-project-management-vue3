<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Avatar from 'primevue/avatar'
import DatePicker from 'primevue/datepicker'

const props = defineProps({
  params: { type: Object, required: true }
})

const STORAGE_PREFIX = 'desidia:tracking-time:'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatHMS(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${h}:${pad2(m)}:${pad2(ss)}`
}

function formatDurationCompact(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 && m === 0) return `${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const taskId = computed(() => props.params?.data?.id || props.params?.data?.pathKey)
const assigneeName = computed(() => props.params?.data?.assignee || 'Unassigned')

const isOpen = ref(false)
const buttonRef = ref(null)
const popoverStyle = ref({})
const panelRef = ref(null)
const addEntryButtonRef = ref(null)
const addEntryMenuRef = ref(null)
const addEntryMenuStyle = ref({})
const isAddEntryMenuOpen = ref(false)

const totalSeconds = ref(0)
const running = ref(false)
const startedAtMs = ref(null)
const baseSessionSeconds = ref(0)
const sessionUserId = ref(null)
const sessionStartIso = ref(null)
const entries = ref([])
const expandedUserId = ref(null)
const hoveredUserId = ref(null)
const editingEntryId = ref(null)
const editingKind = ref(null) // 'date' | 'start' | 'end'
const editingDateValue = ref(null)
const editorStyle = ref({})
const editorRef = ref(null)
const activeTimePicker = ref(null) // { entryId, kind: 'start'|'end', field: 'hour'|'minute'|'ampm' }
const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

let intervalId = null

function storageKey() {
  return `${STORAGE_PREFIX}${taskId.value}`
}

function load() {
  if (!taskId.value) return
  const parsed = safeJsonParse(localStorage.getItem(storageKey()) || 'null', null)
  if (!parsed) return
  totalSeconds.value = Number(parsed.totalSeconds) || 0
  running.value = Boolean(parsed.running)
  startedAtMs.value = parsed.startedAtMs ?? null
  baseSessionSeconds.value = Number(parsed.baseSessionSeconds) || 0
  sessionUserId.value = parsed.sessionUserId ?? null
  sessionStartIso.value = parsed.sessionStartIso ?? null
  entries.value = Array.isArray(parsed.entries) ? parsed.entries : []
}

function save() {
  if (!taskId.value) return
  const payload = {
    totalSeconds: totalSeconds.value,
    running: running.value,
    startedAtMs: startedAtMs.value,
    baseSessionSeconds: baseSessionSeconds.value,
    sessionUserId: sessionUserId.value,
    sessionStartIso: sessionStartIso.value,
    entries: entries.value,
    assignee: assigneeName.value
  }
  try {
    localStorage.setItem(storageKey(), JSON.stringify(payload))
  } catch {
    // ignore
  }
}

function currentSessionSeconds() {
  if (!running.value || !startedAtMs.value) return baseSessionSeconds.value
  const elapsed = (Date.now() - startedAtMs.value) / 1000
  return baseSessionSeconds.value + Math.max(0, elapsed)
}

const liveSessionSeconds = ref(0)
const liveTotalSeconds = computed(() => totalSeconds.value + liveSessionSeconds.value)

const defaultUsers = [
  { id: 'u1', name: 'Erik Olsvik' },
  { id: 'u2', name: 'Hari W' },
  { id: 'u3', name: 'studio@lomedia.no' }
]

const users = computed(() => {
  const fromGrid = []
  const raw = props.params?.context?.teamOptions
  if (Array.isArray(raw)) {
    for (const u of raw) {
      if (!u) continue
      const id = u.id ?? u.value ?? u.name
      const name = u.name ?? u.label ?? String(u.value ?? '')
      if (id && name) fromGrid.push({ id, name })
    }
  }
  const merged = [...fromGrid]
  for (const u of defaultUsers) if (!merged.some((m) => m.id === u.id)) merged.push(u)
  return merged
})

const assigneeUserId = computed(() => {
  const name = assigneeName.value
  const hit = users.value.find((u) => u.name === name)
  return hit?.id || (users.value[0]?.id ?? 'u1')
})

function dateLabelFromIso(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toDateInputValue(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function partsFromDate(d) {
  const hour24 = d.getHours()
  const minute = d.getMinutes()
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour: hour12, minute, ampm }
}

function minutesFromParts(parts) {
  const h = Math.max(1, Math.min(12, Number(parts?.hour) || 12))
  const m = Math.max(0, Math.min(59, Number(parts?.minute) || 0))
  const isPm = (parts?.ampm || 'AM') === 'PM'
  const hour24 = (h % 12) + (isPm ? 12 : 0)
  return hour24 * 60 + m
}

function formatTime(parts) {
  return `${pad2(parts.hour)}:${pad2(parts.minute)} ${parts.ampm}`
}

function toDateTime(dateISO, minutes) {
  const [year, month, day] = (dateISO || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const d = new Date(year, month - 1, day, 0, 0, 0, 0)
  d.setMinutes(minutes)
  return d
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

function ensureValid(entry) {
  const startMinutes = minutesFromParts(entry.start)
  const endMinutes = minutesFromParts(entry.end)
  const startDt = toDateTime(entry.date, startMinutes)
  let endDt = toDateTime(entry.date, endMinutes)
  if (!startDt || !endDt) return
  if (endDt <= startDt) {
    endDt = new Date(startDt)
    endDt.setMinutes(endDt.getMinutes() + 1)
    entry.end = partsFromDate(endDt)
  }
}

const totalsByUser = computed(() => {
  const totals = new Map()
  for (const u of users.value) totals.set(u.id, 0)
  for (const e of entries.value) totals.set(e.userId, (totals.get(e.userId) || 0) + durationSeconds(e))
  // Add accumulated totalSeconds into the assignee bucket for the simple 1-user view
  totals.set(assigneeUserId.value, (totals.get(assigneeUserId.value) || 0) + totalSeconds.value)
  return totals
})

const visibleUsers = computed(() => {
  const id = assigneeUserId.value
  const u = users.value.find((x) => x.id === id) || { id, name: assigneeName.value }
  const total = totalsByUser.value.get(id) || 0
  const show = running.value || totalSeconds.value > 0 || entries.value.some((e) => e.userId === id)
  return show ? [{ ...u, total }] : []
})

function tick() {
  liveSessionSeconds.value = Math.floor(currentSessionSeconds())
}

function startTicking() {
  stopTicking()
  tick()
  intervalId = window.setInterval(tick, 250)
}

function stopTicking() {
  if (intervalId) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function updatePopoverPosition() {
  const btn = buttonRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const width = 320
  const gap = 8
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.right - width))
  const top = rect.bottom + gap
  popoverStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function updateAddEntryMenuPosition() {
  const btn = addEntryButtonRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const width = 260
  const gap = 6
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.right - width + 18))
  const top = rect.top - gap
  addEntryMenuStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function updateInlineEditorPosition(anchorEl, width = 96) {
  if (!anchorEl) return
  const rect = anchorEl.getBoundingClientRect()
  const gap = 6
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.left))
  const top = rect.bottom + gap
  editorStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function onDocumentMouseDown(e) {
  if (!isOpen.value) return
  if (isAddEntryMenuOpen.value) {
    const menu = addEntryMenuRef.value
    const btn = addEntryButtonRef.value
    if (menu && menu.contains(e.target)) return
    if (btn && btn.contains(e.target)) return
    isAddEntryMenuOpen.value = false
  }
  const el = panelRef.value
  if (!el) return
  const menu = addEntryMenuRef.value
  if (menu && menu.contains(e.target)) return
  const editor = editorRef.value
  if (editor && editor.contains(e.target)) return
  activeTimePicker.value = null
  editingEntryId.value = null
  editingKind.value = null
  if (!el.contains(e.target)) close()
}

function play() {
  if (running.value) return
  running.value = true
  startedAtMs.value = Date.now()
  baseSessionSeconds.value = 0
  sessionUserId.value = assigneeUserId.value
  sessionStartIso.value = new Date().toISOString()
  expandedUserId.value = assigneeUserId.value
  startTicking()
  save()
}

function stop() {
  if (!running.value) return
  const session = currentSessionSeconds()
  const sessionSeconds = Math.max(0, Math.floor(session))
  totalSeconds.value += sessionSeconds
  // Create an entry from the last run
  const startDate = sessionStartIso.value ? new Date(sessionStartIso.value) : new Date(Date.now() - sessionSeconds * 1000)
  const endDate = new Date()
  const dateISO = toDateInputValue(startDate)
  const entry = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: sessionUserId.value || assigneeUserId.value,
    date: dateISO,
    start: partsFromDate(startDate),
    end: partsFromDate(endDate)
  }
  ensureValid(entry)
  entries.value.unshift(entry)
  running.value = false
  startedAtMs.value = null
  baseSessionSeconds.value = 0
  sessionUserId.value = null
  sessionStartIso.value = null
  liveSessionSeconds.value = 0
  stopTicking()
  save()
}

function toggleAddEntryMenu() {
  isAddEntryMenuOpen.value = !isAddEntryMenuOpen.value
  if (isAddEntryMenuOpen.value) updateAddEntryMenuPosition()
}

function selectUserForEntry(user) {
  const now = new Date()
  const start = new Date(now)
  start.setMinutes(start.getMinutes() - 1)
  const entry = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    date: toDateInputValue(now),
    start: partsFromDate(start),
    end: partsFromDate(now)
  }
  ensureValid(entry)
  entries.value.unshift(entry)
  expandedUserId.value = user.id
  isAddEntryMenuOpen.value = false
  save()
}

function toggleUserExpanded(userId) {
  expandedUserId.value = expandedUserId.value === userId ? null : userId
}

function userEntries(userId) {
  return entries.value.filter((e) => e.userId === userId)
}

function openEntryEditor(entryId, kind, anchorEl) {
  editingEntryId.value = entryId
  editingKind.value = kind
  if (kind === 'date') {
    const entry = entries.value.find((e) => e.id === entryId)
    editingDateValue.value = entry?.date ? new Date(entry.date) : new Date()
    if (anchorEl) updateInlineEditorPosition(anchorEl, 360)
  }
}

function closeEntryEditor() {
  activeTimePicker.value = null
  editingEntryId.value = null
  editingKind.value = null
  editingDateValue.value = null
}

const editingEntry = computed(() => entries.value.find((e) => e.id === editingEntryId.value) || null)

function applyEditingDate() {
  const entry = editingEntry.value
  if (!entry || !editingDateValue.value) return
  entry.date = toDateInputValue(editingDateValue.value)
  ensureValid(entry)
  save()
  closeEntryEditor()
}

function setTimePart(kind, part, value) {
  const entry = editingEntry.value
  if (!entry || (kind !== 'start' && kind !== 'end')) return
  if (!entry[kind]) return
  entry[kind][part] = value
  ensureValid(entry)
  save()
}

function openTimePicker(entry, kind, field, anchorEl) {
  if (!entry?.id) return
  editingEntryId.value = entry.id
  editingKind.value = kind
  activeTimePicker.value = { entryId: entry.id, kind, field }
  if (anchorEl) updateInlineEditorPosition(anchorEl, 96)
}

const pickerOptions = computed(() => {
  const p = activeTimePicker.value
  if (!p) return []
  if (p.field === 'hour') return hourOptions
  if (p.field === 'minute') return minuteOptions
  return ['AM', 'PM']
})

function pickerLabel(opt) {
  const p = activeTimePicker.value
  if (!p) return String(opt)
  if (p.field === 'minute') return pad2(opt)
  return String(opt)
}

function isPickerSelected(opt) {
  const p = activeTimePicker.value
  const entry = editingEntry.value
  if (!p || !entry) return false
  const cur = entry?.[p.kind]?.[p.field]
  return cur === opt
}

function selectPickerOption(opt) {
  const p = activeTimePicker.value
  if (!p) return
  setTimePart(p.kind, p.field, opt)
  activeTimePicker.value = null
}

watch(taskId, () => {
  load()
  if (running.value) startTicking()
  else {
    liveSessionSeconds.value = 0
    stopTicking()
  }
})

	watch(isOpen, (open) => {
	  if (open) {
	    updatePopoverPosition()
	    document.addEventListener('mousedown', onDocumentMouseDown)
	    window.addEventListener('resize', updatePopoverPosition)
	    // Capture scroll from any scrollable parent (grid body, etc.)
	    window.addEventListener('scroll', updatePopoverPosition, true)
	    window.addEventListener('resize', updateAddEntryMenuPosition)
	    window.addEventListener('scroll', updateAddEntryMenuPosition, true)
	  } else {
	    document.removeEventListener('mousedown', onDocumentMouseDown)
	    window.removeEventListener('resize', updatePopoverPosition)
	    window.removeEventListener('scroll', updatePopoverPosition, true)
	    window.removeEventListener('resize', updateAddEntryMenuPosition)
	    window.removeEventListener('scroll', updateAddEntryMenuPosition, true)
	    isAddEntryMenuOpen.value = false
	    closeEntryEditor()
	  }
	})

	onBeforeUnmount(() => {
	  document.removeEventListener('mousedown', onDocumentMouseDown)
	  window.removeEventListener('resize', updatePopoverPosition)
	  window.removeEventListener('scroll', updatePopoverPosition, true)
	  window.removeEventListener('resize', updateAddEntryMenuPosition)
	  window.removeEventListener('scroll', updateAddEntryMenuPosition, true)
	  stopTicking()
	})

load()
if (running.value) startTicking()
</script>

<template>
  <div class="relative flex items-center justify-center">
    <button
      type="button"
      ref="buttonRef"
      class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      title="Tracking time"
      @click.stop="toggleOpen"
    >
      <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="fixed z-[10000] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        :style="popoverStyle"
      >
      <!-- Header row -->
      <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center gap-2 min-w-0">
          <button
            v-if="!running"
            type="button"
            class="w-7 h-7 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
            title="Start timer"
            @click="play"
          >
            <svg class="w-4 h-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="9 7 19 12 9 17 9 7"></polygon>
            </svg>
          </button>
          <button
            v-else
            type="button"
            class="w-7 h-7 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
            title="Stop timer"
            @click="stop"
          >
            <svg class="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="7" y="7" width="10" height="10" rx="1"></rect>
            </svg>
          </button>

          <span class="text-sm font-medium text-gray-700 tabular-nums">{{ formatHMS(liveSessionSeconds) }}</span>
        </div>
        <span class="text-sm text-gray-500 tabular-nums">{{ formatHMS(liveTotalSeconds) }}</span>
      </div>

      <!-- User row (only after first run or if running) -->
      <div
        v-for="user in visibleUsers"
        :key="user.id"
        class="border-b border-gray-100"
      >
        <div
          class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
          @mouseenter="hoveredUserId = user.id"
          @mouseleave="hoveredUserId = null"
          @click="toggleUserExpanded(user.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-[22px] h-[22px] flex items-center justify-center">
              <svg
                v-if="hoveredUserId === user.id"
                class="w-4 h-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline v-if="expandedUserId === user.id" points="6 9 12 15 18 9"></polyline>
                <polyline v-else points="9 18 15 12 9 6"></polyline>
              </svg>
              <Avatar
                v-else
                :label="user.name.charAt(0).toUpperCase()"
                shape="circle"
                size="small"
                class="bg-orange-100 text-orange-700"
                style="width: 22px; height: 22px; font-size: 10px;"
              />
            </div>
            <span class="text-sm text-gray-700 truncate">{{ user.name }}</span>
          </div>
          <span class="text-sm text-gray-500 tabular-nums">{{ formatHMS(user.total) }}</span>
        </div>

        <div v-if="expandedUserId === user.id" class="bg-gray-50">
          <div
            v-for="entry in userEntries(user.id)"
            :key="entry.id"
            class="px-3 py-1.5 border-t border-gray-100"
          >
            <!-- Tight single-line entry row -->
            <div class="flex items-center gap-2 whitespace-nowrap w-full">
              <button
                type="button"
                class="text-xs text-gray-500 tabular-nums hover:text-gray-700 flex-shrink-0"
                title="Edit date"
                @click.stop="openEntryEditor(entry.id, 'date', $event.currentTarget)"
              >
                {{ dateLabelFromIso(entry.date) }}
              </button>


              <span class="h-6 inline-flex items-center text-xs font-medium text-gray-600 tabular-nums flex-shrink-0">
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit start hour"
                  @click.stop="openTimePicker(entry, 'start', 'hour', $event.currentTarget)"
                >
                  {{ pad2(entry.start.hour) }}
                </button>
                <span class="text-gray-400">:</span>
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit start minute"
                  @click.stop="openTimePicker(entry, 'start', 'minute', $event.currentTarget)"
                >
                  {{ pad2(entry.start.minute) }}
                </button>
                <span class="text-gray-400">&nbsp;</span>
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit start AM/PM"
                  @click.stop="openTimePicker(entry, 'start', 'ampm', $event.currentTarget)"
                >
                  {{ entry.start.ampm }}
                </button>
              </span>

              <span class="text-xs text-gray-400 flex-shrink-0">→</span>

              <!-- total count per data -->
              <span class="h-6 inline-flex items-center text-xs font-medium text-gray-600 tabular-nums flex-shrink-0">
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit end hour"
                  @click.stop="openTimePicker(entry, 'end', 'hour', $event.currentTarget)"
                >
                  {{ pad2(entry.end.hour) }}
                </button>
                <span class="text-gray-400">:</span>
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit end minute"
                  @click.stop="openTimePicker(entry, 'end', 'minute', $event.currentTarget)"
                >
                  {{ pad2(entry.end.minute) }}
                </button>
                <span class="text-gray-400">&nbsp;</span>
                <button
                  type="button"
                  class="hover:text-gray-800"
                  title="Edit end AM/PM"
                  @click.stop="openTimePicker(entry, 'end', 'ampm', $event.currentTarget)"
                >
                  {{ entry.end.ampm }}
                </button>
              </span>

              <span class="ml-auto text-xs text-gray-500 tabular-nums text-right flex-shrink-0 w-14">
                {{ formatDurationCompact(durationSeconds(entry)) }}
              </span>
            </div>

          </div>
        </div>
      </div>

      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        @click.stop="toggleAddEntryMenu"
        ref="addEntryButtonRef"
      >
        <span class="flex items-center gap-2">
          <span class="text-gray-400">+</span>
          <span>Add entry</span>
        </span>
        <svg class="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isOpen && isAddEntryMenuOpen"
        ref="addEntryMenuRef"
        class="fixed z-[10001] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        :style="addEntryMenuStyle"
      >
        <div class="py-1">
          <button
            v-for="u in users"
            :key="u.id"
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="selectUserForEntry(u)"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-800">
              {{ u.name.charAt(0).toUpperCase() }}
            </span>
            <span class="truncate">{{ u.name }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isOpen && editingEntryId && editingKind === 'date' && editingEntry"
        ref="editorRef"
        class="fixed z-[10002] rounded-xl border border-gray-200 bg-white shadow-xl p-3"
        :style="editorStyle"
      >
        <DatePicker
          v-model="editingDateValue"
          inline
          class="w-full desidia-inline-datepicker"
          @update:modelValue="applyEditingDate"
        />
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isOpen && activeTimePicker && editingEntry"
        ref="editorRef"
        class="fixed z-[10002] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        :style="editorStyle"
      >
        <div class="max-h-[220px] overflow-auto py-1">
          <button
            v-for="opt in pickerOptions"
            :key="String(opt)"
            type="button"
            class="w-full px-3 py-1.5 text-left text-xs tabular-nums hover:bg-gray-50"
            :class="isPickerSelected(opt) ? 'bg-gray-100 text-gray-900' : 'text-gray-700'"
            @click.stop="selectPickerOption(opt)"
          >
            {{ pickerLabel(opt) }}
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
:deep(.desidia-inline-datepicker .p-datepicker) {
  width: 340px;
}
</style>
