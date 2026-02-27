/**
 * Desidia v2 - Domain Models / Interfaces
 * 
 * These models define the core data structures for the task management SaaS.
 * While written in JavaScript, they are documented with JSDoc for TypeScript-like
 * type safety and IDE support.
 */

// ================================
// Enums / Constants
// ================================

/**
 * User roles within a workspace
 * @readonly
 * @enum {string}
 */
export const UserRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
}

/**
 * Task status options
 * @readonly
 * @enum {string}
 */
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled'
}

/**
 * Task priority levels
 * @readonly
 * @enum {string}
 */
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
}

// ================================
// Task Normalizers
// ================================

function normalizeTaskStatus(status) {
  if (!status) return TaskStatus.TODO
  const normalized = String(status).toLowerCase()
  if (Object.values(TaskStatus).includes(normalized)) {
    return normalized
  }
  if (['completed', 'complete', 'done'].includes(normalized)) {
    return TaskStatus.DONE
  }
  if (['incompleted', 'incomplete', 'open'].includes(normalized)) {
    return TaskStatus.TODO
  }
  return TaskStatus.TODO
}

function normalizeTaskPriority(priority) {
  if (!priority) return TaskPriority.MEDIUM
  const normalized = String(priority).toLowerCase()
  if (Object.values(TaskPriority).includes(normalized)) {
    return normalized
  }
  return TaskPriority.MEDIUM
}

function normalizeAssignee(data) {
  if (!data) return null
  if (typeof data === 'string') {
    return { name: data }
  }
  if (data.name) {
    return {
      id: data.id || null,
      name: data.name,
      email: data.email || '',
      avatar: data.avatar || null
    }
  }
  const firstName = data.firstName || ''
  const lastName = data.lastName || ''
  const name = `${firstName} ${lastName}`.trim() || data.email || ''
  return {
    id: data.id || null,
    name,
    email: data.email || '',
    avatar: data.avatar || null
  }
}

function normalizeDate(value) {
  if (!value) return null
  const raw = String(value)
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

function hasNonEmptyValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')
}

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function resolvePropertySourceValue(task, sourceField) {
  if (!sourceField) return null

  if (String(sourceField).endsWith('Id')) {
    const relationKey = String(sourceField).slice(0, -2)
    const relation = task?.[relationKey] || task?._raw?.[relationKey]
    if (hasNonEmptyValue(relation)) return relation
  }

  const fromTask = task?.[sourceField]
  if (hasNonEmptyValue(fromTask)) return fromTask

  const fromRaw = task?._raw?.[sourceField]
  if (hasNonEmptyValue(fromRaw)) return fromRaw

  return null
}

function normalizeTaskPropertyValues(task = {}) {
  const rawValues = Array.isArray(task.propertyValues)
    ? task.propertyValues
    : Array.isArray(task.customValues)
      ? task.customValues
      : []

  return rawValues
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const property = entry.property && typeof entry.property === 'object' ? entry.property : {}
      const propertyId = entry.propertyId || property.id || null
      const propertyKey = entry.propertyKey || entry.key || property.key || null
      const sourceField = property?.settings?.sourceField || null

      const normalizedValue = hasNonEmptyValue(entry.value)
        ? entry.value
        : resolvePropertySourceValue(task, sourceField)

      return {
        ...entry,
        property,
        propertyId,
        propertyKey,
        value: normalizedValue ?? entry.value ?? null
      }
    })
    .filter((entry) => entry && (entry.propertyId || entry.propertyKey))
}

function buildTaskPropertyValueMap(propertyValues = []) {
  const map = {}

  const write = (key, value) => {
    const rawKey = String(key || '').trim()
    if (!rawKey) return
    map[rawKey] = value
    const normalizedKey = normalizeLookupKey(rawKey)
    if (normalizedKey && normalizedKey !== rawKey) {
      map[normalizedKey] = value
    }
  }

  propertyValues.forEach((entry) => {
    const property = entry?.property || {}
    const value = entry?.value

    write(entry?.propertyId, value)
    write(property?.id, value)
    write(entry?.propertyKey, value)
    write(property?.key, value)
    write(property?.label, value)
    write(property?.settings?.sourceField, value)
  })

  return map
}

function normalizeTagsValue(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Project status options
 * @readonly
 * @enum {string}
 */
export const ProjectStatus = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
}

/**
 * View types for tasks
 * @readonly
 * @enum {string}
 */
export const ViewType = {
  LIST: 'list',
  KANBAN: 'kanban',
  CALENDAR: 'calendar',
  TIMELINE: 'timeline'
}

/**
 * Notification types
 * @readonly
 * @enum {string}
 */
export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  COMMENT_ADDED: 'comment_added',
  MENTION: 'mention',
  DUE_DATE_REMINDER: 'due_date_reminder',
  PROJECT_INVITE: 'project_invite'
}

// ================================
// Model Factories
// ================================

/**
 * Create a new User object
 * @param {Partial<User>} data
 * @returns {User}
 */
export function createUser(data = {}) {
  return {
    id: data.id || null,
    email: data.email || '',
    name: data.name || '',
    avatar: data.avatar || null,
    role: data.role || UserRole.MEMBER,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    lastActiveAt: data.lastActiveAt || null,
    settings: data.settings || {
      theme: 'light',
      notifications: true,
      language: 'en'
    }
  }
}

/**
 * Create a new Workspace object
 * @param {Partial<Workspace>} data
 * @returns {Workspace}
 */
export function createWorkspace(data = {}) {
  return {
    id: data.id || null,
    name: data.name || '',
    slug: data.slug || '',
    description: data.description || '',
    icon: data.icon || '🏢',
    color: data.color || '#f97316',
    ownerId: data.ownerId || null,
    members: data.members || [],
    settings: data.settings || {
      defaultView: ViewType.LIST,
      allowGuestAccess: false
    },
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * Create a new Project object
 * @param {Partial<Project>} data
 * @returns {Project}
 */
export function createProject(data = {}) {
  return {
    id: data.id || null,
    workspaceId: data.workspaceId || null,
    name: data.name || '',
    description: data.description || '',
    color: data.color || '#3b82f6',
    icon: data.icon || '📁',
    status: data.status || ProjectStatus.ACTIVE,
    startDate: data.startDate || null,
    dueDate: data.dueDate || null,
    createdBy: data.createdBy || null,
    members: data.members || [],
    settings: data.settings || {
      defaultView: ViewType.LIST,
      showCompletedTasks: true
    },
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * Create a new Task object
 * @param {Partial<Task>} data
 * @returns {Task}
 */
export function createTask(data = {}) {
  // Handle inconsistent API response naming (children vs subTasks)
  const rawChildren = Array.isArray(data.children) ? data.children : (Array.isArray(data.subTasks) ? data.subTasks : [])
  const propertyValues = normalizeTaskPropertyValues(data)
  const propertyValueMap = buildTaskPropertyValueMap(propertyValues)
  const rawPriority = hasNonEmptyValue(data.priority) ? data.priority : propertyValueMap.priority
  const normalizedPriority = hasNonEmptyValue(rawPriority) ? normalizeTaskPriority(rawPriority) : null

  // Recursively normalize children to ensure they are also valid Task objects
  // This avoids circular dependency issues if imported carefully, or just rely on function hoisting/reference
  // Since we are inside the function, recursive call works.
  const children = rawChildren.map(child => createTask(child))

  const completedChildren = children.filter((child) => {
    if (child?.isCompleted) return true
    return normalizeTaskStatus(child?.status) === TaskStatus.DONE
  })
  return {
    id: data.id || null,
    projectItem: data.projectItem || null,
    projectItemId:
      data.projectItemId ||
      data.projectItem?.id ||
      data.project?.projectItemId ||
      data.project?.itemId ||
      null,
    projectId: data.projectId || data.project?.id || null,
    parentTaskId: data.parentTaskId || data.parentId || null,
    title: data.title || '',
    description: data.description || '',
    status: normalizeTaskStatus(data.status || propertyValueMap.status),
    priority: normalizedPriority,
    assigneeId:
      data.assigneeId ||
      data.assignToId ||
      data.assignTo?.id ||
      (typeof propertyValueMap.assignee === 'string' ? propertyValueMap.assignee : propertyValueMap.assignee?.id) ||
      null,
    assignee: normalizeAssignee(
      data.assignee ||
      data.assignTo ||
      (typeof propertyValueMap.assignee === 'object' ? propertyValueMap.assignee : null)
    ),
    reporterId: data.reporterId || data.createdById || null,
    reporter: data.reporter || data.createdBy || null,
    dueDate: normalizeDate(data.dueDate || propertyValueMap.due_date || propertyValueMap.dueDate),
    startDate: data.startDate || null,
    estimatedHours: data.estimatedHours || null,
    actualHours: data.actualHours || null,
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : normalizeTagsValue(propertyValueMap.tags),
    attachments: data.attachments || [],
    watchers: data.watchers || [],
    subtaskCount: data.subtaskCount ?? children.length ?? 0,
    completedSubtaskCount: data.completedSubtaskCount ?? completedChildren.length ?? 0,
    commentCount: data.commentCount ?? data.comments?.length ?? 0,
    order: data.order ?? data.index ?? 0,
    kanbanColumnId: data.kanbanColumnId || data.kanbanColumn?.id || null,
    kanbanColumn: data.kanbanColumn || null,
    customValues: propertyValues,
    propertyValues,
    propertyValueMap,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
    children // Include normalized children in the model
  }
}

/**
 * Create a new Subtask object
 * @param {Partial<Subtask>} data
 * @returns {Subtask}
 */
export function createSubtask(data = {}) {
  return {
    id: data.id || null,
    taskId: data.taskId || null,
    title: data.title || '',
    isCompleted: data.isCompleted || false,
    assigneeId: data.assigneeId || null,
    order: data.order || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * Create a new Comment object
 * @param {Partial<Comment>} data
 * @returns {Comment}
 */
export function createComment(data = {}) {
  return {
    id: data.id || null,
    taskId: data.taskId || null,
    authorId: data.authorId || null,
    author: data.author || null,
    content: data.content || '',
    mentions: data.mentions || [],
    attachments: data.attachments || [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    isEdited: data.isEdited || false
  }
}

/**
 * Create a new Tag object
 * @param {Partial<Tag>} data
 * @returns {Tag}
 */
export function createTag(data = {}) {
  return {
    id: data.id || null,
    workspaceId: data.workspaceId || null,
    name: data.name || '',
    color: data.color || '#6b7280',
    createdAt: data.createdAt || new Date().toISOString()
  }
}

/**
 * Create a new Notification object
 * @param {Partial<Notification>} data
 * @returns {Notification}
 */
export function createNotification(data = {}) {
  return {
    id: data.id || null,
    userId: data.userId || null,
    type: data.type || NotificationType.TASK_UPDATED,
    title: data.title || '',
    message: data.message || '',
    link: data.link || null,
    isRead: data.isRead || false,
    metadata: data.metadata || {},
    createdAt: data.createdAt || new Date().toISOString()
  }
}

/**
 * Create a new ActivityLog object
 * @param {Partial<ActivityLog>} data
 * @returns {ActivityLog}
 */
export function createActivityLog(data = {}) {
  return {
    id: data.id || null,
    taskId: data.taskId || null,
    userId: data.userId || null,
    user: data.user || null,
    action: data.action || '',
    changes: data.changes || {},
    createdAt: data.createdAt || new Date().toISOString()
  }
}

/**
 * Create a new Kanban Column object
 * @param {Partial<KanbanColumn>} data
 * @returns {KanbanColumn}
 */
export function createKanbanColumn(data = {}) {
  return {
    id: data.id || null,
    projectId: data.projectId || null,
    name: data.name || '',
    description: data.description ?? null,
    index: Number.isFinite(data.index) ? data.index : Number(data.index) || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

// ================================
// Type Definitions (JSDoc for IDE support)
// ================================

/**
 * @typedef {Object} User
 * @property {string|null} id
 * @property {string} email
 * @property {string} name
 * @property {string|null} avatar
 * @property {string} role
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} lastActiveAt
 * @property {UserSettings} settings
 */

/**
 * @typedef {Object} UserSettings
 * @property {string} theme
 * @property {boolean} notifications
 * @property {string} language
 */

/**
 * @typedef {Object} Workspace
 * @property {string|null} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {string} icon
 * @property {string} color
 * @property {string|null} ownerId
 * @property {WorkspaceMember[]} members
 * @property {WorkspaceSettings} settings
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} WorkspaceMember
 * @property {string} userId
 * @property {string} role
 * @property {string} joinedAt
 */

/**
 * @typedef {Object} Project
 * @property {string|null} id
 * @property {string|null} workspaceId
 * @property {string} name
 * @property {string} description
 * @property {string} color
 * @property {string} icon
 * @property {string} status
 * @property {string|null} startDate
 * @property {string|null} dueDate
 * @property {string|null} createdBy
 * @property {string[]} members
 * @property {ProjectSettings} settings
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Task
 * @property {string|null} id
 * @property {string|null} projectItemId
 * @property {string|null} projectId
 * @property {string|null} parentTaskId
 * @property {string} title
 * @property {string} description
 * @property {string} status
 * @property {string} priority
 * @property {string|null} assigneeId
 * @property {User|null} assignee
 * @property {string|null} reporterId
 * @property {User|null} reporter
 * @property {string|null} dueDate
 * @property {string|null} startDate
 * @property {number|null} estimatedHours
 * @property {number|null} actualHours
 * @property {Tag[]} tags
 * @property {Attachment[]} attachments
 * @property {string[]} watchers
 * @property {number} subtaskCount
 * @property {number} completedSubtaskCount
 * @property {number} commentCount
 * @property {number} order
 * @property {string|null} kanbanColumnId
 * @property {Object|null} kanbanColumn
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} Subtask
 * @property {string|null} id
 * @property {string|null} taskId
 * @property {string} title
 * @property {boolean} isCompleted
 * @property {string|null} assigneeId
 * @property {number} order
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Comment
 * @property {string|null} id
 * @property {string|null} taskId
 * @property {string|null} authorId
 * @property {User|null} author
 * @property {string} content
 * @property {string[]} mentions
 * @property {Attachment[]} attachments
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} isEdited
 */

/**
 * @typedef {Object} Tag
 * @property {string|null} id
 * @property {string|null} workspaceId
 * @property {string} name
 * @property {string} color
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Notification
 * @property {string|null} id
 * @property {string|null} userId
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {string|null} link
 * @property {boolean} isRead
 * @property {Object} metadata
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {string} type
 * @property {number} size
 * @property {string} uploadedAt
 */

/**
 * @typedef {Object} ActivityLog
 * @property {string|null} id
 * @property {string|null} taskId
 * @property {string|null} userId
 * @property {User|null} user
 * @property {string} action
 * @property {Object} changes
 * @property {string} createdAt
 */

/**
 * @typedef {Object} KanbanColumn
 * @property {string|null} id
 * @property {string|null} projectId
 * @property {string} name
 * @property {string|null} description
 * @property {number} index
 * @property {string} createdAt
 * @property {string} updatedAt
 */
