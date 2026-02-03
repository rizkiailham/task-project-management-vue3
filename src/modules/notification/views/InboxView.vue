<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore, useUIStore, useProjectStore, useTaskStore } from '@/stores'
import { 
  Check, 
  ChevronDown, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  LayoutGrid
} from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import Button from 'primevue/button'
import { createTask } from '@/models'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'

const notificationStore = useNotificationStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const { t } = useI18n()

// Local state for filters (server-side via query params)
const selectedProjectId = ref(null)
const entityTypeFilter = ref(null)
const searchKeywords = ref('')
const selectedNotificationId = ref(null)

const paginatedNotifications = computed(() => notificationStore.notifications)

function resolveInitial(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

// Pagination
const pageSize = ref(notificationStore.pagination.limit || 10)
const currentPage = ref(notificationStore.pagination.page || 1)
const totalPages = computed(() => notificationStore.pagination.totalPages || 1)

const visiblePages = computed(() => {
  const maxVisible = 5
  const total = totalPages.value
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  if (end > total) {
    end = total
    start = end - maxVisible + 1
  }
  return Array.from({ length: maxVisible }, (_, i) => start + i)
})

const isFirstPage = computed(() => currentPage.value <= 1)
const isLastPage = computed(() => currentPage.value >= totalPages.value)
const showPagination = computed(() => totalPages.value > 1)

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchInbox()
}

// Project Menu Items
const projectMenuItems = computed(() => {
  // Using projects from store
  if (!projectStore.projects) return []
  return projectStore.projects.map(p => ({
    id: p.id,
    label: p.name,
    action: () => {
      selectedProjectId.value = p.id
    }
  }))
})

// Add 'All Projects' option
const projectFilterItems = computed(() => [
    { id: 'all', label: t('common.all'), action: () => selectedProjectId.value = null },
    ...projectMenuItems.value
])

const selectedProjectLabel = computed(() => {
  if (!selectedProjectId.value) return ''
  const project = projectStore.projects?.find(p => String(p.id) === String(selectedProjectId.value))
  return project?.name || ''
})

const pageSizeItems = computed(() => [10, 20, 50].map((limit) => ({
  id: `limit-${limit}`,
  label: String(limit),
  action: () => {
    pageSize.value = limit
  }
})))

function buildInboxQueryParams() {
  const params = {
    page: currentPage.value,
    limit: pageSize.value
  }

  if (notificationStore.filterMode === 'unread') {
    params.isRead = 0
  }
  if (selectedProjectId.value) {
    params.projectId = selectedProjectId.value
  }
  if (entityTypeFilter.value) {
    params.entityType = entityTypeFilter.value
  }
  if (searchKeywords.value) {
    params.keywords = searchKeywords.value
  }

  return params
}

async function fetchInbox() {
  try {
    await notificationStore.fetchNotifications(buildInboxQueryParams())
    currentPage.value = notificationStore.pagination.page || currentPage.value
    pageSize.value = notificationStore.pagination.limit || pageSize.value
  } catch (error) {
    console.error('Error fetching inbox:', error)
    uiStore.showApiError(error, t('notifications.title'))
  }
}

onMounted(async () => {
  await fetchInbox()
})

async function handleMarkAsRead(id) {
  try {
    const response = await notificationStore.markAsRead(id)
    uiStore.showApiSuccess(response, t('notifications.markAsRead'))
  } catch (error) {
    console.error('Error marking as read:', error)
    uiStore.showApiError(error, t('notifications.markAsRead'))
  }
}

async function handleOpenTask(item) {
  selectedNotificationId.value = item.id

  if (item.entityType === 'task' && item.payload) {
    taskStore.setCurrentTask(createTask(item.payload))
    uiStore.openTaskPanel()
  } else if (item.entityType === 'task' && item.entityId) {
    try {
      await taskStore.fetchTask(item.entityId)
      uiStore.openTaskPanel()
    } catch (error) {
      console.error('Error opening task from inbox:', error)
      uiStore.showApiError(error, t('taskDetail.title'))
    }
  }

  if (!item.isRead) {
    await handleMarkAsRead(item.id)
  }
}

watch(
  () => notificationStore.filterMode,
  async () => {
    currentPage.value = 1
    await fetchInbox()
  }
)

watch(selectedProjectId, async () => {
  currentPage.value = 1
  await fetchInbox()
})

watch(entityTypeFilter, async () => {
  currentPage.value = 1
  await fetchInbox()
})

watch(pageSize, async () => {
  currentPage.value = 1
  await fetchInbox()
})

const debouncedSearch = debounce(async (query) => {
  const keywords = resolveSearchKeywords(query)
  if (keywords === null) return
  searchKeywords.value = keywords
  currentPage.value = 1
  await fetchInbox()
}, 300)

watch(
  () => uiStore.searchQuery,
  (query) => {
    debouncedSearch(query)
  }
)
</script>

<template>
  <div class="h-full flex flex-col relative pb-[52px]">
    <!-- Content -->
    <div class="flex-1 overflow-hidden relative">
      <div class="h-full flex flex-col bg-white">
        <!-- No Header -->

        <!-- List -->
        <div class="flex-1 overflow-y-auto">
          <div class="divide-y divide-gray-100">
            <div 
              v-for="item in paginatedNotifications" 
              :key="item.id"
              class="group relative flex items-start gap-4 p-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
              :class="{ 'bg-blue-50/30': selectedNotificationId === item.id }"
              @click="handleOpenTask(item)"
            >
              <div class="shrink-0 pt-1">
                <template v-if="item.user && item.user.avatar">
                  <img :src="item.user.avatar" class="w-8 h-8 rounded-full" alt="User" />
                </template>
                <template v-else-if="item.system">
                   <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <LayoutGrid class="w-4 h-4" />
                   </div>
                </template>
                <template v-else>
                  <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-bold">
                    {{ resolveInitial(item.user?.name) }}
                  </div>
                </template>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5 flex-wrap">
                  <span v-if="item.user && item.user.name" class="font-semibold text-sm text-gray-900">
                    {{ item.user.name }}
                  </span>
                  <span v-if="item.action" class="text-sm text-gray-600">
                    {{ item.action }}
                  </span>
                  <span v-if="item.title" class="font-semibold text-sm text-gray-900">
                    {{ item.title }}
                  </span>
                  <span v-if="item.target" class="font-medium text-sm text-gray-900">
                    {{ item.target }}
                  </span>
                  <span v-if="item.context" class="ml-1 text-sm text-gray-500 border-l border-gray-300 pl-2">
                    {{ item.context }}
                  </span>
                </div>

                <div v-if="item.actionDetails" class="mt-0.5 text-sm text-gray-600">
                  {{ item.actionDetails }}
                </div>
                <div v-if="item.subtitle" class="mt-0.5 text-sm text-gray-500">
                  {{ item.subtitle }}
                </div>

                <div v-if="item.isComment" class="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                  {{ item.preview }}
                </div>
              </div>

              <div class="shrink-0 flex flex-col items-end gap-2 pl-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 font-medium group-hover:hidden">{{ item.time }}</span>
                  <div v-if="!item.isRead" class="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </div>

                <div class="hidden group-hover:flex items-center gap-2">
                  <Button
                    @click.stop="handleOpenTask(item)"
                    size="small"
                    variant="outlined"
                    class="!px-3 !py-1 !text-xs !h-7 bg-white border-gray-200 text-gray-600 hover:text-gray-900"
                  >
                    {{ t('common.open') }}
                  </Button>
                  <Button
                    v-if="!item.isRead"
                    @click.stop="handleMarkAsRead(item.id)"
                    size="small"
                    class="!px-3 !py-1 !text-xs !h-7 bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                  >
                    <Check class="w-3 h-3 mr-1" />
                    {{ t('notifications.markAsRead') }}
                  </Button>
                </div>
              </div>
            </div>
            
            <!-- Empty State -->
            <div v-if="paginatedNotifications.length === 0" class="flex flex-col items-center justify-center p-12 text-center text-gray-500">
               <p>{{ t('notifications.noNotifications') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Footer -->
    <div 
      class="fixed bottom-0 right-0 h-[52px] bg-white border-t border-gray-200 px-4 flex items-center justify-between z-[101] transition-[left] duration-300"
      :style="{ left: uiStore.sidebarWidth }"
    >
      <!-- Left: Filters -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <span class="text-[13px] text-gray-500">{{ t('notifications.filters.filterBy') }}</span>
          
           <!-- Project Filter using DropdownMenu -->
           <DropdownMenu :items="projectFilterItems" position="left" width="12rem" :openUp="true">
              <template #trigger>
                 <button 
                   class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                   :class="{ 'border-blue-300 bg-blue-50 text-blue-700': selectedProjectId }"
                 >
                   <LayoutGrid class="w-4 h-4" :class="selectedProjectId ? 'text-blue-600' : 'text-gray-500'" />
                   <span>{{ selectedProjectLabel || t('notifications.filters.project') }}</span>
                 </button>
              </template>
           </DropdownMenu>

           <!-- Placeholder for Status Filter -->
           <button class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
             <Check class="w-3 h-3 text-gray-500" />
             {{ t('notifications.filters.status') }}
           </button>

           <button class="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
             <Filter class="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <!-- Right: Pagination -->
      <div v-if="showPagination" class="footer-pagination">
         <div class="flex items-center gap-1">
            <button 
                @click="goToPage(1)" 
                :disabled="isFirstPage"
                class="pagination-btn"
                :class="{ 'pagination-btn-disabled': isFirstPage }"
            >
               <ChevronsLeft class="w-4 h-4" />
            </button>
            <button 
                @click="goToPage(currentPage - 1)" 
                :disabled="isFirstPage"
                class="pagination-btn"
                :class="{ 'pagination-btn-disabled': isFirstPage }"
            >
               <ChevronLeft class="w-4 h-4" />
            </button>
            
            <button 
                v-for="page in visiblePages" 
                :key="page"
                @click="goToPage(page)"
                class="pagination-btn pagination-page"
                :class="{ 'pagination-page-active': page === currentPage }"
            >
                {{ page }}
            </button>

             <button 
                @click="goToPage(currentPage + 1)" 
                :disabled="isLastPage"
                class="pagination-btn"
                :class="{ 'pagination-btn-disabled': isLastPage }"
             >
               <ChevronRight class="w-4 h-4" />
            </button>
            <button 
                @click="goToPage(totalPages)" 
                :disabled="isLastPage"
                class="pagination-btn"
                :class="{ 'pagination-btn-disabled': isLastPage }"
            >
               <ChevronsRight class="w-4 h-4" />
            </button>

             <div class="page-size-selector ml-2">
                <DropdownMenu :items="pageSizeItems" position="right" width="6rem" :openUp="true">
                  <template #trigger>
                    <button class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                      {{ pageSize }}
                      <ChevronDown class="w-3 h-3 text-gray-400" />
                    </button>
                  </template>
                </DropdownMenu>
             </div>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagination-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f9fafb;
}

.pagination-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #ffffff;
}

.pagination-page {
  background-color: #ffffff;
  font-size: 0.75rem; /* text-xs */
  font-weight: 500;
  color: #4b5563; /* text-gray-600 */
}

.pagination-page-active {
  background-color: #f3f4f6; /* bg-gray-100 */
  color: #111827; /* text-gray-900 */
  border-color: #e5e7eb; /* border-gray-200 */
}
</style>
