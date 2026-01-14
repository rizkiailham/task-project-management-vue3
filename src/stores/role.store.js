/**
 * Desidia v2 - Role Store
 * 
 * Manages role data via backend API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as roleApi from '@/api/role.api'

export const useRoleStore = defineStore('role', () => {
    // ================================
    // State
    // ================================
    const roles = ref([])
    const selectedRole = ref(null)
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
    const totalRoles = computed(() => pagination.value.total)

    const adminRoles = computed(() =>
        roles.value.filter(r => r.isAdmin).length
    )

    // ================================
    // Actions
    // ================================

    async function fetchRoles(params = {}) {
        isLoading.value = true
        try {
            const queryParams = {
                page: params.page || pagination.value.page,
                limit: params.limit || pagination.value.limit,
                ...params
            }

            const response = await roleApi.getRoles(queryParams)

            if (response.data) {
                roles.value = response.data
                pagination.value = {
                    page: response.meta?.currentPage || 1,
                    limit: response.meta?.itemsPerPage || 20,
                    total: response.meta?.totalItems || 0,
                    totalPages: response.meta?.totalPages || 1
                }
            } else {
                roles.value = Array.isArray(response) ? response : []
            }

            return roles.value
        } finally {
            isLoading.value = false
        }
    }

    async function fetchRole(id) {
        isLoading.value = true
        try {
            const role = await roleApi.getRole(id)
            return role
        } finally {
            isLoading.value = false
        }
    }

    async function createRole(roleData) {
        isLoading.value = true
        try {
            const response = await roleApi.createRole(roleData)
            const newRole = response.role || response.data || response
            roles.value.unshift(newRole)
            return response
        } finally {
            isLoading.value = false
        }
    }

    async function updateRole(roleId, roleData) {
        isLoading.value = true
        try {
            const response = await roleApi.updateRole(roleId, roleData)
            const updatedRole = response.role || response.data || response

            const index = roles.value.findIndex(r => r.id === roleId)
            if (index !== -1) {
                roles.value[index] = { ...roles.value[index], ...updatedRole }
            }
            return response
        } finally {
            isLoading.value = false
        }
    }

    async function deleteRole(roleId) {
        isLoading.value = true
        try {
            const response = await roleApi.deleteRole(roleId)
            const index = roles.value.findIndex(r => r.id === roleId)
            if (index !== -1) {
                roles.value.splice(index, 1)
            }
            return response
        } finally {
            isLoading.value = false
        }
    }

    function selectRole(role) {
        selectedRole.value = role ? { ...role } : null
    }

    function clearSelectedRole() {
        selectedRole.value = null
    }

    return {
        // State
        roles,
        selectedRole,
        isLoading,
        pagination,

        // Getters
        totalRoles,
        adminRoles,

        // Actions
        fetchRoles,
        fetchRole,
        createRole,
        updateRole,
        deleteRole,
        selectRole,
        clearSelectedRole
    }
})
