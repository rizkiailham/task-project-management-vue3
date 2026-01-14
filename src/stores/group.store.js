/**
 * Desidia v2 - Group Store
 * 
 * Manages group data via backend API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as groupApi from '@/api/group.api'

export const useGroupStore = defineStore('group', () => {
    // ================================
    // State
    // ================================
    const groups = ref([])
    const selectedGroup = ref(null)
    const isLoading = ref(false)

    // Pagination state
    const pagination = ref({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })

    // ================================
    // Getters
    // ================================
    const totalGroups = computed(() => pagination.value.total)

    // ================================
    // Actions
    // ================================

    async function fetchGroups(params = {}) {
        isLoading.value = true
        try {
            const queryParams = {
                page: params.page || pagination.value.page,
                limit: params.limit || pagination.value.limit,
                ...params
            }

            const response = await groupApi.getGroups(queryParams)

            if (response.data) {
                groups.value = response.data
                pagination.value = {
                    page: response.meta?.currentPage || 1,
                    limit: response.meta?.itemsPerPage || 20,
                    total: response.meta?.totalItems || 0,
                    totalPages: response.meta?.totalPages || 1
                }
            } else {
                groups.value = Array.isArray(response) ? response : []
            }

            return groups.value
        } finally {
            isLoading.value = false
        }
    }

    async function fetchGroup(id) {
        isLoading.value = true
        try {
            const group = await groupApi.getGroup(id)
            return group
        } finally {
            isLoading.value = false
        }
    }

    async function createGroup(groupData) {
        isLoading.value = true
        try {
            const response = await groupApi.createGroup(groupData)
            const newGroup = response.group || response.data || response
            groups.value.unshift(newGroup)
            return response
        } finally {
            isLoading.value = false
        }
    }

    async function updateGroup(groupId, groupData) {
        isLoading.value = true
        try {
            const response = await groupApi.updateGroup(groupId, groupData)
            const updatedGroup = response.group || response.data || response

            const index = groups.value.findIndex(g => g.id === groupId)
            if (index !== -1) {
                groups.value[index] = { ...groups.value[index], ...updatedGroup }
            }
            return response
        } finally {
            isLoading.value = false
        }
    }

    async function deleteGroup(groupId) {
        isLoading.value = true
        try {
            const response = await groupApi.deleteGroup(groupId)
            const index = groups.value.findIndex(g => g.id === groupId)
            if (index !== -1) {
                groups.value.splice(index, 1)
            }
            return response
        } finally {
            isLoading.value = false
        }
    }

    async function addUsers(groupId, userIds) {
        isLoading.value = true
        try {
            const response = await groupApi.addUsersToGroup(groupId, userIds)
            const updatedGroup = response.group || response

            const index = groups.value.findIndex(g => g.id === groupId)
            if (index !== -1) {
                groups.value[index] = updatedGroup
            }
            return updatedGroup
        } finally {
            isLoading.value = false
        }
    }

    async function removeUsers(groupId, userIds) {
        isLoading.value = true
        try {
            const response = await groupApi.removeUsersFromGroup(groupId, userIds)
            const updatedGroup = response.group || response

            const index = groups.value.findIndex(g => g.id === groupId)
            if (index !== -1) {
                groups.value[index] = updatedGroup
            }
            return updatedGroup
        } finally {
            isLoading.value = false
        }
    }

    async function searchUsers(groupId, keywords = '') {
        try {
            const response = await groupApi.searchGroupUsers(groupId, keywords)
            return response.users || response
        } catch (error) {
            console.error('Failed to search group users:', error)
            return []
        }
    }

    function selectGroup(group) {
        selectedGroup.value = group ? { ...group } : null
    }

    function clearSelectedGroup() {
        selectedGroup.value = null
    }

    return {
        // State
        groups,
        selectedGroup,
        isLoading,
        pagination,

        // Getters
        totalGroups,

        // Actions
        fetchGroups,
        fetchGroup,
        createGroup,
        updateGroup,
        deleteGroup,
        addUsers,
        removeUsers,
        searchUsers,
        selectGroup,
        clearSelectedGroup
    }
})
