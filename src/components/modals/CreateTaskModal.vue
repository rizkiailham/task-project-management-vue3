<script setup>
/**
 * CreateTaskModal - Modal for creating new tasks
 */
import { ref, computed, watch } from 'vue'
import { useTaskStore, useProjectStore, useWorkspaceStore, useUIStore, useAIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
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
    header="Create New Task"
    :style="{ width: '500px' }"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :pt="{
      root: { class: 'dark:bg-gray-800' },
      header: { class: 'dark:bg-gray-800 dark:text-white' },
      content: { class: 'dark:bg-gray-800' }
    }"
  >
    <form @submit="onSubmit" class="space-y-4">
      <!-- Title -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Task Title <span class="text-red-500">*</span>
        </label>
        <InputText 
          v-model="title" 
          class="w-full"
          :class="{ 'p-invalid': titleError }"
          placeholder="Enter task title..."
          autofocus
        />
        <small v-if="titleError" class="text-red-500">{{ titleError }}</small>
      </div>

      <!-- Description -->
      <div>
        <div class="mb-1 flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <Button 
            type="button"
            icon="pi pi-sparkles" 
            label="AI Generate" 
            text 
            size="small"
            :loading="isGeneratingAI"
            @click="generateDescription"
          />
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
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project <span class="text-red-500">*</span>
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
        <small v-if="projectError" class="text-red-500">{{ projectError }}</small>
      </div>

      <!-- Status & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
      <div class="flex justify-end gap-2">
        <Button 
          label="Cancel" 
          text 
          @click="closeModal"
          :disabled="isLoading"
        />
        <Button 
          label="Create Task" 
          @click="onSubmit"
          :loading="isLoading"
          :disabled="!meta.valid"
        />
      </div>
    </template>
  </Dialog>
</template>

