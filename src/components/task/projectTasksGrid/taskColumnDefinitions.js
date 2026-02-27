/**
 * taskColumnDefinitions.js
 *
 * Single source of truth for task column metadata used across the grid,
 * filter bar, sort menus, and column options menus.
 *
 * Each definition includes:
 *  - id:             column identifier (matches AG Grid colId / field name)
 *  - labelKey:       i18n translation key
 *  - fallback:       fallback English label
 *  - icon:           Lucide Vue component (from lucide-vue-next)
 *  - type:           filter type ('text' | 'select' | 'multiselect' | 'date')
 *  - defaultVisible: whether column is shown by default
 *  - locked:         if true the column cannot be hidden (currently only 'title')
 */
import {
  Type,
  FolderKanban,
  CircleDot,
  Users,
  Calendar,
  Tag,
  Clock,
  Flag,
  Scaling,
  CalendarPlus,
  CalendarClock,
  UserPlus,
  UserCog,
  Globe
} from 'lucide-vue-next'

export const TASK_COLUMN_DEFINITIONS = [
  {
    id: 'title',
    labelKey: 'tasks.fields.title',
    fallback: 'Title',
    icon: Type,
    type: 'text',
    defaultVisible: true,
    locked: true
  },
  {
    id: 'projectName',
    labelKey: 'tasks.project',
    fallback: 'Project',
    icon: FolderKanban,
    type: 'text',
    defaultVisible: true,
    locked: false
  },
  {
    id: 'status',
    labelKey: 'taskDetail.status',
    fallback: 'Status',
    icon: CircleDot,
    type: 'select',
    defaultVisible: true,
    locked: false
  },
  {
    id: 'assignee',
    labelKey: 'taskDetail.assignee',
    fallback: 'Assignee',
    icon: Users,
    type: 'user',
    defaultVisible: true,
    locked: false
  },
  {
    id: 'dueDate',
    labelKey: 'taskDetail.dueDate',
    fallback: 'Due date',
    icon: Calendar,
    type: 'date',
    defaultVisible: true,
    locked: false
  },
  {
    id: 'tags',
    labelKey: 'taskDetail.tags',
    fallback: 'Tags',
    icon: Tag,
    type: 'multiselect',
    defaultVisible: true,
    locked: false
  },
  {
    id: 'priority',
    labelKey: 'tasks.priority',
    fallback: 'Priority',
    icon: Flag,
    type: 'select',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'size',
    labelKey: 'tasks.columnOptions.size',
    fallback: 'Size',
    icon: Scaling,
    type: 'number',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'trackingTime',
    labelKey: 'tasks.columnOptions.timeTracking',
    fallback: 'Time tracking',
    icon: Clock,
    type: 'number',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'createdAt',
    labelKey: 'taskDetail.createdAt',
    fallback: 'Created',
    icon: CalendarPlus,
    type: 'date',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'createdBy',
    labelKey: 'tasks.columnOptions.createdBy',
    fallback: 'Created by',
    icon: UserPlus,
    type: 'user',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'updatedAt',
    labelKey: 'taskDetail.lastUpdated',
    fallback: 'Last updated',
    icon: CalendarClock,
    type: 'date',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'updatedBy',
    labelKey: 'tasks.columnOptions.lastUpdatedBy',
    fallback: 'Last updated by',
    icon: UserCog,
    type: 'user',
    defaultVisible: false,
    locked: false
  },
  {
    id: 'timezone',
    labelKey: 'tasks.columnOptions.timezone',
    fallback: 'Timezone',
    icon: Globe,
    type: 'text',
    defaultVisible: false,
    locked: false
  }
]

/** Map for O(1) lookup by column id */
const _definitionMap = new Map(
  TASK_COLUMN_DEFINITIONS.map((def) => [def.id, def])
)

/**
 * Get the full definition for a column by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getColumnDefinition(id) {
  return _definitionMap.get(id) || null
}

/**
 * Get the Lucide icon component for a column.
 * @param {string} id
 * @returns {import('vue').Component|null}
 */
export function getColumnIcon(id) {
  return _definitionMap.get(id)?.icon || null
}

/**
 * Get the filter type for a column.
 * @param {string} id
 * @returns {string}
 */
export function getColumnFilterType(id) {
  return _definitionMap.get(id)?.type || 'text'
}

/**
 * Derive the default column visibility map from definitions.
 * @returns {Record<string, boolean>}
 */
export function getDefaultColumnVisibility() {
  const map = {}
  TASK_COLUMN_DEFINITIONS.forEach((def) => {
    map[def.id] = def.defaultVisible
  })
  return map
}

/**
 * All column ids in definition order.
 * @returns {string[]}
 */
export function getAllColumnIds() {
  return TASK_COLUMN_DEFINITIONS.map((def) => def.id)
}
