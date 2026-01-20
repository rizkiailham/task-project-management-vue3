<script setup>
/**
 * BulletinView - Bulletin and Category management page.
 *
 * Mirrors UsersView layout with tabs, search, and action buttons.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useBulletinStore, useCategoryStore, useGroupStore, useUIStore } from '@/stores'
import BulletinGrid from '@/modules/bulletin/components/BulletinGrid.vue'
import CategoryGrid from '@/modules/bulletin/components/CategoryGrid.vue'
import BulletinFormModal from '@/components/modals/bulletin/BulletinFormModal.vue'
import CategoryFormModal from '@/components/modals/bulletin/CategoryFormModal.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import AIChatButton from '@/components/ai/AIChatButton.vue'
import { Menu, Search, Plus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { debounce } from '@/utils/debounce'
import { resolveSearchKeywords } from '@/utils/search'

const bulletinStore = useBulletinStore()
const categoryStore = useCategoryStore()
const groupStore = useGroupStore()
const uiStore = useUIStore()
const { t } = useI18n()

const activeTab = ref('bulletin')
const searchQuery = ref('')
const searchKeywords = ref('')
const isLoading = ref(false)

const showBulletinModal = ref(false)
const showCategoryModal = ref(false)
const showBulletinDeleteModal = ref(false)
const showCategoryDeleteModal = ref(false)
const selectedBulletin = ref(null)
const selectedCategory = ref(null)
const isDeletingBulletin = ref(false)
const isDeletingCategory = ref(false)

function toggleSidebar() {
  if (uiStore.isMobile) {
    uiStore.openMobileSidebar()
  } else {
    uiStore.toggleSidebar()
  }
}

const tabs = computed(() => [
  { id: 'bulletin', label: t('bulletin.tabs.bulletin') },
  { id: 'category', label: t('bulletin.tabs.category') }
])

const searchPlaceholder = computed(() => (
  activeTab.value === 'category'
    ? t('bulletin.search.category')
    : t('bulletin.search.bulletin')
))

const filteredBulletins = computed(() => bulletinStore.bulletins || [])

const filteredCategories = computed(() => categoryStore.categories || [])

const bulletinMeta = computed(() => ({
  currentPage: bulletinStore.pagination.page,
  totalPages: bulletinStore.pagination.totalPages,
  itemsPerPage: bulletinStore.pagination.limit,
  totalItems: bulletinStore.pagination.total
}))

const categoryMeta = computed(() => ({
  currentPage: categoryStore.pagination.page,
  totalPages: categoryStore.pagination.totalPages,
  itemsPerPage: categoryStore.pagination.limit,
  totalItems: categoryStore.pagination.total
}))

const BULLETIN_ACTIVE_TAB_KEY = 'bulletin.activeTab'

function resolveInitialTab() {
  const storedTab = localStorage.getItem(BULLETIN_ACTIVE_TAB_KEY)
  const validTabs = tabs.value.map(tab => tab.id)
  return validTabs.includes(storedTab) ? storedTab : 'bulletin'
}

function persistActiveTab(tabId) {
  localStorage.setItem(BULLETIN_ACTIVE_TAB_KEY, tabId)
}

async function fetchAll() {
  isLoading.value = true
  try {
    await Promise.all([
      fetchBulletinsWithSearch({ page: 1, limit: bulletinMeta.value.itemsPerPage || 10 }),
      fetchCategoriesWithSearch({ page: 1, limit: categoryMeta.value.itemsPerPage || 20 }),
      groupStore.fetchGroups({ limit: 100 })
    ])
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  activeTab.value = resolveInitialTab()
  await fetchAll()
})

watch(activeTab, async (tab) => {
  persistActiveTab(tab)
  if (searchQuery.value || searchKeywords.value) {
    searchQuery.value = ''
    searchKeywords.value = ''
    if (tab === 'bulletin') {
      await handleBulletinSearch()
    } else {
      await handleCategorySearch()
    }
  }
  if (tab === 'category' && (categoryStore.categories.length === 0 || searchKeywords.value)) {
    await fetchCategoriesWithSearch({ page: 1, limit: categoryMeta.value.itemsPerPage || 20 })
  }
  if (tab === 'bulletin' && (bulletinStore.bulletins.length === 0 || searchKeywords.value)) {
    await fetchBulletinsWithSearch({ page: 1, limit: bulletinMeta.value.itemsPerPage || 10 })
  }
})

function openAddBulletinModal() {
  selectedBulletin.value = null
  showBulletinModal.value = true
}

function openEditBulletinModal(bulletin) {
  selectedBulletin.value = bulletin
  showBulletinModal.value = true
}

function openContentEditor(bulletin) {
  selectedBulletin.value = bulletin
  showBulletinModal.value = true
}

function openDeleteBulletinModal(bulletin) {
  selectedBulletin.value = bulletin
  showBulletinDeleteModal.value = true
}

async function handleDeleteBulletin() {
  if (!selectedBulletin.value?.id) return
  isDeletingBulletin.value = true
  try {
    const response = await bulletinStore.deleteBulletin(selectedBulletin.value.id)
    uiStore.showApiSuccess(response)
    showBulletinDeleteModal.value = false
    selectedBulletin.value = null
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isDeletingBulletin.value = false
  }
}

function openAddCategoryModal() {
  selectedCategory.value = null
  showCategoryModal.value = true
}

function openEditCategoryModal(category) {
  selectedCategory.value = category
  showCategoryModal.value = true
}

function openDeleteCategoryModal(category) {
  selectedCategory.value = category
  showCategoryDeleteModal.value = true
}

async function handleDeleteCategory() {
  if (!selectedCategory.value?.id) return
  isDeletingCategory.value = true
  try {
    const response = await categoryStore.deleteCategory(selectedCategory.value.id)
    uiStore.showApiSuccess(response)
    showCategoryDeleteModal.value = false
    selectedCategory.value = null
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isDeletingCategory.value = false
  }
}

async function handlePaginationChange({ page, limit, sortBy, orderBy }) {
  isLoading.value = true
  try {
    const sortParam = sortBy && orderBy ? `${sortBy}:${orderBy}` : undefined
    await fetchBulletinsWithSearch({
      page,
      limit,
      sortBy: sortParam
    })
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

async function handleCategoryPaginationChange({ page, limit }) {
  try {
    await fetchCategoriesWithSearch({ page, limit })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

function buildSearchParams(params = {}) {
  return searchKeywords.value ? { ...params, keywords: searchKeywords.value } : params
}

async function fetchBulletinsWithSearch(params) {
  return bulletinStore.fetchBulletins(buildSearchParams(params))
}

async function fetchCategoriesWithSearch(params) {
  return categoryStore.fetchCategories(buildSearchParams(params))
}

async function handleBulletinSearch() {
  isLoading.value = true
  try {
    await fetchBulletinsWithSearch({ page: 1, limit: bulletinMeta.value.itemsPerPage || 10 })
  } catch (error) {
    uiStore.showApiError(error)
  } finally {
    isLoading.value = false
  }
}

async function handleCategorySearch() {
  try {
    await fetchCategoriesWithSearch({ page: 1, limit: categoryMeta.value.itemsPerPage || 20 })
  } catch (error) {
    uiStore.showApiError(error)
  }
}

const debouncedSearch = debounce(async (query) => {
  const keywords = resolveSearchKeywords(query)
  if (keywords === null) return
  searchKeywords.value = keywords
  if (activeTab.value === 'bulletin') {
    await handleBulletinSearch()
  } else {
    await handleCategorySearch()
  }
}, 300)

watch(searchQuery, (query) => {
  debouncedSearch(query)
})
</script>

<template>
  <div class="bulletin-view h-full flex flex-col">
    <div class="bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center h-12 pl-1 pr-4">
        <div class="flex items-center gap-4 h-full">
          <button
            @click="toggleSidebar"
            class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            title="Toggle sidebar"
          >
            <Menu class="w-5 h-5" />
          </button>

          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'relative h-full px-1 text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            ]"
          >
            {{ tab.label }}
            <span
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            ></span>
          </button>
        </div>

        <div class="flex items-center gap-3 ml-auto">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="h-8 pl-9 pr-4 w-44 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <template v-if="activeTab === 'bulletin'">
            <button
              @click="openAddBulletinModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('bulletin.actions.newBulletin') }}
            </button>
          </template>
          <template v-else>
            <button
              @click="openAddCategoryModal"
              class="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus class="w-4 h-4" />
              {{ t('bulletin.actions.newCategory') }}
            </button>
          </template>

          <AIChatButton />
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto bg-white">
      <div v-if="activeTab === 'bulletin'" class="h-full">
        <BulletinGrid
          :bulletins="filteredBulletins"
          :meta="bulletinMeta"
          :isLoading="isLoading"
          @edit="openEditBulletinModal"
          @content="openContentEditor"
          @delete="openDeleteBulletinModal"
          @paginationChange="handlePaginationChange"
        />
      </div>

      <div v-else class="h-full">
        <CategoryGrid
          :categories="filteredCategories"
          :meta="categoryMeta"
          @edit="openEditCategoryModal"
          @delete="openDeleteCategoryModal"
          @paginationChange="handleCategoryPaginationChange"
        />
      </div>
    </div>

    <BulletinFormModal
      v-model:visible="showBulletinModal"
      :bulletin="selectedBulletin"
      :categories="categoryStore.categories"
      :groups="groupStore.groups"
      @saved="bulletinStore.fetchBulletins({ page: bulletinMeta.currentPage, limit: bulletinMeta.itemsPerPage })"
    />

    <CategoryFormModal
      v-model:visible="showCategoryModal"
      :category="selectedCategory"
      @saved="categoryStore.fetchCategories({ page: categoryMeta.currentPage, limit: categoryMeta.itemsPerPage })"
    />

    <DeleteConfirmModal
      v-model:visible="showBulletinDeleteModal"
      :title="selectedBulletin?.title ? `Delete ${selectedBulletin.title}` : 'Delete Bulletin'"
      :loading="isDeletingBulletin"
      @confirm="handleDeleteBulletin"
      @cancel="showBulletinDeleteModal = false"
    />

    <DeleteConfirmModal
      v-model:visible="showCategoryDeleteModal"
      :title="selectedCategory?.name ? `Delete ${selectedCategory.name}` : 'Delete Category'"
      :loading="isDeletingCategory"
      @confirm="handleDeleteCategory"
      @cancel="showCategoryDeleteModal = false"
    />
  </div>
</template>

<style scoped>
.bulletin-view {
  background-color: #ffffff;
}
</style>
