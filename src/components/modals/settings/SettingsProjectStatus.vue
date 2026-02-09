<script setup>
/**
 * SettingsProjectStatus - Project status (kanban columns) editor
 */
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Trash2, 
  Pencil,
  X,
  Check
} from 'lucide-vue-next'
import { VueDraggableNext } from 'vue-draggable-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import TaskProgressIcon from '@/components/dashboard/TaskProgressIcon.vue'

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const columns = ref([])
// const originalColumns = ref([]) // not needed for dummy
const hasPendingChanges = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)
const editingColumnId = ref(null)
const tempEditingColumn = ref(null)

// Configurable "Progress" options for the icons
// Each option maps to props for TaskProgressIcon
const progressOptions = [
  { id: 'todo', label: t('settings.project.status.todo', 'Todo'), status: 'todo', progress: 0, defaultColor: '#9ca3af' }, // Gray
  { id: 'in_progress_25', label: '25%', status: 'in_progress', progress: 25, defaultColor: '#14b8a6' }, // Teal
  { id: 'in_progress_50', label: '50%', status: 'in_progress', progress: 50, defaultColor: '#a855f7' }, // Purple
  { id: 'in_progress_75', label: '75%', status: 'in_progress', progress: 75, defaultColor: '#f97316' }, // Orange
  { id: 'done', label: t('settings.project.status.done', 'Done'), status: 'done', progress: 100, defaultColor: '#22c55e' }, // Green
  { id: 'critical', label: t('settings.project.status.critical', 'Critical'), status: 'in_progress', progress: 100, defaultColor: '#ef4444' }, // Red
]

const optionColors = [
  '#94a3b8', // Gray
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#ef4444', // Red
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#111827', // Black
]

// Drag options
const dragOptions = {
  animation: 200,
  group: 'description',
  disabled: false,
  ghostClass: 'ghost',
  handle: '.drag-handle'
}

// Dummy Data - Updated to include progress/status for icons
const dummyData = [
  { id: '1', name: 'Backlog', color: '#94a3b8', status: 'todo', progress: 0, isHidden: false },
  { id: '2', name: 'In Progress', color: '#3b82f6', status: 'in_progress', progress: 25, isHidden: false },
  { id: '3', name: 'Review', color: '#eab308', status: 'in_progress', progress: 75, isHidden: false },
  { id: '4', name: 'Done', color: '#22c55e', status: 'done', progress: 100, isHidden: false },
]

async function loadColumns() {
  // if (!projectStore.currentProjectId) return
  isLoading.value = true
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Deep copy dummy data
    columns.value = JSON.parse(JSON.stringify(dummyData))
    hasPendingChanges.value = false
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

// Watch project ID change (even if using dummy data, good to keep structure)
watch(() => projectStore.currentProjectId, loadColumns, { immediate: true })

function addColumn() {
  const newCol = {
    id: `new-${Date.now()}`,
    name: '',
    color: '#3b82f6',
    status: 'in_progress',
    progress: 50,
    isHidden: false,
    isNew: true
  }
  columns.value.push(newCol)
  startEditing(newCol)
  hasPendingChanges.value = true
}

function startEditing(column) {
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
    // Commit changes (already bound to column object, just exit edit mode)
    // If name is empty, maybe prevent save? For now allow, or default to "Untitled"
    if (!column.name.trim()) {
      column.name = t('settings.project.status.new', 'New Status')
    }
  }
  editingColumnId.value = null
  tempEditingColumn.value = null
  hasPendingChanges.value = true
}

function toggleVisibility(column) {
  column.isHidden = !column.isHidden
  hasPendingChanges.value = true
}

function removeColumn(columnId) {
  columns.value = columns.value.filter(c => c.id !== columnId)
  hasPendingChanges.value = true
}

function onDragChange() {
  hasPendingChanges.value = true
}

// Update icon props based on selection
function updateIconSelection(column, option) {
  column.status = option.status
  column.progress = option.progress
  // Also update color to match the preset
  if (option.defaultColor) {
    column.color = option.defaultColor
  }
  hasPendingChanges.value = true
}

async function saveChanges() {
  isSaving.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    hasPendingChanges.value = false
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isSaving.value = false
  }
}

watch([hasPendingChanges, isSaving], () => {
  emit('update:hasPendingChanges', hasPendingChanges.value)
  emit('update:isSaving', isSaving.value)
  emit('update:canSave', hasPendingChanges.value && !isSaving.value)
})

defineExpose({ saveChanges })
</script>

<template>
  <div class="settings-editor-section">
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
        <button type="button" class="settings-option-add-btn" @click="addColumn()">
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
      
      <VueDraggableNext
        v-model="columns"
        v-bind="dragOptions"
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
                    <!-- Icon Options Grid -->
                    <div class="flex items-center gap-3 mb-4">
                      <!-- Progress Options -->
                       <button
                        v-for="opt in progressOptions"
                        :key="opt.id"
                        type="button"
                        class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-1': column.status === opt.status && column.progress === opt.progress }"
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
                    
                    <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{{ t('settings.project.status.color', 'Color') }}</div>
                    <div class="mb-2">
                       <ColorPicker v-model="column.color" @update:modelValue="hasPendingChanges = true" :preset-colors="optionColors" />
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
                     <Trash2 class="w-4 h-4" />
                   </button>
                 </div>
              </template>
           </div>
        </div>
      </VueDraggableNext>

      <button type="button" class="settings-option-add" @click="addColumn()">
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
