<script setup>
/**
 * SettingsProjectEmail - Project email flow configuration (dummy data).
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectStore, useUIStore } from '@/stores'
import FormInput from '@/components/ui/FormInput.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { Link2, MoreHorizontal } from 'lucide-vue-next'

const { t } = useI18n()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const emit = defineEmits(['update:canSave', 'update:isSaving', 'update:hasPendingChanges'])

const projectId = computed(() => projectStore.currentProjectId)
const isSaving = ref(false)

const boardOptions = [
  { label: 'DSD/Task', value: 'task-board' },
  { label: 'General', value: 'general-board' },
  { label: 'Board for tennant', value: 'tenant-board' },
  { label: 'Board for technician', value: 'technician-board' }
]

const actionOptions = [
  { label: t('settings.project.email.actions.createTask', 'Create task'), value: 'create-task', requiresTask: false },
  { label: t('settings.project.email.actions.addComment', 'Add comment'), value: 'add-comment', requiresTask: true },
  { label: t('settings.project.email.actions.sendAgent', 'Send to agent'), value: 'send-agent', requiresTask: false },
  { label: t('settings.project.email.actions.sendSkill', 'Send to skill'), value: 'send-skill', requiresTask: false }
]

const tasksByBoard = {
  'task-board': [
    'Track progress of ongoing facility improvement work',
    'Review duplicated tasks and merge related items',
    'Prepare agenda for upcoming management meeting',
    'Analyze recurring complaints to identify root causes',
    'Confirm vendor availability for scheduled maintenance',
    'Document resolution steps for completed service tasks',
    'Escalate unresolved issues to higher management level'
  ],
  'general-board': [
    'Review onboarding checklist for new team member',
    'Draft internal communication update for stakeholders',
    'Finalize sprint goals for current cycle'
  ],
  'tenant-board': [
    'Follow up tenant request about parking access',
    'Review lease renewal notes for building A',
    'Compile tenant feedback for monthly report'
  ],
  'technician-board': [
    'Schedule preventive maintenance for HVAC unit',
    'Assign on-site inspection for building B',
    'Validate equipment checklist completion'
  ]
}

const agentOptions = [
  { label: 'Agent 1', value: 'agent-1' },
  { label: 'Agent 2', value: 'agent-2' },
  { label: 'Agent 3', value: 'agent-3' }
]

const skillOptions = [
  { label: 'Skill A', value: 'skill-a' },
  { label: 'Skill B', value: 'skill-b' },
  { label: 'Skill C', value: 'skill-c' }
]

const formState = ref({
  name: 'Create task',
  access: 'private',
  boardId: 'task-board',
  actionId: 'add-comment',
  taskName: '',
  agentId: '',
  skillId: ''
})

const savedSnapshot = ref('')

const selectedAction = computed(() =>
  actionOptions.find((option) => option.value === formState.value.actionId) || actionOptions[0]
)

const visibleTaskField = computed(() => Boolean(selectedAction.value?.requiresTask))
const visibleAgentField = computed(() => formState.value.actionId === 'send-agent')
const visibleSkillField = computed(() => formState.value.actionId === 'send-skill')
const availableTasks = computed(() => tasksByBoard[formState.value.boardId] || [])
const taskOptions = computed(() => availableTasks.value.map((task) => ({ label: task, value: task })))

const incomingAddress = computed(() => {
  const project = projectStore.currentProject
  const prefix = project?.initial || project?.name || 'project'
  return `${String(prefix).trim().toLowerCase().replace(/\s+/g, '-')}.create-task@desidia.app`
})

const hasPendingChanges = computed(() => {
  if (!savedSnapshot.value) return false
  return createSnapshot() !== savedSnapshot.value
})

const canSave = computed(() => hasPendingChanges.value && !isSaving.value)

const actionMenuItems = computed(() => [
  {
    id: 'open-preview',
    label: t('settings.project.email.context.openPreview', 'Open preview'),
    action: () => uiStore.showInfo(t('settings.project.email.messages.preview', 'Preview is not available yet.'))
  },
  {
    id: 'send-test-email',
    label: t('settings.project.email.context.sendTestEmail', 'Send test email'),
    action: () => uiStore.showInfo(t('settings.project.email.messages.testEmail', 'Test email flow is not available yet.'))
  },
  {
    id: 'pin-sidebar',
    label: t('settings.project.email.context.pinOnSidebar', 'Pin on sidebar'),
    action: () => uiStore.showInfo(t('settings.project.email.messages.pin', 'Pinned to sidebar (dummy state).'))
  },
  { type: 'divider' },
  {
    id: 'delete',
    label: t('settings.project.email.context.delete', 'Delete'),
    action: () => uiStore.showWarning(t('settings.project.email.messages.delete', 'Delete action is not available yet.'))
  }
])

function createSnapshot() {
  return JSON.stringify({
    name: formState.value.name.trim(),
    access: formState.value.access,
    boardId: formState.value.boardId,
    actionId: formState.value.actionId,
    taskName: formState.value.taskName,
    agentId: formState.value.agentId,
    skillId: formState.value.skillId
  })
}

function resetToDefault() {
  formState.value = {
    name: 'Create task',
    access: 'private',
    boardId: boardOptions[0].value,
    actionId: actionOptions.find((option) => option.value === 'add-comment')?.value || actionOptions[0].value,
    taskName: '',
    agentId: '',
    skillId: ''
  }
  savedSnapshot.value = createSnapshot()
}

async function handleCopyIncomingAddress() {
  try {
    await navigator.clipboard.writeText(incomingAddress.value)
    uiStore.showSuccess(t('settings.project.email.messages.linkCopied', 'Email address copied'))
  } catch {
    uiStore.showError(t('settings.project.email.messages.linkCopyFailed', 'Failed to copy email address'))
  }
}

async function saveChanges() {
  if (!hasPendingChanges.value || isSaving.value) return
  isSaving.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    savedSnapshot.value = createSnapshot()
    uiStore.showSuccess(t('settings.project.email.messages.saved', 'Email settings saved'))
  } finally {
    isSaving.value = false
  }
}

watch(() => formState.value.actionId, (nextAction) => {
  formState.value.taskName = nextAction === 'add-comment' ? formState.value.taskName : ''
  formState.value.agentId = nextAction === 'send-agent' ? formState.value.agentId : ''
  formState.value.skillId = nextAction === 'send-skill' ? formState.value.skillId : ''
})

watch(() => formState.value.boardId, () => {
  if (formState.value.taskName && !availableTasks.value.includes(formState.value.taskName)) {
    formState.value.taskName = ''
  }
})

watch(projectId, () => {
  resetToDefault()
}, { immediate: true })

watch([canSave, isSaving, hasPendingChanges], () => {
  emit('update:canSave', canSave.value)
  emit('update:isSaving', isSaving.value)
  emit('update:hasPendingChanges', hasPendingChanges.value)
}, { immediate: true })

defineExpose({ saveChanges, pendingChanges: hasPendingChanges })
</script>

<template>
  <div>
    <div v-if="!projectId" class="settings-project-empty">
      <div class="settings-project-empty-title">{{ t('settings.project.empty.title', 'Select a project') }}</div>
      <p class="settings-project-empty-text">{{ t('settings.project.empty.description', 'Please select a project to configure email settings.') }}</p>
    </div>

    <div v-else class="settings-email">
      <div class="settings-email-header">
        <div class="settings-project-title">{{ t('settings.project.email.title', 'Edit email') }}</div>
        <div class="settings-email-header-actions">
          <button
            type="button"
            class="settings-email-icon-btn"
            :title="t('settings.project.email.actions.copyAddress', 'Copy incoming email address')"
            @click="handleCopyIncomingAddress"
          >
            <Link2 class="w-4 h-4" />
          </button>

          <DropdownMenu :items="actionMenuItems" position="right" width="12.5rem" variant="sidebar">
            <template #trigger>
              <button
                type="button"
                class="settings-email-icon-btn"
                :title="t('settings.project.email.actions.more', 'More actions')"
              >
                <MoreHorizontal class="w-4 h-4" />
              </button>
            </template>
          </DropdownMenu>
        </div>
      </div>

      <div class="settings-email-field mt-4">
        <FormInput
          id="settings-email-name"
          v-model="formState.name"
          :label="t('settings.project.email.fields.name', 'Name *')"
          :placeholder="t('settings.project.email.placeholders.name', 'Create task')"
          labelClass="mb-2 block text-sm font-medium text-gray-700"
          class="w-full"
        />
      </div>

      <div class="settings-email-section mt-6">
        <div class="settings-email-label">{{ t('settings.project.email.fields.sharing', 'Sharing / Access') }}</div>
        <div class="settings-email-access-grid">
          <button
            type="button"
            class="settings-email-access-card"
            :class="{ 'is-selected': formState.access === 'private' }"
            @click="formState.access = 'private'"
          >
            <span class="settings-email-access-title">{{ t('settings.project.email.access.private.title', 'Private') }}</span>
            <span class="settings-email-access-text">
              {{ t('settings.project.email.access.private.description', 'Only registered project email addresses are allowed') }}
            </span>
          </button>

          <button
            type="button"
            class="settings-email-access-card"
            :class="{ 'is-selected': formState.access === 'public' }"
            @click="formState.access = 'public'"
          >
            <span class="settings-email-access-title">{{ t('settings.project.email.access.public.title', 'Public') }}</span>
            <span class="settings-email-access-text">
              {{ t('settings.project.email.access.public.description', 'Anyone who has the link can send email to this address') }}
            </span>
          </button>
        </div>
      </div>

      <div class="settings-email-grid mt-6 has-task">
        <div class="settings-email-field settings-email-board">
          <label class="settings-email-label">{{ t('settings.project.email.fields.board', 'Board within this project') }}</label>
          <FormInput
            id="settings-email-board"
            v-model="formState.boardId"
            as="select"
            :options="boardOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            filter
            :placeholder="t('settings.project.email.placeholders.searchBoard', 'Search for board')"
          />
        </div>

        <div class="settings-email-field settings-email-action">
          <label class="settings-email-label">{{ t('settings.project.email.fields.action', 'Action') }}</label>
          <FormInput
            id="settings-email-action"
            v-model="formState.actionId"
            as="select"
            :options="actionOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            filter
            :placeholder="t('settings.project.email.placeholders.searchAction', 'Search for action')"
          />
        </div>

        <div v-if="visibleTaskField" class="settings-email-field settings-email-task">
          <label class="settings-email-label">{{ t('settings.project.email.fields.task', 'Task') }}</label>
          <FormInput
            id="settings-email-task"
            v-model="formState.taskName"
            as="select"
            :options="taskOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            filter
            :placeholder="t('settings.project.email.placeholders.searchTask', 'Select task...')"
          />
        </div>

        <div v-else-if="visibleAgentField" class="settings-email-field settings-email-task">
          <label class="settings-email-label">{{ t('settings.project.email.fields.agent', 'Agent') }}</label>
          <FormInput
            id="settings-email-agent"
            v-model="formState.agentId"
            as="select"
            :options="agentOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            filter
            :placeholder="t('settings.project.email.placeholders.searchAgent', 'Select agent...')"
          />
        </div>

        <div v-else-if="visibleSkillField" class="settings-email-field settings-email-task">
          <label class="settings-email-label">{{ t('settings.project.email.fields.skill', 'Skill') }}</label>
          <FormInput
            id="settings-email-skill"
            v-model="formState.skillId"
            as="select"
            :options="skillOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            filter
            :placeholder="t('settings.project.email.placeholders.searchSkill', 'Select skill...')"
          />
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
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

.settings-email-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-project-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.settings-email-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-email-icon-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: transparent;
  border: 0;
  color: #6b7280;
  cursor: pointer;
}

.settings-email-icon-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.settings-email-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.settings-email-access-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-email-access-card {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.settings-email-access-card:hover {
  border-color: #93c5fd;
}

.settings-email-access-card.is-selected {
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 1px #3b82f6;
}

.settings-email-access-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.settings-email-access-text {
  font-size: 12px;
  line-height: 1.4;
  color: #9ca3af;
  max-width: 260px;
}

.settings-email-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.settings-email-grid.has-task {
  grid-template-areas:
    'board .'
    'action task';
}

.settings-email-field {
  width: 100%;
}

.settings-email-board {
  grid-area: board;
}

.settings-email-action {
  grid-area: action;
}

.settings-email-task {
  grid-area: task;
}

.settings-email-field :deep(.p-select),
.settings-email-field :deep(.p-multiselect) {
  width: 100%;
}

@media (max-width: 900px) {
  .settings-email-access-grid,
  .settings-email-grid {
    grid-template-columns: 1fr;
  }

  .settings-email-grid.has-task {
    grid-template-areas:
      'board'
      'action'
      'task';
  }
}
</style>
