import { computed, ref } from 'vue'

/**
 * Column type definitions for filter logic
 */
const COLUMN_TYPES = {
  title: 'text',
  projectName: 'text',
  status: 'select',
  assignee: 'select',
  dueDate: 'date',
  tags: 'multiselect',
  trackingTime: 'text',
  priority: 'text',
  size: 'text',
  createdAt: 'date',
  updatedAt: 'date',
  createdBy: 'text',
  updatedBy: 'text',
  timezone: 'text'
}

const OPERATORS_BY_TYPE = {
  text: [
    { id: 'contains', label: 'contains' },
    { id: 'not_contains', label: 'does not contain' },
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' }
  ],
  select: [
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' }
  ],
  multiselect: [
    { id: 'include', label: 'include' },
    { id: 'not_include', label: 'do not include' }
  ],
  date: [
    { id: 'is', label: 'is' },
    { id: 'before', label: 'before' },
    { id: 'after', label: 'after' }
  ]
}

const COLUMN_ICONS = {
  title: 'Type',
  projectName: 'FolderKanban',
  status: 'CircleDot',
  assignee: 'Users',
  dueDate: 'Calendar',
  tags: 'Tag',
  trackingTime: 'Clock',
  priority: 'Flag',
  createdAt: 'CalendarPlus',
  updatedAt: 'CalendarClock',
  createdBy: 'UserPlus',
  updatedBy: 'UserCog',
  timezone: 'Clock'
}

const DEFAULT_FILTER_COLUMN_IDS = [
  'title',
  'projectName',
  'status',
  'assignee',
  'dueDate',
  'tags',
  'priority',
  'size',
  'trackingTime',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'timezone'
]

let filterId = 0

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function getByPath(source, path) {
  if (!source || !path) return undefined
  const segments = String(path)
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!segments.length) return undefined

  let current = source
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return undefined
    current = current[segment]
  }
  return current
}

/**
 * Composable for managing task grid filters
 * @param {Function} t - i18n translation function
 */
export function useProjectTaskFilters(t, options = {}) {
  const activeFilters = ref([])

  const externalColumnDefinitions = computed(() => {
    const source = options?.columnDefinitions
    if (Array.isArray(source)) return source
    if (Array.isArray(source?.value)) return source.value
    return []
  })

  const externalColumnMap = computed(() => {
    const map = new Map()
    externalColumnDefinitions.value.forEach((definition) => {
      if (!definition?.id) return
      map.set(definition.id, definition)
    })
    return map
  })

  const filterableColumns = computed(() => {
    if (externalColumnDefinitions.value.length) {
      return externalColumnDefinitions.value.map((column) => ({
        id: column.id,
        label: column.label || getColumnLabel(column.id),
        icon: COLUMN_ICONS[column.id] || null,
        type: getColumnType(column.id)
      }))
    }

    return DEFAULT_FILTER_COLUMN_IDS.map((colId) => ({
      id: colId,
      label: getColumnLabel(colId),
      icon: COLUMN_ICONS[colId] || null,
      type: getColumnType(colId)
    }))
  })

  function getColumnLabel(colId) {
    const externalDefinition = externalColumnMap.value.get(colId)
    if (externalDefinition?.label) return externalDefinition.label

    const labelMap = {
      title: t('tasks.fields.title', 'Title'),
      projectName: t('tasks.project', 'Project'),
      status: t('taskDetail.status', 'Status'),
      assignee: t('taskDetail.assignee', 'Assignee'),
      dueDate: t('taskDetail.dueDate', 'Due date'),
      tags: t('taskDetail.tags', 'Tags'),
      trackingTime: t('tasks.trackingTime', 'Time tracking'),
      priority: t('tasks.priority', 'Priority'),
      createdAt: t('tasks.columnOptions.createdAt', 'Created at'),
      updatedAt: t('tasks.columnOptions.updatedAt', 'Updated at'),
      createdBy: t('tasks.columnOptions.createdBy', 'Created by'),
      updatedBy: t('tasks.columnOptions.lastUpdatedBy', 'Last updated by'),
      timezone: t('tasks.columnOptions.timezone', 'Timezone')
    }
    return labelMap[colId] || colId
  }

  function getColumnType(colId) {
    return COLUMN_TYPES[colId] || 'text'
  }

  function getOperatorsForColumn(colId) {
    const type = getColumnType(colId)
    return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text
  }

  function addFilter(columnId) {
    const existing = activeFilters.value.find((filter) => filter.column === columnId)
    if (existing) {
      return existing.id
    }

    const type = getColumnType(columnId)
    const operators = getOperatorsForColumn(columnId)
    const defaultOperator = operators[0]?.id || 'is'

    const filter = {
      id: `filter-${++filterId}`,
      column: columnId,
      type,
      operator: defaultOperator,
      value: type === 'multiselect' ? [] : '',
      label: getColumnLabel(columnId)
    }

    activeFilters.value = [...activeFilters.value, filter]
    return filter.id
  }

  function removeFilter(filterId) {
    activeFilters.value = activeFilters.value.filter((f) => f.id !== filterId)
  }

  function updateFilter(filterId, updates) {
    activeFilters.value = activeFilters.value.map((f) => {
      if (f.id !== filterId) return f
      return { ...f, ...updates }
    })
  }

  function resetFilters() {
    activeFilters.value = []
  }

  function hasActiveFilters() {
    return activeFilters.value.length > 0
  }

  /**
   * Apply all active filters to a list of row data
   * @param {Array} rows - flat row data array
   * @returns {Array} filtered rows
   */
  function applyFilters(rows) {
    if (!activeFilters.value.length) return rows

    const matchedRows = rows.filter((row) => {
      return activeFilters.value.every((filter) => {
        return matchesFilter(row, filter)
      })
    })

    // Keep ancestors of matched tree rows so hierarchy remains stable in AG Grid tree mode.
    const includeIds = new Set()
    matchedRows.forEach((row) => {
      const path = Array.isArray(row?.path) ? row.path : []
      path.forEach((segment) => includeIds.add(String(segment)))
      if (row?.id) includeIds.add(String(row.id))
      if (row?.pathKey) includeIds.add(String(row.pathKey))
    })

    // Fallback for non-tree rows that don't carry path/id metadata.
    if (!includeIds.size) return matchedRows

    return rows.filter((row) => {
      const rowId = row?.id ? String(row.id) : ''
      const rowPathKey = row?.pathKey ? String(row.pathKey) : ''
      return includeIds.has(rowId) || includeIds.has(rowPathKey)
    })
  }

  function matchesFilter(row, filter) {
    const { column, operator, value, type } = filter

    // Skip filters with no value set
    if (value === '' || value === null || value === undefined) return true
    if (Array.isArray(value) && value.length === 0) return true

    const cellValue = getCellValue(row, column)

    switch (type) {
      case 'text':
        return matchTextFilter(cellValue, operator, value)
      case 'select':
        return matchSelectFilter(cellValue, operator, value, column, row)
      case 'multiselect':
        return matchMultiselectFilter(cellValue, operator, value)
      case 'date':
        return matchDateFilter(cellValue, operator, value)
      default:
        return true
    }
  }

  function getCellValue(row, column) {
    switch (column) {
      case 'title':
        return row.title || ''
      case 'projectName':
        return row.dartboard || row.projectName || ''
      case 'status':
        return row.kanbanColumnId || row.status || ''
      case 'assignee':
        return row.assignee || ''
      case 'dueDate':
        return row.dueDate || ''
      case 'tags': {
        const tags = row.tags
        if (!Array.isArray(tags)) return []
        return tags.map((tag) =>
          typeof tag === 'string' ? tag : tag?.name || tag?.label || tag?.value || ''
        ).filter(Boolean)
      }
      default:
        return getCustomColumnValue(row, column)
    }
  }

  function getCustomColumnValue(row, column) {
    const definition = externalColumnMap.value.get(column)
    const sourceKey = String(definition?.sourceKey || '')
    const customFieldMap = row?.customFieldMap && typeof row.customFieldMap === 'object'
      ? row.customFieldMap
      : {}

    const lookupCandidates = [sourceKey, definition?.label, column]
      .map((candidate) => normalizeLookupKey(candidate))
      .filter(Boolean)

    for (const candidate of lookupCandidates) {
      const value = customFieldMap[candidate]
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }

    const directCandidates = [column, sourceKey].filter(Boolean)
    for (const path of directCandidates) {
      const value = getByPath(row, path) ?? getByPath(row?._raw, path)
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }

    return row?.[column] || ''
  }

  function matchTextFilter(cellValue, operator, value) {
    const cell = String(cellValue || '').toLowerCase()
    const search = String(value || '').toLowerCase()

    switch (operator) {
      case 'contains':
        return cell.includes(search)
      case 'not_contains':
        return !cell.includes(search)
      case 'is':
        return cell === search
      case 'is_not':
        return cell !== search
      default:
        return true
    }
  }

  function matchSelectFilter(cellValue, operator, value, column, row) {
    // For select filters, value can be a single string or an array
    const filterValues = (Array.isArray(value) ? value : [value])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    if (!filterValues.length) return true

    const cellStr = String(cellValue || '').trim().toLowerCase()

    // For status, also check the kanban column name for user-friendly matching
    if (column === 'status') {
      const columnName = (row.kanbanColumnName || '').toLowerCase()
      const matches = filterValues.some((v) => {
        const vLower = String(v).toLowerCase()
        const rowStatusLabel = String(row.status || '').toLowerCase()
        return cellStr === vLower ||
          columnName === vLower ||
          rowStatusLabel === vLower ||
          String(row.kanbanColumnId) === String(v)
      })
      return operator === 'is' ? matches : !matches
    }

    const matches = filterValues.some((v) => {
      return cellStr === String(v).trim().toLowerCase()
    })

    return operator === 'is' ? matches : !matches
  }

  function matchMultiselectFilter(cellValue, operator, filterValues) {
    if (!Array.isArray(filterValues) || !filterValues.length) return true

    const cellArr = Array.isArray(cellValue) ? cellValue.map((v) => String(v).toLowerCase()) : []
    const filterLower = filterValues.map((v) => String(v).toLowerCase())

    const hasMatch = filterLower.some((fv) => cellArr.includes(fv))

    return operator === 'include' ? hasMatch : !hasMatch
  }

  function matchDateFilter(cellValue, operator, value) {
    if (!cellValue || !value) return true

    const cellDate = new Date(cellValue)
    const filterDate = new Date(value)

    if (isNaN(cellDate.getTime()) || isNaN(filterDate.getTime())) return true

    // Normalize to date-only comparison
    const cellDay = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate())
    const filterDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())

    switch (operator) {
      case 'is':
        return cellDay.getTime() === filterDay.getTime()
      case 'before':
        return cellDay.getTime() < filterDay.getTime()
      case 'after':
        return cellDay.getTime() > filterDay.getTime()
      default:
        return true
    }
  }

  return {
    activeFilters,
    filterableColumns,
    addFilter,
    removeFilter,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    applyFilters,
    getOperatorsForColumn,
    getColumnLabel,
    getColumnType
  }
}
