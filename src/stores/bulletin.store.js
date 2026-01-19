/**
 * Desidia v2 - Bulletin Store
 *
 * Manages bulletin data via backend API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as bulletinApi from '@/api/bulletin.api'

export const useBulletinStore = defineStore('bulletin', () => {
  // ================================
  // State
  // ================================
  const bulletins = ref([])
  const selectedBulletin = ref(null)
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
  const totalBulletins = computed(() => pagination.value.total)

  // ================================
  // Actions
  // ================================
  async function fetchBulletins(params = {}) {
    isLoading.value = true
    try {
      const queryParams = {
        page: params.page || pagination.value.page,
        limit: params.limit || pagination.value.limit,
        ...params
      }

      const response = await bulletinApi.getBulletins(queryParams)

      if (response.data) {
        bulletins.value = response.data
        pagination.value = {
          page: response.meta?.currentPage || 1,
          limit: response.meta?.itemsPerPage || 20,
          total: response.meta?.totalItems || 0,
          totalPages: response.meta?.totalPages || 1
        }
      } else {
        bulletins.value = Array.isArray(response) ? response : []
      }

      return bulletins.value
    } finally {
      isLoading.value = false
    }
  }

  async function fetchBulletin(id) {
    isLoading.value = true
    try {
      const bulletin = await bulletinApi.getBulletin(id)
      return bulletin
    } finally {
      isLoading.value = false
    }
  }

  async function createBulletin(payload) {
    isLoading.value = true
    try {
      const response = await bulletinApi.createBulletin(payload)
      const newItem = response.bulletin || response.data || response
      if (newItem) {
        bulletins.value.unshift(newItem)
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  async function updateBulletin(id, payload) {
    isLoading.value = true
    try {
      const response = await bulletinApi.updateBulletin(id, payload)
      const updatedItem = response.bulletin || response.data || response
      if (updatedItem) {
        const index = bulletins.value.findIndex((item) => item.id === id)
        if (index !== -1) {
          bulletins.value[index] = { ...bulletins.value[index], ...updatedItem }
        }
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBulletin(id) {
    isLoading.value = true
    try {
      const response = await bulletinApi.deleteBulletin(id)
      const index = bulletins.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        bulletins.value.splice(index, 1)
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  function selectBulletin(item) {
    selectedBulletin.value = item ? { ...item } : null
  }

  function clearSelectedBulletin() {
    selectedBulletin.value = null
  }

  return {
    bulletins,
    selectedBulletin,
    isLoading,
    pagination,
    totalBulletins,
    fetchBulletins,
    fetchBulletin,
    createBulletin,
    updateBulletin,
    deleteBulletin,
    selectBulletin,
    clearSelectedBulletin
  }
})
