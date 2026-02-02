<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
import { TaskStatus, TaskPriority } from '@/models'

const router = useRouter()
const notificationStore = useNotificationStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

// Local state for filters if needed, but main filter (unread/all) is in store
const projectFilter = ref(null)

// Computed
const filteredNotifications = computed(() => {
  let items = notificationStore.notifications

  // Filter by Unread/All
  if (notificationStore.filterMode === 'unread') {
    items = items.filter(n => !n.isRead)
  }

  // Filter by Search
  if (uiStore.searchQuery) {
    const query = uiStore.searchQuery.toLowerCase()
    items = items.filter(n => 
      (n.title && n.title.toLowerCase().includes(query)) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(query)) ||
      (n.user?.name && n.user.name.toLowerCase().includes(query)) ||
      (n.target && n.target.toLowerCase().includes(query))
    )
  }

  // Filter by Project
  if (projectFilter.value) {
    // Assuming notifications have a project context or ID. 
    // The dummy data uses 'context' string.
    items = items.filter(n => n.context === projectFilter.value)
  }

  return items
})

const paginatedNotifications = computed(() => {
    // Client-side pagination for now as dummy data is used. 
    // If real API, would use notificationStore.loadMore/fetch
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredNotifications.value.slice(start, end)
})

// Pagination
const pageSize = ref(20)
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(filteredNotifications.value.length / pageSize.value))

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
}

// Project Menu Items
const projectMenuItems = computed(() => {
  // Using projects from store
  if (!projectStore.projects) return []
  return projectStore.projects.map(p => ({
    id: p.id,
    label: p.name,
    action: () => {
      projectFilter.value = p.name // Using name as context match for now
    }
  }))
})

// Add 'All Projects' option
const projectFilterItems = computed(() => [
    { id: 'all', label: 'All Projects', action: () => projectFilter.value = null },
    ...projectMenuItems.value
])

onMounted(async () => {
  // Ideally fetch notifications here
  // await notificationStore.fetchNotifications()
  // Using dummy data from original file but moving to store logic would be better if real. 
  // For now, I'll use the dummy data initialized in the store or just use the local dummy data if store is empty?
  // The store currently initializes empty. 
  // To preserve the User's view of "dummyNotifications", I should populate the store with them or keep them local if the store doesn't support dummy injection easily.
  // But standard is to use store. 
  // I will inject dummy data into store for this refactor to work with store logic.
  
  if (notificationStore.notifications.length === 0) {
     notificationStore.notifications = [
        {
            id: 1,
            user: { name: 'Zee avi', avatar: 'https://i.pravatar.cc/150?u=1' },
            action: 'reassigned',
            target: 'Audit task references to ensure correct linkage between related dependencies',
            context: 'Ad Astra',
            time: '10:15',
            isRead: false,
            isComment: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            user: { name: 'Zee avi', avatar: 'https://i.pravatar.cc/150?u=1' },
            action: 'commented',
            target: 'Analyze recurring maintenance complaints to identify root causes and long term solutions',
            context: 'Ad Astra',
            preview: 'Aliquam enim tortor, tincidunt ac dignissim volutpat, malesuada eget tellus. In ut nisl massa. Pellentesque auctor lacus in dolor gravida, nec tincidunt leo lobortis. Proin in odio nulla. Etiam euismod dolor sit amet pharetra auctor.',
            time: '09:15',
            isRead: false,
            isComment: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            system: true,
            title: '[Projectname] / New form data - Formname',
            subtitle: 'Draft reply ready for review',
            context: 'Projectname',
            time: '07:30',
            isRead: false,
            isComment: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 4,
            user: { name: 'Lee an Rimes', avatar: 'https://i.pravatar.cc/150?u=2' },
            action: 'added an attachment',
            target: 'Conduct internal review meeting to prioritize unresolved safety and compliance issues',
            context: 'Skylar',
            time: '07:00',
            isRead: false,
            isComment: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 5,
            user: { name: 'Zee avi', avatar: 'https://i.pravatar.cc/150?u=1' },
            action: 'renamed',
            target: 'Cross check task references to ensure correct linkage between related dependencies',
            actionDetails: "'Cross check task references' to 'Cross check task references to ensu...'",
            context: '',
            time: 'Yesterday',
            isRead: false,
            isComment: false,
            isSelected: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 6,
            user: { name: '', avatar: '' }, 
            title: 'Conduct internal review meeting to prioritize unresolved safety and compliance issues',
            subtitle: 'is due tomorrow',
            context: 'Skylar',
            time: 'Yesterday',
            isRead: false,
            isComment: false,
            createdAt: new Date(Date.now() - 86400000).toISOString()
        }
    ]
    notificationStore.unreadCount = 6
  }
})

function handleMarkAsRead(id) {
    notificationStore.markAsRead(id)
}

function handleOpenTask(item) {
    // Create dummy task
    const dummyTask = {
        id: item.id || `dummy-${Date.now()}`,
        title: item.target || item.title || 'Untitled Task',
        description: item.preview ? `<p>${item.preview}</p>` : '<p>No description</p>',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignee: item.user ? { id: 'dummy-user', name: item.user.name, avatar: item.user.avatar } : null,
        projectId: 'dummy-project', 
        projectName: item.context || 'Project',
        dueDate: new Date(),
        tags: [],
        createdAt: item.createdAt,
        updatedAt: item.createdAt
    }
    
    // Set current task in store
    taskStore.currentTask = dummyTask
    
    // Open sidebar
    uiStore.openTaskPanel()
    
    // Mark notification as read
    if (!item.isRead) {
        handleMarkAsRead(item.id)
    }
}
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
              :class="{ 'bg-blue-50/30': item.isSelected }"
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
                  <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-bold">L</div>
                </template>
              </div>

              <div class="flex-1 min-w-0 pr-12">
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

              <div class="absolute right-4 top-4 flex flex-col items-end gap-1">
                <div class="flex items-center gap-2 group-hover:hidden">
                  <span class="text-xs text-gray-500 font-medium">{{ item.time }}</span>
                  <div v-if="!item.isRead" class="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                </div>

                <div class="hidden group-hover:flex items-center gap-2">
                  <Button 
                    @click.stop="handleOpenTask(item)"
                    size="small" 
                    variant="outlined" 
                    class="!px-3 !py-1 !text-xs !h-7 bg-white border-gray-200 text-gray-600 hover:text-gray-900"
                  >
                    <span class="mr-1">«</span> Open
                  </Button>
                  <Button 
                    @click.stop="handleMarkAsRead(item.id)"
                    size="small" 
                    class="!px-3 !py-1 !text-xs !h-7 bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                  >
                    <Check class="w-3 h-3 mr-1" />
                    Mark as read
                  </Button>
                </div>
              </div>
            </div>
            
            <!-- Empty State -->
            <div v-if="paginatedNotifications.length === 0" class="flex flex-col items-center justify-center p-12 text-center text-gray-500">
               <p>No notifications found.</p>
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
          <span class="text-[13px] text-gray-500">Filter by</span>
          
           <!-- Project Filter using DropdownMenu -->
           <DropdownMenu :items="projectFilterItems" position="left" width="12rem" :openUp="true">
              <template #trigger>
                 <button 
                   class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                   :class="{ 'border-blue-300 bg-blue-50 text-blue-700': projectFilter }"
                 >
                   <LayoutGrid class="w-4 h-4" :class="projectFilter ? 'text-blue-600' : 'text-gray-500'" />
                   <span>{{ projectFilter || 'Project' }}</span>
                 </button>
              </template>
           </DropdownMenu>

           <!-- Placeholder for Status Filter -->
           <button class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
             <Check class="w-3 h-3 text-gray-500" />
             Status
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
                <button class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                   {{ pageSize }}
                   <ChevronDown class="w-3 h-3 text-gray-400" />
                </button>
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
