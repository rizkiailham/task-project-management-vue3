/**
 * Desidia v2 - Vue Router Configuration
 * 
 * Implements lazy-loaded routes and navigation guards for authentication
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

// ================================
// Route Definitions
// ================================

const routes = [
  // ================================
  // Public Routes
  // ================================
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: {
      requiresAuth: false,
      layout: 'auth',
      title: 'Sign In'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/modules/auth/views/RegisterView.vue'),
    meta: {
      requiresAuth: false,
      layout: 'auth',
      title: 'Create Account'
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
    meta: {
      requiresAuth: false,
      layout: 'auth',
      title: 'Reset Password'
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
    meta: {
      requiresAuth: false,
      layout: 'auth',
      title: 'Set New Password'
    }
  },

  // ================================
  // Protected App Routes
  // ================================
  {
    path: '/app',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/modules/dashboard/views/HomeView.vue'),
        meta: {
          title: 'Home'
        }
      },
      {
        path: 'my-tasks',
        name: 'MyTasks',
        component: () => import('@/modules/task/views/MyTasksView.vue'),
        meta: {
          title: 'My Tasks'
        }
      },
      {
        path: 'inbox',
        name: 'Inbox',
        component: () => import('@/modules/notification/views/InboxView.vue'),
        meta: {
          title: 'Inbox'
        }
      },
      // Workspace routes
      {
        path: 'workspaces/:workspaceId',
        name: 'Workspace',
        component: () => import('@/modules/workspace/views/WorkspaceView.vue'),
        meta: {
          title: 'Workspace'
        },
        children: [
          {
            path: '',
            name: 'WorkspaceOverview',
            component: () => import('@/modules/workspace/views/WorkspaceOverviewView.vue')
          },
          {
            path: 'settings',
            name: 'WorkspaceSettings',
            component: () => import('@/modules/workspace/views/WorkspaceSettingsView.vue'),
            meta: {
              title: 'Workspace Settings',
              permission: 'workspace.manage'
            }
          }
        ]
      },
      // Project routes
      {
        path: 'workspaces/:workspaceId/projects/:projectId',
        name: 'Project',
        component: () => import('@/modules/project/views/ProjectView.vue'),
        meta: {
          title: 'Project'
        },
        children: [
          {
            path: '',
            name: 'ProjectBoard',
            component: () => import('@/modules/project/views/ProjectBoardView.vue')
          },
          {
            path: 'list',
            name: 'ProjectList',
            component: () => import('@/modules/project/views/ProjectListView.vue')
          },
          {
            path: 'calendar',
            name: 'ProjectCalendar',
            component: () => import('@/modules/project/views/ProjectCalendarView.vue')
          },
          {
            path: 'settings',
            name: 'ProjectSettings',
            component: () => import('@/modules/project/views/ProjectSettingsView.vue'),
            meta: {
              title: 'Project Settings',
              permission: 'project.edit'
            }
          }
        ]
      },
      // Task detail (as modal overlay or full page)
      {
        path: 'tasks/:taskId',
        name: 'TaskDetail',
        component: () => import('@/modules/task/views/TaskDetailView.vue'),
        meta: {
          title: 'Task'
        }
      },
      // Settings routes
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/modules/settings/views/SettingsView.vue'),
        meta: {
          title: 'Settings'
        },
        children: [
          {
            path: '',
            name: 'SettingsProfile',
            component: () => import('@/modules/settings/views/ProfileSettingsView.vue')
          },
          {
            path: 'account',
            name: 'SettingsAccount',
            component: () => import('@/modules/settings/views/AccountSettingsView.vue')
          },
          {
            path: 'notifications',
            name: 'SettingsNotifications',
            component: () => import('@/modules/settings/views/NotificationSettingsView.vue')
          }
        ]
      }
    ]
  },

  // ================================
  // Redirects & Catch-all
  // ================================
  {
    path: '/',
    redirect: '/app'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/modules/common/views/NotFoundView.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

// ================================
// Router Instance
// ================================

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0, behavior: 'smooth' }
  }
})

// ================================
// Navigation Guards
// ================================

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // Update document title
  const title = to.meta.title
  document.title = title ? `${title} | Desidia` : 'Desidia'

  // Check if route requires authentication
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login with return URL
    return next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  }

  // If authenticated and trying to access auth pages, redirect to app
  if (authStore.isAuthenticated && to.meta.layout === 'auth') {
    return next({ name: 'Home' })
  }

  // Check permissions if specified
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    return next({ name: 'Home' })
  }

  next()
})

// After navigation hook for analytics/tracking
router.afterEach((to) => {
  // Track page view (integrate with analytics service)
  if (import.meta.env.PROD) {
    // Example: analytics.track('page_view', { path: to.fullPath })
  }
})

export default router

