import { computed, ref } from 'vue'

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
  user: [
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' }
  ],
  date: [
    { id: 'is', label: 'is' },
    { id: 'before', label: 'before' },
    { id: 'after', label: 'after' },
    { id: 'between', label: 'between' }
  ],
  number: [
    { id: 'equals', label: 'equals' },
    { id: 'not_equals', label: 'does not equal' },
    { id: 'greater_than', label: 'greater than' },
    { id: 'less_than', label: 'less than' }
  ],
  boolean: [
    { id: 'is_checked', label: 'is checked' },
    { id: 'is_unchecked', label: 'is unchecked' }
  ],
  checkbox: [
    { id: 'is_checked', label: 'is checked' },
    { id: 'is_unchecked', label: 'is unchecked' }
  ]
}

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

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value === '')
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
    return externalColumnDefinitions.value.map((column) => ({
      id: column.id,
      label: column.label || getColumnLabel(column.id),
      icon: column.icon || null,
      type: column.type || column.propertyType || getColumnType(column.id),
      propertyOptions: Array.isArray(column.propertyOptions) ? column.propertyOptions : []
    }))
  })

  function getColumnLabel(colId) {
    const externalDefinition = externalColumnMap.value.get(colId)
    if (externalDefinition?.label) return externalDefinition.label
    return colId
  }

  function getColumnType(colId) {
    const externalDefinition = externalColumnMap.value.get(colId)
    if (externalDefinition?.type) return externalDefinition.type
    if (externalDefinition?.propertyType) return externalDefinition.propertyType
    return 'text'
  }

  function getOperatorsForColumn(colId) {
    const type = getColumnType(colId)
    const operators = OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text
    return operators.map((operator) => ({
      ...operator,
      label: t(`tasks.filters.operators.${operator.id}`, operator.label)
    }))
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
      label: getColumnLabel(columnId),
      icon: externalColumnMap.value.get(columnId)?.icon || null,
      propertyOptions: Array.isArray(externalColumnMap.value.get(columnId)?.propertyOptions)
        ? externalColumnMap.value.get(columnId).propertyOptions
        : []
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
      case 'user':
        return matchUserFilter(cellValue, operator, value)
      case 'multiselect':
        return matchMultiselectFilter(cellValue, operator, value)
      case 'date':
        return matchDateFilter(cellValue, operator, value)
      case 'number':
        return matchNumberFilter(cellValue, operator, value)
      case 'boolean':
      case 'checkbox':
        return matchBooleanFilter(cellValue, operator, value)
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
      if (hasValue(value)) {
        return value
      }
    }

    const directCandidates = [column, sourceKey].filter(Boolean)
    for (const path of directCandidates) {
      const value = getByPath(row, path) ?? getByPath(row?._raw, path)
      if (hasValue(value)) {
        return value
      }
    }

    return hasValue(row?.[column]) ? row[column] : ''
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

  function matchUserFilter(cellValue, operator, filterUserObj) {
    // filterUserObj is expected to be { id: '...', name: '...', email: '...' } or null
    // If it's empty, consider it unmatched unless we specifically check for unassigned (not implemented here yet)
    if (!filterUserObj || !filterUserObj.id) return true

    // We try to match either by exact user id or user name if that's what's stored in the grid
    const matchId = String(filterUserObj.id).trim().toLowerCase()
    const matchName = String(filterUserObj.name || '').trim().toLowerCase()
    const matchEmail = String(filterUserObj.email || '').trim().toLowerCase()

    const values = []
    if (cellValue && typeof cellValue === 'object') {
      values.push(
        String(cellValue.id || '').trim().toLowerCase(),
        String(cellValue.name || '').trim().toLowerCase(),
        String(cellValue.email || '').trim().toLowerCase()
      )
    } else {
      values.push(String(cellValue || '').trim().toLowerCase())
    }

    const matches = values.some((value) => value && (value === matchId || value === matchName || value === matchEmail))

    return operator === 'is' ? matches : !matches
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

  /**
   * Match a number-type filter
   * @param {*} cellValue
   * @param {string} operator - equals, not_equals, greater_than, less_than
   * @param {*} value - numeric filter value
   * @returns {boolean}
   */
  function matchNumberFilter(cellValue, operator, value) {
    if (value === '' || value === null || value === undefined) return true
    const cellNum = Number(cellValue)
    const filterNum = Number(value)
    if (isNaN(cellNum) || isNaN(filterNum)) return true

    switch (operator) {
      case 'equals':
        return cellNum === filterNum
      case 'not_equals':
        return cellNum !== filterNum
      case 'greater_than':
        return cellNum > filterNum
      case 'less_than':
        return cellNum < filterNum
      default:
        return true
    }
  }

  /**
   * Match a boolean/checkbox-type filter
   * @param {*} cellValue
   * @param {string} operator - is_checked, is_unchecked
   * @returns {boolean}
   */
  function matchBooleanFilter(cellValue, operator) {
    const isTruthy =
      cellValue === true ||
      cellValue === 'true' ||
      cellValue === '1' ||
      cellValue === 1
    switch (operator) {
      case 'is_checked':
        return isTruthy
      case 'is_unchecked':
        return !isTruthy
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
