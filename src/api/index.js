/**
 * Desidia v2 - API Module Index
 * 
 * Central export point for all API modules
 */

export * as authApi from './auth.api'
export * as workspaceApi from './workspace.api'
export * as projectApi from './project.api'
export * as taskApi from './task.api'
export * as aiApi from './ai.api'
export * as aiChatApi from './aiChat.api'
export * as notificationApi from './notification.api'
export * as bulletinApi from './bulletin.api'
export * as categoryApi from './category.api'

export {
  default as httpClient,
  setAuthToken,
  setWorkspaceId,
  clearAuth,
  get,
  post,
  put,
  patch,
  del,
  upload
} from './httpClient'

