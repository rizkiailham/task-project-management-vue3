/**
 * Desidia v2 - User Store
 * 
 * Manages user data for the Users module
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Sample user data for demonstration
const sampleUsers = [
  {
    id: '1',
    firstName: 'Molly',
    lastName: 'Picklejar',
    email: 'molly.picklejar@example.com',
    phone: '+1 234 567 890',
    avatar: null,
    avatarColor: '#ec4899',
    status: 'Active',
    lastActivity: new Date().toISOString(),
    projects: ['Atlas'],
    groups: ['Administrators'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '2',
    firstName: 'Bobby',
    lastName: 'Pickles',
    email: 'bobby.pickles@example.com',
    phone: '+1 234 567 891',
    avatar: null,
    avatarColor: '#f97316',
    status: 'Active',
    lastActivity: new Date().toISOString(),
    projects: ['Nova', 'Horizon'],
    groups: ['Project Managers'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '3',
    firstName: 'Chuck',
    lastName: 'Pancake',
    email: 'chuck.pancake@example.com',
    phone: '+1 234 567 892',
    avatar: null,
    avatarColor: '#eab308',
    status: 'Active',
    lastActivity: '2026-01-20',
    projects: ['Orion', 'Keystone', 'Aurora'],
    groups: ['Operations Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '4',
    firstName: 'Patty',
    lastName: 'Cupcake',
    email: 'patty.cupcake@example.com',
    phone: '+1 234 567 893',
    avatar: null,
    avatarColor: '#a855f7',
    status: 'Active',
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    projects: ['Summit', 'Beacon'],
    groups: ['Finance Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '5',
    firstName: 'Betty',
    lastName: 'Marshmallow',
    email: 'betty.marshmallow@example.com',
    phone: '+1 234 567 894',
    avatar: null,
    avatarColor: '#3b82f6',
    status: 'Active',
    lastActivity: '2026-01-02',
    projects: ['Vertex', 'Lighthouse', 'Atlas'],
    groups: ['Maintenance'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '6',
    firstName: 'Ricky',
    lastName: 'Popcorn',
    email: 'ricky.popcorn@example.com',
    phone: '+1 234 567 895',
    avatar: null,
    avatarColor: '#22c55e',
    status: 'Active',
    lastActivity: new Date().toISOString(),
    projects: ['Nova', 'Orion', 'Summit'],
    groups: ['Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '7',
    firstName: 'Gerald',
    lastName: 'Tomato',
    email: 'tommy.banana@example.com',
    phone: '+1 234 567 896',
    avatar: null,
    avatarColor: '#06b6d4',
    status: 'Active',
    lastActivity: '2026-01-15',
    projects: ['Horizon'],
    groups: ['Administrators'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '8',
    firstName: 'Frank',
    lastName: 'Hotdog',
    email: 'frank.hotdog@example.com',
    phone: '+1 234 567 897',
    avatar: null,
    avatarColor: '#f43f5e',
    status: 'Invited',
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    projects: ['Keystone', 'Aurora'],
    groups: ['Project Managers'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '9',
    firstName: 'Wendy',
    lastName: 'Blueberry',
    email: 'wendy.blueberry@example.com',
    phone: '+1 234 567 898',
    avatar: null,
    avatarColor: '#8b5cf6',
    status: 'Active',
    lastActivity: new Date().toISOString(),
    projects: ['Lighthouse', 'Vertex', 'Nova'],
    groups: ['Operations Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '10',
    firstName: 'Tommy',
    lastName: 'Banana',
    email: 'tommy.banana@example.com',
    phone: '+1 234 567 899',
    avatar: null,
    avatarColor: '#14b8a6',
    status: 'Active',
    lastActivity: '2026-01-15',
    projects: ['Atlas', 'Horizon', 'Orion'],
    groups: ['Finance Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '11',
    firstName: 'Jimmy',
    lastName: 'Noodles',
    email: 'jimmy.noodles@example.com',
    phone: '+1 234 567 800',
    avatar: null,
    avatarColor: '#84cc16',
    status: 'Active',
    lastActivity: '2026-01-25',
    projects: ['Beacon'],
    groups: ['Maintenance'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '12',
    firstName: 'Sally',
    lastName: 'Muffins',
    email: 'sally.muffins@example.com',
    phone: '+1 234 567 801',
    avatar: null,
    avatarColor: '#14b8a6',
    status: 'Invited',
    lastActivity: '2026-01-25',
    projects: ['Summit', 'Keystone', 'Aurora'],
    groups: ['Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '13',
    firstName: 'Sammy',
    lastName: 'Milkshake',
    email: 'sammy.milkshake@example.com',
    phone: '+1 234 567 802',
    avatar: null,
    avatarColor: '#6366f1',
    status: 'Invited',
    lastActivity: '2026-01-07',
    projects: ['Lighthouse', 'Atlas'],
    groups: ['Administrators'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '14',
    firstName: 'Tina',
    lastName: 'Buttercup',
    email: 'tina.buttercup@example.com',
    phone: '+1 234 567 803',
    avatar: null,
    avatarColor: '#14b8a6',
    status: 'Invited',
    lastActivity: '2026-01-17',
    projects: ['Orion', 'Beacon', 'Summit'],
    groups: ['Project Managers'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: true
  },
  {
    id: '15',
    firstName: 'Gary',
    lastName: 'Cheeseburger',
    email: 'gary.cheeseburger@example.com',
    phone: '+1 234 567 804',
    avatar: null,
    avatarColor: '#22c55e',
    status: 'Inactive',
    lastActivity: new Date().toISOString(),
    projects: ['Horizon', 'Keystone', 'Aurora'],
    groups: ['Operations Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: false
  },
  {
    id: '16',
    firstName: 'Lucy',
    lastName: 'Jellybean',
    email: 'lucy.jellybean@example.com',
    phone: '+1 234 567 805',
    avatar: null,
    avatarColor: '#a855f7',
    status: 'Inactive',
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    projects: ['Nova', 'Horizon'],
    groups: ['Finance Team'],
    organization: 'Acme Corp',
    language: 'English',
    isActive: false
  }
]

// Available groups for selection
const availableGroups = [
  'Administrators',
  'Project Managers',
  'Operations Team',
  'Finance Team',
  'Maintenance',
  'Team'
]

// Available projects for selection
const availableProjects = [
  'Atlas',
  'Nova',
  'Horizon',
  'Orion',
  'Keystone',
  'Aurora',
  'Summit',
  'Beacon',
  'Vertex',
  'Lighthouse'
]

// Available languages
const availableLanguages = [
  'English',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Portuguese',
  'Russian'
]

export const useUserStore = defineStore('user', () => {
  // ================================
  // State
  // ================================
  const users = ref([...sampleUsers])
  const selectedUser = ref(null)
  const isLoading = ref(false)

  // ================================
  // Getters
  // ================================
  const totalUsers = computed(() => users.value.length)
  
  const activeUsers = computed(() => 
    users.value.filter(u => u.status === 'Active').length
  )
  
  const invitedUsers = computed(() => 
    users.value.filter(u => u.status === 'Invited').length
  )
  
  const inactiveUsers = computed(() => 
    users.value.filter(u => u.status === 'Inactive').length
  )

  // ================================
  // Actions
  // ================================
  
  async function fetchUsers() {
    isLoading.value = true
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      // In real app, this would fetch from API
      return users.value
    } finally {
      isLoading.value = false
    }
  }

  async function createUser(userData) {
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newUser = {
        id: crypto.randomUUID(),
        ...userData,
        avatarColor: getRandomColor(),
        status: 'Invited',
        lastActivity: new Date().toISOString(),
        isActive: userData.isActive ?? true
      }
      
      users.value.unshift(newUser)
      return newUser
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(userId, userData) {
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = {
          ...users.value[index],
          ...userData
        }
        return users.value[index]
      }
      throw new Error('User not found')
    } finally {
      isLoading.value = false
    }
  }

  async function deleteUser(userId) {
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value.splice(index, 1)
        return true
      }
      throw new Error('User not found')
    } finally {
      isLoading.value = false
    }
  }

  function selectUser(user) {
    selectedUser.value = user ? { ...user } : null
  }

  function clearSelectedUser() {
    selectedUser.value = null
  }

  function getRandomColor() {
    const colors = [
      '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6',
      '#3b82f6', '#8b5cf6', '#a855f7', '#6366f1', '#f43f5e'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  return {
    // State
    users,
    selectedUser,
    isLoading,
    availableGroups,
    availableProjects,
    availableLanguages,
    
    // Getters
    totalUsers,
    activeUsers,
    invitedUsers,
    inactiveUsers,
    
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    selectUser,
    clearSelectedUser
  }
})
