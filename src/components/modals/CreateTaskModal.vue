<script setup>
/**
 * CreateTaskModal - Modal for creating new tasks
 */
import { ref, computed, watch } from 'vue'
import { useTaskStore, useProjectStore, useUIStore, useAIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const aiStore = useAIStore()

// Modal visibility
const visible = computed({
  get: () => uiStore.activeModal === 'createTask',
  set: (val) => { if (!val) uiStore.closeModal() }
})

const isLoading = ref(false)
const isGeneratingAI = computed(() => aiStore.isGenerating)

// Form validation
const validationSchema = yup.object({
  title: yup.string().required('Task title is required').min(2, 'Title must be at least 2 characters'),
  description: yup.string(),
  projectId: yup.string().required('Please select a project'),
  status: yup.string().required(),
  priority: yup.string().required(),
  dueDate: yup.date().nullable()
})

const { handleSubmit, meta, resetForm, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    title: '',
    description: '',
    projectId: projectStore.currentProjectId || '',
    status: uiStore.modalData?.defaultStatus || TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null
  }
})

const { value: title, errorMessage: titleError } = useField('title')
const { value: description } = useField('description')
const { value: projectId, errorMessage: projectError } = useField('projectId')
const { value: status } = useField('status')
const { value: priority } = useField('priority')
const { value: dueDate } = useField('dueDate')

// Options
const projectOptions = computed(() => 
  projectStore.projects.map(p => ({ label: p.name, value: p.id }))
)

const statusOptions = [
  { label: 'To Do', value: TaskStatus.TODO },
  { label: 'In Progress', value: TaskStatus.IN_PROGRESS },
  { label: 'In Review', value: TaskStatus.IN_REVIEW }
]

const priorityOptions = [
  { label: 'Urgent', value: TaskPriority.URGENT },
  { label: 'High', value: TaskPriority.HIGH },
  { label: 'Medium', value: TaskPriority.MEDIUM },
  { label: 'Low', value: TaskPriority.LOW }
]

// Watch for modal data changes
watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm({
      values: {
        title: '',
        description: '',
        projectId: projectStore.currentProjectId || '',
        status: uiStore.modalData?.defaultStatus || TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: null
      }
    })
  }
})

// Methods
const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await taskStore.createNewTask({
      ...values,
      dueDate: values.dueDate?.toISOString()
    })
    uiStore.showSuccess('Task created successfully')
    uiStore.closeModal()
  } catch (error) {
    uiStore.showError('Failed to create task')
  } finally {
    isLoading.value = false
  }
})

async function generateDescription() {
  if (!title.value) {
    uiStore.showWarning('Please enter a task title first')
    return
  }
  
  try {
    const result = await aiStore.generateDescription(title.value)
    if (result) {
      setFieldValue('description', result)
    }
  } catch (error) {
    uiStore.showError('Failed to generate description')
  }
}

function closeModal() {
  uiStore.closeModal()
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :style="{ width: '520px', maxWidth: '95vw' }"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    class="create-task-modal"
    :pt="{
      root: { class: 'rounded-xl overflow-hidden shadow-2xl border-0' },
      header: { class: 'bg-white border-b border-gray-200 px-6 py-4' },
      content: { class: 'bg-white px-6 py-5' },
      footer: { class: 'bg-gray-50 border-t border-gray-200 px-6 py-4' },
      mask: { class: 'bg-black/40' }
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
          <svg class="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Create New Task</h2>
          <p class="text-sm text-gray-500">Add a new task to your project</p>
        </div>
      </div>
    </template>

    <form @submit="onSubmit" class="space-y-5">
      <!-- Title -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Task Title <span class="text-orange-500">*</span>
        </label>
        <InputText
          v-model="title"
          class="w-full"
          :class="{ 'p-invalid': titleError }"
          placeholder="Enter task title..."
          autofocus
        />
        <small v-if="titleError" class="mt-1 block text-sm text-red-500">{{ titleError }}</small>
      </div>

      <!-- Description -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">
            Description
          </label>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            :disabled="isGeneratingAI"
            @click="generateDescription"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {{ isGeneratingAI ? 'Generating...' : 'AI Generate' }}
          </button>
        </div>
        <Textarea
          v-model="description"
          rows="3"
          class="w-full"
          placeholder="Add a description..."
        />
      </div>

      <!-- Project -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Project <span class="text-orange-500">*</span>
        </label>
        <Select
          v-model="projectId"
          :options="projectOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a project"
          class="w-full"
          :class="{ 'p-invalid': projectError }"
        />
        <small v-if="projectError" class="mt-1 block text-sm text-red-500">{{ projectError }}</small>
      </div>

      <!-- Status & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Status
          </label>
          <Select
            v-model="status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Priority
          </label>
          <Select
            v-model="priority"
            :options="priorityOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <!-- Due Date -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <DatePicker
          v-model="dueDate"
          class="w-full"
          dateFormat="M dd, yy"
          :minDate="new Date()"
          showIcon
          showButtonBar
        />
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          @click="closeModal"
          :disabled="isLoading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="onSubmit"
          :disabled="!meta.valid || isLoading"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ isLoading ? 'Creating...' : 'Create Task' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.create-task-modal :deep(.p-dialog) {
  border: none !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.create-task-modal :deep(.p-dialog-header-close) {
  color: #9ca3af;
  border-radius: 0.5rem;
  transition: all 0.15s;
  width: 2rem;
  height: 2rem;
}

.create-task-modal :deep(.p-dialog-header-close:hover) {
  color: #4b5563;
  background-color: #f3f4f6;
}

.create-task-modal :deep(.p-inputtext),
.create-task-modal :deep(.p-select),
.create-task-modal :deep(.p-textarea),
.create-task-modal :deep(.p-datepicker-input) {
  border-color: #e5e7eb;
  background-color: #fff;
}

.create-task-modal :deep(.p-inputtext:focus),
.create-task-modal :deep(.p-select.p-focus),
.create-task-modal :deep(.p-textarea:focus),
.create-task-modal :deep(.p-datepicker-input:focus) {
  border-color: #f97316;
  box-shadow: 0 0 0 1px #f97316;
}

.create-task-modal :deep(.p-inputtext::placeholder),
.create-task-modal :deep(.p-textarea::placeholder) {
  color: #9ca3af;
}
</style>

