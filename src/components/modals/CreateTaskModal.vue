<script setup>
/**
 * CreateTaskModal - Modal for creating new tasks
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore, useAIStore, useUserStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'
import UserSearchDropdown from '@/components/user/UserSearchDropdown.vue'
import Avatar from 'primevue/avatar'
import { User as UserIcon } from 'lucide-vue-next'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// PrimeVue
import Dialog from 'primevue/dialog'
import FormInput from '@/components/ui/FormInput.vue'
import DatePicker from 'primevue/datepicker'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const aiStore = useAIStore()
const { t } = useI18n()

// Modal visibility
const visible = computed({
  get: () => uiStore.activeModal === 'createTask',
  set: (val) => { if (!val) uiStore.closeModal() }
})

const isLoading = ref(false)
const isGeneratingAI = computed(() => aiStore.isGenerating)

// Form validation
const validationSchema = yup.object({
  title: yup.string().required(t('tasks.validation.titleRequired')).min(2, t('tasks.validation.titleMin')),
  description: yup.string(),
  projectId: yup.string().required(t('tasks.validation.projectRequired')),
  status: yup.string().required(),
  priority: yup.string().required(),
  dueDate: yup.date().nullable(),
  assigneeId: yup.string().nullable()
})

const { handleSubmit, meta, resetForm, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    title: '',
    description: '',
    projectId: projectStore.currentProjectId || '',
    status: uiStore.modalData?.defaultStatus || TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    kanbanColumnId: uiStore.modalData?.kanbanColumnId || null,
    assigneeId: null,
    assignee: null
  }
})

const { value: title, errorMessage: titleError } = useField('title')
const { value: description } = useField('description')
const { value: projectId, errorMessage: projectError } = useField('projectId')
const { value: status } = useField('status')
const { value: priority } = useField('priority')
const { value: dueDate } = useField('dueDate')
const { value: kanbanColumnId } = useField('kanbanColumnId')
const { value: assigneeId } = useField('assigneeId')
const { value: assignee } = useField('assignee')

// Options
const projectOptions = computed(() => 
  projectStore.projects.map(p => ({ label: p.name, value: p.id }))
)

const statusOptions = [
  { label: t('tasks.statusOptions.todo'), value: TaskStatus.TODO },
  { label: t('tasks.statusOptions.inProgress'), value: TaskStatus.IN_PROGRESS },
  { label: t('tasks.statusOptions.inReview'), value: TaskStatus.IN_REVIEW }
]

const priorityOptions = [
  { label: t('tasks.priorityOptions.urgent'), value: TaskPriority.URGENT },
  { label: t('tasks.priorityOptions.high'), value: TaskPriority.HIGH },
  { label: t('tasks.priorityOptions.medium'), value: TaskPriority.MEDIUM },
  { label: t('tasks.priorityOptions.low'), value: TaskPriority.LOW }
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
        dueDate: null,
        kanbanColumnId: uiStore.modalData?.kanbanColumnId || null,
        assigneeId: null,
        assignee: null
      }
    })
  }
})

// Methods
const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const { assignee, ...rest } = values
    const response = await taskStore.createNewTask({
      ...rest,
      dueDate: values.dueDate?.toISOString()
    })
    uiStore.closeModal()
  } catch (error) {
    uiStore.showApiError(error, t('tasks.errors.create'))
  } finally {
    isLoading.value = false
  }
})

function handleAssigneeSelect(user) {
  setFieldValue('assigneeId', user?.id || null)
  setFieldValue('assignee', user)
}

async function generateDescription() {
  if (!title.value) {
    uiStore.showWarning(t('tasks.errors.titleRequired'))
    return
  }
  
  try {
    const result = await aiStore.generateDescription(title.value)
    if (result) {
      setFieldValue('description', result)
    }
  } catch (error) {
    uiStore.showApiError(error, t('tasks.errors.generateDescription'))
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
          <h2 class="text-lg font-semibold text-gray-900">{{ t('tasks.createModal.title') }}</h2>
          <p class="text-sm text-gray-500">{{ t('tasks.createModal.subtitle') }}</p>
        </div>
      </div>
    </template>

    <form @submit="onSubmit" class="space-y-5">
      <!-- Title -->
      <div>
        <FormInput
          id="task-title"
          v-model="title"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          class="w-full"
          :class="{ 'p-invalid': titleError }"
          :placeholder="t('tasks.createModal.placeholders.title')"
          autofocus
        >
          <template #label>
            {{ t('tasks.fields.title') }} <span class="text-red-500">*</span>
          </template>
        </FormInput>
        <small v-if="titleError" class="mt-1 block text-sm text-red-500">{{ titleError }}</small>
      </div>

      <!-- Description -->
      <div>
        <div class="mb-2 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            :disabled="isGeneratingAI"
            @click="generateDescription"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {{ isGeneratingAI ? t('aiChat.generating') : t('tasks.createModal.aiGenerate') }}
          </button>
        </div>
        <FormInput
          id="task-description"
          v-model="description"
          as="textarea"
          :label="t('tasks.fields.description')"
          labelClass="text-sm font-medium text-gray-700"
          rows="3"
          class="w-full"
          :placeholder="t('tasks.placeholders.description')"
        />
      </div>

      <!-- Project -->
      <div>
        <FormInput
          id="task-project"
          v-model="projectId"
          as="select"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          :options="projectOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('tasks.placeholders.project')"
          class="w-full"
          :class="{ 'p-invalid': projectError }"
        >
          <template #label>
            {{ t('tasks.fields.project') }} <span class="text-red-500">*</span>
          </template>
        </FormInput>
        <small v-if="projectError" class="mt-1 block text-sm text-red-500">{{ projectError }}</small>
      </div>

      <!-- Assignee -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          {{ t('taskDetail.assignee') }}
        </label>
        <UserSearchDropdown
          :projectId="projectId"
          @select="handleAssigneeSelect"
        >
          <template #trigger>
            <div class="flex items-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-gray-400 cursor-pointer transition-all bg-white">
              <Avatar 
                v-if="assignee"
                :label="assignee.avatar || assignee.name?.charAt(0)"
                shape="circle"
                size="small"
                class="bg-blue-100 text-blue-700 font-semibold"
                style="width: 24px; height: 24px; font-size: 11px;"
              />
              <div 
                v-else 
                class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-gray-500 group-hover:text-gray-600 transition-colors"
              >
                <UserIcon class="w-3 h-3" />
              </div>
              <span :class="assignee ? 'text-gray-900' : 'text-gray-400'" class="text-sm">
                {{ assignee?.name || t('taskDetail.unassigned') || 'Unassigned' }}
              </span>
              <svg class="ml-auto w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </template>
        </UserSearchDropdown>
      </div>

      <!-- Status & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <FormInput
            id="task-status"
            v-model="status"
            as="select"
            :label="t('tasks.fields.status')"
            labelClass="mb-2 block text-sm font-medium text-gray-700"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div>
          <FormInput
            id="task-priority"
            v-model="priority"
            as="select"
            :label="t('tasks.fields.priority')"
            labelClass="mb-2 block text-sm font-medium text-gray-700"
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
          {{ t('tasks.fields.dueDate') }}
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
          {{ t('common.cancel') }}
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
          {{ isLoading ? t('tasks.createModal.creating') : t('tasks.createModal.cta') }}
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
