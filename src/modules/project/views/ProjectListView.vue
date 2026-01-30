<script setup>
/**
 * ProjectListView - List view for project tasks
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, useProjectStore, useUIStore } from '@/stores'
import { TaskStatus, TaskPriority } from '@/models'

// PrimeVue
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Checkbox from 'primevue/checkbox'
import Skeleton from 'primevue/skeleton'
import { ChevronsLeft } from 'lucide-vue-next'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const { t, locale } = useI18n()

const tasks = computed(() => taskStore.tasks)
const isLoading = computed(() => taskStore.isLoading)

function getStatusSeverity(status) {
  const severities = {
    [TaskStatus.TODO]: 'secondary',
    [TaskStatus.IN_PROGRESS]: 'info',
    [TaskStatus.IN_REVIEW]: 'warn',
    [TaskStatus.DONE]: 'success',
    [TaskStatus.BLOCKED]: 'danger'
  }
  return severities[status] || 'secondary'
}

function getPriorityIcon(priority) {
  const icons = {
    [TaskPriority.URGENT]: 'pi pi-exclamation-circle text-red-600',
    [TaskPriority.HIGH]: 'pi pi-arrow-up text-orange-500',
    [TaskPriority.MEDIUM]: 'pi pi-minus text-yellow-500',
    [TaskPriority.LOW]: 'pi pi-arrow-down text-gray-400'
  }
  return icons[priority] || 'pi pi-minus text-gray-400'
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(locale.value || 'en', {
    month: 'short',
    day: 'numeric'
  })
}

function getStatusLabel(status) {
  switch (status) {
    case TaskStatus.TODO:
      return t('tasks.statusOptions.todo')
    case TaskStatus.IN_PROGRESS:
      return t('tasks.statusOptions.inProgress')
    case TaskStatus.IN_REVIEW:
      return t('tasks.statusOptions.inReview')
    case TaskStatus.DONE:
      return t('tasks.statusOptions.done')
    case TaskStatus.BLOCKED:
      return t('tasks.statusOptions.blocked')
    default:
      return status
  }
}

function openTaskPanel(task) {
  taskStore.fetchTask(task.id)
  uiStore.openTaskPanel()
}

async function toggleTaskStatus(task) {
  const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE
  await taskStore.changeTaskStatus(task.id, newStatus)
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark-edit:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-sm text-gray-500 dark-edit:text-gray-400">
          {{ t('projects.tasksCount', { count: taskStore.taskCount }) }}
        </p>
      </div>
      <Button 
        icon="pi pi-plus" 
        :label="t('projects.addTask')" 
        @click="uiStore.openModal('createTask')"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" height="50px" />
    </div>

    <!-- Data Table -->
    <DataTable 
      v-else
      :value="tasks"
      :paginator="tasks.length > 20"
      :rows="20"
      dataKey="id"
      class="p-datatable-sm"
      stripedRows
      @row-click="(e) => openTaskPanel(e.data)"
      :pt="{
        root: { class: 'border border-gray-200 dark-edit:border-gray-700 rounded-lg overflow-hidden' }
      }"
    >
      <Column style="width: 40px">
        <template #body="{ data }">
          <Checkbox 
            :modelValue="data.status === TaskStatus.DONE"
            @update:modelValue="toggleTaskStatus(data)"
            :binary="true"
            @click.stop
          />
        </template>
      </Column>

      <Column field="title" :header="t('tasks.columns.task')" style="min-width: 300px">
        <template #body="{ data }">
          <div class="group/row flex items-center gap-2">
            <i :class="getPriorityIcon(data.priority)"></i>
            <span 
              :class="[
                'font-medium flex-1',
                data.status === TaskStatus.DONE ? 'text-gray-400 line-through' : 'text-gray-900 dark-edit:text-white'
              ]"
            >
              {{ data.title }}
            </span>
            <button
              class="open-btn opacity-0 group-hover/row:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded text-xs transition-opacity"
              type="button"
              aria-label="Open details"
              @click.stop="openTaskPanel(data)"
            >
              <ChevronsLeft class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">Open</span>
            </button>
          </div>
        </template>
      </Column>

      <Column field="status" :header="t('tasks.columns.status')" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>

      <Column field="assignee" :header="t('tasks.columns.assignee')" style="width: 150px">
        <template #body="{ data }">
          <div v-if="data.assignee" class="flex items-center gap-2">
            <Avatar 
              :label="data.assignee.name?.charAt(0)"
              shape="circle"
              size="small"
              class="bg-primary-100 text-primary-700"
            />
            <span class="text-sm">{{ data.assignee.name }}</span>
          </div>
          <span v-else class="text-gray-400">{{ t('tasks.assignee.unassigned') }}</span>
        </template>
      </Column>

      <Column field="dueDate" :header="t('tasks.columns.dueDate')" style="width: 120px">
        <template #body="{ data }">
          <span 
            :class="[
              'text-sm',
              data.dueDate && new Date(data.dueDate) < new Date() && data.status !== TaskStatus.DONE
                ? 'text-red-600 font-medium'
                : 'text-gray-600 dark-edit:text-gray-400'
            ]"
          >
            {{ formatDate(data.dueDate) }}
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="py-8 text-center">
          <i class="pi pi-inbox text-4xl text-gray-300"></i>
          <p class="mt-2 text-gray-500">{{ t('projects.emptyTasks') }}</p>
          <Button 
            :label="t('tasks.newTask')" 
            text 
            class="mt-2"
            @click="uiStore.openModal('createTask')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>
