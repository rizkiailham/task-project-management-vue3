/**
 * Desidia v2 - Category Store
 *
 * Manages bulletin category data via backend API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as categoryApi from '@/api/category.api'

export const useCategoryStore = defineStore('category', () => {
  // ================================
  // State
  // ================================
  const categories = ref([])
  const selectedCategory = ref(null)
  const isLoading = ref(false)

  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // ================================
  // Getters
  // ================================
  const totalCategories = computed(() => pagination.value.total)

  // ================================
  // Actions
  // ================================
  async function fetchCategories(params = {}) {
    isLoading.value = true
    try {
      const queryParams = {
        page: params.page || pagination.value.page,
        limit: params.limit || pagination.value.limit,
        ...params
      }

      const response = await categoryApi.getCategories(queryParams)

      if (response.data) {
        categories.value = response.data
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || 20,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else {
        categories.value = Array.isArray(response) ? response : []
      }

      return categories.value
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCategory(id) {
    isLoading.value = true
    try {
      const category = await categoryApi.getCategory(id)
      return category
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(payload) {
    isLoading.value = true
    try {
      const response = await categoryApi.createCategory(payload)
      const newItem = response.category || response.data || response
      if (newItem) {
        categories.value.unshift(newItem)
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  async function updateCategory(id, payload) {
    isLoading.value = true
    try {
      const response = await categoryApi.updateCategory(id, payload)
      const updatedItem = response.category || response.data || response
      if (updatedItem) {
        const index = categories.value.findIndex((item) => item.id === id)
        if (index !== -1) {
          categories.value[index] = { ...categories.value[index], ...updatedItem }
        }
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  async function deleteCategory(id) {
    isLoading.value = true
    try {
      const response = await categoryApi.deleteCategory(id)
      const index = categories.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        categories.value.splice(index, 1)
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  function selectCategory(item) {
    selectedCategory.value = item ? { ...item } : null
  }

  function clearSelectedCategory() {
    selectedCategory.value = null
  }

  return {
    categories,
    selectedCategory,
    isLoading,
    pagination,
    totalCategories,
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    selectCategory,
    clearSelectedCategory
  }
})
