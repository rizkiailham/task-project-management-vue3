<script setup>
/**
 * WorkspaceOverviewView - Workspace overview page
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWorkspaceStore, useProjectStore, useUIStore } from '@/stores'

// PrimeVue
import Card from 'primevue/card'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import AvatarGroup from 'primevue/avatargroup'

const router = useRouter()
const { t } = useI18n()
const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const workspace = computed(() => workspaceStore.currentWorkspace)
const projects = computed(() => projectStore.projects)
const members = computed(() => workspaceStore.members)

function navigateToProject(project) {
  router.push({
    name: 'ProjectList',
    params: {
      projectId: project.id
    }
  })
}

function openCreateProjectModal() {
  uiStore.openModal('createProject')
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark-edit:text-white">
        {{ workspace?.name || t('workspace.title') }}
      </h1>
      <p class="mt-1 text-gray-600 dark-edit:text-gray-400">
        {{ t('workspace.overview.summary', { projects: projects.length, members: members.length }) }}
      </p>
    </div>

    <!-- Stats -->
    <div class="mb-8 grid gap-4 sm:grid-cols-3">
      <Card class="shadow-sm">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary-600">{{ projects.length }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('workspace.overview.stats.projects') }}</p>
          </div>
        </template>
      </Card>
      <Card class="shadow-sm">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary-600">{{ members.length }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('workspace.overview.stats.members') }}</p>
          </div>
        </template>
      </Card>
      <Card class="shadow-sm">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary-600">{{ projectStore.activeProjects.length }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ t('workspace.overview.stats.activeProjects') }}</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Projects Section -->
    <div class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('projects.title') }}</h2>
        <Button 
          icon="pi pi-plus" 
          :label="t('projects.newProject')" 
          size="small"
          @click="openCreateProjectModal"
        />
      </div>

      <div v-if="projects.length === 0" class="rounded-lg border border-dashed border-gray-300 p-8 text-center dark-edit:border-gray-600">
        <i class="pi pi-folder-open text-4xl text-gray-300 dark-edit:text-gray-600"></i>
        <p class="mt-2 text-gray-500 dark-edit:text-gray-400">{{ t('projects.emptyState.title') }}</p>
        <Button 
          :label="t('workspace.overview.actions.createFirstProject')"
          text 
          class="mt-2"
          @click="openCreateProjectModal"
        />
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card 
          v-for="project in projects"
          :key="project.id"
          class="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
          @click="navigateToProject(project)"
        >
          <template #content>
            <div class="flex items-start gap-3">
              <span 
                class="flex h-10 w-10 items-center justify-center rounded-lg text-white font-medium"
                :style="{ backgroundColor: project.color || '#6366f1' }"
              >
                {{ project.name.charAt(0).toUpperCase() }}
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900 dark-edit:text-white truncate">
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-500 dark-edit:text-gray-400">
                  {{ t('workspace.overview.tasksCount', { count: project.taskCount || 0 }) }}
                </p>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Members Section -->
    <div>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark-edit:text-white">{{ t('workspace.members') }}</h2>
        <Button 
          icon="pi pi-user-plus" 
          :label="t('workspace.inviteMember')" 
          size="small"
          outlined
          @click="uiStore.openModal('inviteMember')"
        />
      </div>

      <div class="rounded-lg border border-gray-200 bg-white dark-edit:border-gray-700 dark-edit:bg-gray-800">
        <div 
          v-for="member in members"
          :key="member.id"
          class="flex items-center gap-3 border-b border-gray-100 p-4 last:border-b-0 dark-edit:border-gray-700"
        >
          <Avatar 
            :label="member.name?.charAt(0) || '?'"
            shape="circle"
            class="bg-primary-100 text-primary-700"
          />
          <div class="flex-1">
            <p class="font-medium text-gray-900 dark-edit:text-white">{{ member.name }}</p>
            <p class="text-sm text-gray-500 dark-edit:text-gray-400">{{ member.email }}</p>
          </div>
          <span 
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="{
              'bg-purple-100 text-purple-700 dark-edit:bg-purple-900/20 dark-edit:text-purple-400': member.role === 'owner',
              'bg-blue-100 text-blue-700 dark-edit:bg-blue-900/20 dark-edit:text-blue-400': member.role === 'admin',
              'bg-gray-100 text-gray-700 dark-edit:bg-gray-700 dark-edit:text-gray-300': member.role === 'member'
            }"
          >
            {{ t(`workspace.roles.${member.role}`) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
