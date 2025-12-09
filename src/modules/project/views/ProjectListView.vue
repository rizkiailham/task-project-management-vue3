<script setup>
/**
 * ProjectListView - List view for project tasks
 */
import { computed } from 'vue'
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

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

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
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
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
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ projectStore.currentProjectName }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ taskStore.taskCount }} tasks
        </p>
      </div>
      <Button 
        icon="pi pi-plus" 
        label="Add Task" 
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
        root: { class: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden' }
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

      <Column field="title" header="Task" style="min-width: 300px">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <i :class="getPriorityIcon(data.priority)"></i>
            <span 
              :class="[
                'font-medium',
                data.status === TaskStatus.DONE ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
              ]"
            >
              {{ data.title }}
            </span>
          </div>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.status.replace('_', ' ')" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>

      <Column field="assignee" header="Assignee" style="width: 150px">
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
          <span v-else class="text-gray-400">Unassigned</span>
        </template>
      </Column>

      <Column field="dueDate" header="Due Date" style="width: 120px">
        <template #body="{ data }">
          <span 
            :class="[
              'text-sm',
              data.dueDate && new Date(data.dueDate) < new Date() && data.status !== TaskStatus.DONE
                ? 'text-red-600 font-medium'
                : 'text-gray-600 dark:text-gray-400'
            ]"
          >
            {{ formatDate(data.dueDate) }}
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="py-8 text-center">
          <i class="pi pi-inbox text-4xl text-gray-300"></i>
          <p class="mt-2 text-gray-500">No tasks in this project</p>
          <Button 
            label="Create Task" 
            text 
            class="mt-2"
            @click="uiStore.openModal('createTask')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

