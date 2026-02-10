<script setup>
/**
 * SettingsProjectStatus - Project status (kanban columns) editor
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Trash, 
  Pencil
} from 'lucide-vue-next'
import { VueDraggableNext } from 'vue-draggable-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const projectId = computed(() => projectStore.currentProjectId)

const columns = ref([])
const originalSnapshot = ref('[]')
const isSaving = ref(false)
const isLoading = ref(false)
const editingColumnId = ref(null)
const tempEditingColumn = ref(null)

const progressOptions = [
  { id: '0', label: t('settings.project.status.todo', 'Todo'), status: 'todo', progress: 0, defaultColor: '#9ca3af' },
  { id: '25', label: '25%', status: 'in_progress', progress: 25, defaultColor: '#14b8a6' },
  { id: '50', label: '50%', status: 'in_progress', progress: 50, defaultColor: '#a855f7' },
  { id: '75', label: '75%', status: 'in_progress', progress: 75, defaultColor: '#f97316' },
  { id: '100', label: t('settings.project.status.done', 'Done'), status: 'done', progress: 100, defaultColor: '#22c55e' },
]

const dragOptions = {
  animation: 200,
  group: 'description',
  disabled: false,
  ghostClass: 'ghost',
  handle: '.drag-handle'
}

function normalizeIconValue(icon) {
  const raw = String(icon ?? '0')
  const legacyMap = {
    '1': '25',
    '2': '50',
    '3': '75',
    '4': '100',
    '5': '100'
  }
  const mapped = legacyMap[raw] || raw
  return progressOptions.some((item) => item.id === mapped) ? mapped : '0'
}

function resolveIconProps(icon) {
  const iconValue = normalizeIconValue(icon)
  const option = progressOptions.find((item) => item.id === iconValue) || progressOptions[0]
  return {
    icon: iconValue,
    status: option.status,
    progress: option.progress,
    color: option.defaultColor
  }
}

function normalizeColumn(column) {
  const iconProps = resolveIconProps(column?.icon)
  return {
    id: column?.id,
    name: column?.name || '',
    icon: iconProps.icon,
    index: Number(column?.index) || 0,
    isHidden: false,
    ...iconProps
  }
}

function createSnapshot(list = columns.value) {
  return JSON.stringify(
    list.map((column, index) => ({
      id: column.id,
      name: (column.name || '').trim(),
      icon: normalizeIconValue(column.icon),
      index: index + 1
    }))
  )
}

const hasPendingChanges = computed(() => {
  if (!projectId.value) return false
  return createSnapshot() !== originalSnapshot.value
})
const isRowEditing = computed(() => Boolean(editingColumnId.value))

async function loadColumns() {
  if (!projectId.value) {
    columns.value = []
    originalSnapshot.value = '[]'
    return
  }

  isLoading.value = true
  try {
    const response = await projectStore.fetchProjectColumns(projectId.value)
    const items = Array.isArray(response) ? response : []
    const sorted = [...items].sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
    columns.value = sorted.map(normalizeColumn)
    originalSnapshot.value = createSnapshot(columns.value)
  } catch (error) {
    columns.value = []
    originalSnapshot.value = '[]'
    uiStore.showApiError(error, t('settings.project.status.errors.load', 'Failed to load project columns'))
  } finally {
    isLoading.value = false
  }
}

watch(projectId, loadColumns, { immediate: true })

function addColumn() {
  const newCol = {
    id: `new-${Date.now()}`,
    name: '',
    icon: '25',
    status: 'in_progress',
    progress: 25,
    color: '#14b8a6',
    index: columns.value.length + 1,
    isHidden: false,
    isNew: true
  }
  columns.value.push(newCol)
  startEditing(newCol)
}

function startEditing(column) {
  if (editingColumnId.value && editingColumnId.value !== column.id) return
  editingColumnId.value = column.id
  tempEditingColumn.value = JSON.parse(JSON.stringify(column))
}

function cancelEdit() {
  if (!editingColumnId.value) return
  
  const column = columns.value.find(c => c.id === editingColumnId.value)
  if (column) {
    if (column.isNew && !column.name) {
      // If it was a new column and empty/cancelled, remove it
      removeColumn(column.id)
    } else {
      // Revert changes from temp
      Object.assign(column, tempEditingColumn.value)
    }
  }
  editingColumnId.value = null
  tempEditingColumn.value = null
}

function saveEdit() {
  if (!editingColumnId.value) return
  
  const column = columns.value.find(c => c.id === editingColumnId.value)
  if (column) {
    if (!column.name.trim()) {
      column.name = t('settings.project.status.new', 'New Status')
    }
  }
  editingColumnId.value = null
  tempEditingColumn.value = null
}

function toggleVisibility(column) {
  column.isHidden = !column.isHidden
}

function removeColumn(columnId) {
  columns.value = columns.value.filter(c => c.id !== columnId)
}

function onDragChange() {
  columns.value = columns.value.map((column, index) => ({
    ...column,
    index: index + 1
  }))
}

function updateIconSelection(column, option) {
  const icon = String(option.id)
  column.status = option.status
  column.progress = option.progress
  column.icon = icon
  column.color = option.defaultColor || column.color
}

async function saveChanges() {
  if (!projectId.value || !hasPendingChanges.value) return
  isSaving.value = true
  try {
    const original = JSON.parse(originalSnapshot.value || '[]')
    const originalMap = new Map(original.map((item) => [item.id, item]))
    const currentIds = new Set(columns.value.filter((item) => !String(item.id).startsWith('new-')).map((item) => item.id))

    let lastResponse = null

    for (const originalItem of original) {
      if (!currentIds.has(originalItem.id)) {
        lastResponse = await projectStore.deleteProjectColumn(originalItem.id)
      }
    }

    for (const column of columns.value) {
      if (String(column.id).startsWith('new-')) {
        const created = await projectStore.createProjectColumn({
          projectId: projectId.value,
          name: column.name?.trim() || t('settings.project.status.new', 'New Status'),
          icon: normalizeIconValue(column.icon)
        })
        const payload = created?.data || created?.column || created
        if (payload?.id) {
          column.id = payload.id
          column.index = Number(payload.index) || column.index
        }
        lastResponse = created
        continue
      }

      const originalItem = originalMap.get(column.id)
      if (!originalItem) continue

      const nextName = column.name?.trim() || t('settings.project.status.new', 'New Status')
      const nextIcon = normalizeIconValue(column.icon)
      const isChanged = originalItem.name !== nextName || String(originalItem.icon ?? '0') !== nextIcon
      if (!isChanged) continue

      lastResponse = await projectStore.updateProjectColumn(column.id, {
        name: nextName,
        icon: nextIcon
      })
    }

    const orderedIds = columns.value.map((column) => column.id).filter(Boolean)
    if (orderedIds.length > 0) {
      lastResponse = await projectStore.reorderProjectColumns({
        projectId: projectId.value,
        columnIds: orderedIds
      })
    }

    if (lastResponse) {
      uiStore.showApiSuccess(lastResponse, t('settings.project.status.messages.saved', 'Project statuses saved successfully'))
    }

    await loadColumns()
  } catch (error) {
    uiStore.showApiError(error, t('settings.project.status.errors.save', 'Failed to save project statuses'))
  } finally {
    isSaving.value = false
  }
}

watch([hasPendingChanges, isSaving, isRowEditing], () => {
  emit('update:hasPendingChanges', hasPendingChanges.value)
  emit('update:isSaving', isSaving.value)
  emit('update:canSave', hasPendingChanges.value && !isSaving.value && !isRowEditing.value)
}, { immediate: true })

defineExpose({ saveChanges })
</script>

<template>
  <div v-if="!projectId" class="settings-project-empty">
    <div class="settings-project-empty-title">{{ t('settings.project.empty.title') }}</div>
    <p class="settings-project-empty-text">{{ t('settings.project.empty.description') }}</p>
  </div>

  <div v-else class="settings-editor-section">
    <div class="settings-project-header mb-6">
      <div class="settings-project-title">
        {{ t('settings.project.menu.items.status', 'Status') }}
      </div>
      <div class="settings-project-description">
        {{ t('settings.project.status.description', 'Customize board columns to match your project workflow and status stages.') }}
      </div>
    </div>

    <div class="settings-editor-field">
      <div class="settings-option-header mb-3">
        <div class="settings-field-title">{{ t('settings.project.status.columns', 'Columns') }}</div>
        <button type="button" class="settings-option-add-btn" :disabled="isRowEditing" @click="addColumn()">
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
      
      <VueDraggableNext
        v-model="columns"
        v-bind="dragOptions"
        :disabled="isRowEditing"
        class="flex flex-col gap-2"
        @change="onDragChange"
      >
        <div 
          v-for="column in columns" 
          :key="column.id" 
          class="status-row group"
          :class="{ 'is-editing': editingColumnId === column.id }"
        >
          <!-- Drag Handle (Only visible when NOT editing) -->
           <div v-if="editingColumnId !== column.id" class="drag-handle cursor-move text-gray-400 hover:text-gray-600 p-1">
            <GripVertical class="w-4 h-4" />
          </div>
          <div v-else class="w-6">
            <!-- Spacer for alignment -->
          </div>

          <!-- Icon (Dropdown when editing, Static when view) -->
          <div class="relative flex items-center">
            <template v-if="editingColumnId === column.id">
              <DropdownMenu
                class="status-icon-menu"
                position="right"
                width="18rem"
                :closeOnSelect="false"
                contentPosition="before"
              >
                <template #trigger>
                   <button 
                    type="button" 
                    class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors border border-dashed border-gray-300 hover:border-gray-400"
                  >
                    <TaskProgressIcon 
                      :status="column.status" 
                      :progress="column.progress" 
                      :color="column.color"
                    />
                  </button>
                </template>
                
                <template #content>
                  <div class="p-3">
                    <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{{ t('settings.project.status.icon', 'Icon') }}</div>
                    <div class="flex items-center gap-3 mb-4">
                       <button
                        v-for="opt in progressOptions"
                        :key="opt.id"
                        type="button"
                        class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-1': String(column.icon) === opt.id }"
                        @click="updateIconSelection(column, opt)"
                        :title="opt.label"
                      >
                         <TaskProgressIcon 
                            :status="opt.status" 
                            :progress="opt.progress"
                            size="md"
                            :color="opt.defaultColor" 
                         />
                      </button>
                    </div>
                  </div>
                </template>
              </DropdownMenu>
            </template>
            <template v-else>
               <div class="w-8 h-8 flex items-center justify-center">
                 <TaskProgressIcon 
                    :status="column.status" 
                    :progress="column.progress" 
                    :color="column.color"
                  />
               </div>
            </template>
          </div>

          <!-- Name Input / Display -->
          <div class="flex-1 min-w-0">
             <div v-if="editingColumnId === column.id">
                <input
                  type="text"
                  ref="nameInput"
                  class="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                  v-model="column.name"
                  :placeholder="t('settings.project.status.namePlaceholder', 'Status Name')"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  autoFocus
                />
             </div>
             <div 
               v-else 
               class="text-sm font-medium text-gray-700 truncate cursor-pointer hover:text-blue-600"
               @click="startEditing(column)"
             >
               {{ column.name }}
             </div>
          </div>

          <!-- Actions -->
           <div class="flex items-center gap-2">
              <template v-if="editingColumnId === column.id">
                 <button
                   type="button"
                   class="btn-action-cancel"
                   @click="cancelEdit"
                 >
                   {{ t('common.cancel', 'Cancel') }}
                 </button>
                 <button
                   type="button"
                   class="btn-action-save"
                   @click="saveEdit"
                 >
                   {{ t('common.save', 'Save') }}
                 </button>
              </template>
              <template v-else>
                 <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                     type="button"
                     class="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                     title="Edit"
                     :disabled="isRowEditing && editingColumnId !== column.id"
                     @click="startEditing(column)"
                   >
                     <Pencil class="w-4 h-4" />
                   </button>
                    <button
                     type="button"
                     class="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                     :title="column.isHidden ? 'Show' : 'Hide'"
                     @click="toggleVisibility(column)"
                   >
                     <EyeOff v-if="column.isHidden" class="w-4 h-4" />
                     <Eye v-else class="w-4 h-4" />
                   </button>
                   <button
                     type="button"
                     class="p-1.5 text-gray-400 hover:text-red-600 rounded"
                     title="Delete"
                     @click="removeColumn(column.id)"
                   >
                     <Trash class="w-4 h-4" />
                   </button>
                 </div>
              </template>
           </div>
        </div>
      </VueDraggableNext>

      <button type="button" class="settings-option-add" :disabled="isRowEditing" @click="addColumn()">
        {{ t('settings.project.status.addColumn', '+ New Status') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-editor-section {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.settings-project-empty {
  padding: 28px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
}

.settings-project-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.settings-project-empty-text {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}

.settings-project-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-project-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.settings-project-description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

.settings-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-field-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.settings-option-add-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  border-radius: 4px;
}

.settings-option-add-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-option-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  transition: box-shadow 0.2s, transform 0.2s;
  min-height: 48px;
}

.status-row:hover {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-color: #e5e7eb;
}

.status-row.is-editing {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.ghost {
  opacity: 0.5;
  background: #edf2f7;
}

.settings-option-add {
  font-size: 12px;
  color: #6b7280;
  text-align: left;
  padding: 0;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
}

.settings-option-add:hover {
  color: #374151;
}

.settings-option-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action-save {
  padding: 6px 16px;
  background-color: #2563eb;
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.btn-action-save:hover {
  background-color: #1d4ed8;
}

.btn-action-cancel {
  padding: 6px 12px;
  background-color: #ffffff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-action-cancel:hover {
  background-color: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
}
</style>

