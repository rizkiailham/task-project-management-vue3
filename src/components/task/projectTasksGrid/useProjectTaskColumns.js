import { computed, ref } from 'vue'
import { getPropertyCellRenderer, hasInteractiveCellRenderer } from '@/components/task/projectTasksGrid/usePropertyCellRenderer'
import { getColumnDefinition } from '@/components/task/projectTasksGrid/taskColumnDefinitions'
import { LayoutGrid, CircleDot, Users, Tag, Flag, Calendar, Clock, Scaling, CalendarPlus, UserPlus, CalendarClock, UserCog, Globe, FileText, Hash, CheckSquare, List } from 'lucide-vue-next'

const COLUMN_SETTINGS_STORAGE_PREFIX = 'project-tasks-grid-columns-v2'
const CORE_VISIBLE_PROPERTY_KEYS = new Set(['status', 'assignee', 'due_date', 'tags'])
const BASE_COLUMN_VISIBILITY = {
  title: true,
  projectName: true
}

const PROPERTY_KEY_TO_GRID_COLUMN_ID = {
  status: 'status',
  assignee: 'assignee',
  due_date: 'dueDate',
  tags: 'tags',
  priority: 'priority',
  size: 'size',
  time_tracking: 'trackingTime',
  created: 'createdAt',
  created_by: 'createdBy',
  last_updated: 'updatedAt',
  last_updated_by: 'updatedBy',
  timezone: 'timezone'
}

const EXCLUDED_MANAGED_PROPERTY_KEYS = new Set(['status', 'assignee', 'due_date', 'tags'])
const PROPERTY_TYPE_ICONS = {
  select: List,
  multiselect: LayoutGrid,
  user: Users,
  date: Calendar,
  text: FileText,
  number: Hash,
  boolean: CheckSquare,
  checkbox: CheckSquare
}

function normalizePropertyType(type) {
  return String(type || 'text')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function resolveGridPropertyType(property = {}) {
  const propertyKey = normalizeLookupKey(property?.key)
  const normalizedType = normalizePropertyType(property?.type || 'text')
  const allowMultiple = property?.settings?.isAllowMultiple

  if (propertyKey === 'priority') return 'select'
  if (normalizedType === 'multiselect' && allowMultiple === false) return 'select'
  if (normalizedType === 'select' && allowMultiple === true) return 'multiselect'

  return property?.type || 'text'
}

function resolvePropertyOptions(property = {}) {
  const settings = property?.settings && typeof property.settings === 'object'
    ? property.settings
    : {}

  if (Array.isArray(settings.options) && settings.options.length) {
    return settings.options
  }

  const propertyKey = normalizeLookupKey(property?.key)
  if (propertyKey !== 'size') return []

  const formatKey = String(settings.format || '').trim()
  const formats = settings.formats && typeof settings.formats === 'object'
    ? settings.formats
    : {}
  const values = Array.isArray(formats[formatKey]) ? formats[formatKey] : []

  return values.map((value, index) => ({
    value,
    index: index + 1
  }))
}

function resolvePropertyMenuIcon(property = {}) {
  const propertyKey = normalizeLookupKey(property?.key)
  const mappedColumnId = PROPERTY_KEY_TO_GRID_COLUMN_ID[propertyKey]
  if (mappedColumnId) {
    const columnDef = getColumnDefinition(mappedColumnId)
    if (columnDef?.icon) return columnDef.icon
  }

  const normalizedType = normalizePropertyType(property?.type)
  return PROPERTY_TYPE_ICONS[normalizedType] || FileText
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

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

function formatUnknownValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatUnknownValue(entry))
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value === 'object') {
    return value.name || value.label || value.title || value.value || ''
  }

  return ''
}

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value === '')
}

function resolveDisplayUser(user) {
  if (!user) return ''
  if (typeof user === 'string') return user
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return user.name || fullName || user.email || user.username || String(user.id || '')
}

function extractCustomFieldMap(task) {
  const map = {}
  const write = (key, value) => {
    const rawKey = String(key || '').trim()
    if (!rawKey) return

    map[rawKey] = value

    const normalized = normalizeLookupKey(rawKey)
    if (normalized && normalized !== rawKey) {
      map[normalized] = value
    }
  }

  const writePropertyEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return
    const property = entry.property && typeof entry.property === 'object' ? entry.property : {}
    const value = entry.value ?? null
    ;[
      entry.id,
      entry.propertyId,
      entry.propertyKey,
      entry.key,
      property.id,
      property.key,
      property.label,
      property?.settings?.sourceField
    ].forEach((candidate) => write(candidate, value))
  }

  const writeEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return
    const value = entry.value ?? entry.fieldValue ?? entry.customFieldValue ?? entry.data ?? entry.defaultValue ?? null
      ;[
        entry.id,
        entry.fieldId,
        entry.customFieldId,
        entry.key,
        entry.fieldKey,
        entry.customFieldKey,
        entry.name,
        entry.fieldName,
        entry.label
      ].forEach((candidate) => write(candidate, value))
  }

  const propertySources = [
    task?.propertyValues,
    task?.customValues,
    task?._raw?.propertyValues,
    task?._raw?.customValues
  ]

  propertySources.forEach((source) => {
    if (!Array.isArray(source)) return
    source.forEach((entry) => writePropertyEntry(entry))
  })

  const sources = [
    task?.customFields,
    task?.customFieldValues,
    task?._raw?.customFields,
    task?._raw?.customFieldValues
  ]

  sources.forEach((source) => {
    if (!source) return
    if (Array.isArray(source)) {
      source.forEach((entry) => writeEntry(entry))
      return
    }
    if (typeof source === 'object') {
      Object.entries(source).forEach(([key, value]) => write(key, value))
    }
  })

  if (task?.propertyValueMap && typeof task.propertyValueMap === 'object') {
    Object.entries(task.propertyValueMap).forEach(([key, value]) => write(key, value))
  }

  return map
}

function normalizeCustomColumn(definition) {
  if (!definition || typeof definition !== 'object') return null
  const label = String(definition.label || '').trim()
  if (!label) return null

  const id = String(definition.id || '').trim()
  const sourceKey = String(definition.sourceKey || label).trim()
  if (!id) return null

  return {
    id,
    label,
    sourceKey
  }
}

export function useProjectTaskColumns(t, options = {}) {
  const storageKey = ref(`${COLUMN_SETTINGS_STORAGE_PREFIX}:global`)
  const columnVisibility = ref({ ...BASE_COLUMN_VISIBILITY })
  const customColumns = ref([])
  const newCustomColumnLabel = ref('')

  // Property definitions from store (injected by caller)
  const propertyDefinitions = computed(() => {
    const source = options?.propertyDefinitions
    if (Array.isArray(source)) return source
    if (Array.isArray(source?.value)) return source.value
    return []
  })

  const staticMenuColumns = computed(() => ([
    {
      id: 'title',
      label: t('tasks.fields.title', 'Title'),
      sourceKey: 'title',
      type: 'text',
      defaultVisible: true,
      locked: true,
      isBase: true
    },
    {
      id: 'projectName',
      label: t('tasks.project', 'Project'),
      sourceKey: 'projectName',
      type: 'text',
      defaultVisible: true,
      locked: false,
      isBase: true
    }
  ]))

  const propertyMenuColumns = computed(() => {
    return propertyDefinitions.value
      .filter((property) => property && property.isVisible !== false)
      .map((property) => {
        const propType = resolveGridPropertyType(property)
        const propertyKey = normalizeLookupKey(property.key)
        const mappedGridId = PROPERTY_KEY_TO_GRID_COLUMN_ID[propertyKey]
        const id = String(mappedGridId || property.id || property.key || '').trim()
        if (!id) return null

        return {
          id,
          label: property.label || property.name || id,
          sourceKey: property.key || property.id || id,
          type: propType,
          icon: resolvePropertyMenuIcon(property),
          defaultVisible: CORE_VISIBLE_PROPERTY_KEYS.has(propertyKey),
          propertyId: property.id || null,
          propertyKey: property.key || null,
          propertyType: propType,
          propertyOptions: resolvePropertyOptions(property),
          propertySourceField: property?.settings?.sourceField || null,
          isReadonly: Boolean(property?.settings?.readonly),
          isPropertyStore: true,
          locked: id === 'title'
        }
      })
      .filter(Boolean)
  })

  const customMenuColumns = computed(() => {
    const list = []
    const seenIds = new Set()
    const seenKeys = new Set()

    propertyMenuColumns.value.forEach((column) => {
      if (!column?.id) return
      const propertyId = String(column.propertyId || '').trim()
      const propertyKey = normalizeLookupKey(column.propertyKey || column.sourceKey)
      if (seenIds.has(column.id)) return
      seenIds.add(column.id)
      if (propertyId) seenIds.add(propertyId)
      if (propertyKey) seenKeys.add(propertyKey)
      list.push({ ...column, isCustom: true })
    })

    // 2. Add any local custom columns that don't overlap with properties
    customColumns.value.forEach(c => {
      if (seenIds.has(String(c.id))) return
      const localKey = normalizeLookupKey(c.sourceKey || c.label || c.id)
      if (localKey && seenKeys.has(localKey)) return
      list.push({
        ...c,
        icon: c.icon || FileText,
        isCustom: true,
        defaultVisible: true,
        isLocal: true
      })
    })

    return list
  })

  const columnMenuDefinitions = computed(() => {
    const map = new Map()

    ;[...staticMenuColumns.value, ...customMenuColumns.value].forEach((column) => {
      if (!column?.id) return
      if (!map.has(column.id)) map.set(column.id, column)
    })

    return Array.from(map.values())
  })
  const hiddenColumnMenuDefinitions = computed(() =>
    columnMenuDefinitions.value.filter(
      (item) => !item.locked && !isColumnVisible(item.id, item.defaultVisible !== false)
    )
  )

  const columnMenuItems = computed(() => ([
    ...hiddenColumnMenuDefinitions.value.map((item) => ({
      id: `column-${item.id}`,
      key: item.id,
      label: item.label,
      icon: item.icon || null
    }))
  ]))

  function isColumnVisible(columnId, defaultVisible = true) {
    const current = columnVisibility.value?.[columnId]
    if (current === undefined) return defaultVisible
    return current !== false
  }

  const managedColumnDefs = computed(() => {
    const propertyColumnDefs = propertyDefinitions.value
      .filter((property) => property && property.isVisible !== false)
      .filter((property) => !EXCLUDED_MANAGED_PROPERTY_KEYS.has(normalizeLookupKey(property.key)))
      .map((property) => {
        const propertyKey = normalizeLookupKey(property.key)
        const colId = PROPERTY_KEY_TO_GRID_COLUMN_ID[propertyKey] || String(property.id || property.key || '')
        if (!colId) return null

        const propType = resolveGridPropertyType(property)
        const normalizedPropType = normalizePropertyType(propType)
        const rendererMeta = getPropertyCellRenderer(propType)
        const isTrackingTimeColumn = colId === 'trackingTime' || propertyKey === 'time_tracking'
        const isUserProperty = normalizedPropType === 'user'
        const useInteractiveRenderer = isTrackingTimeColumn ? false : hasInteractiveCellRenderer(propType)
        const baseDef = {
          colId,
          field: colId,
          headerName: property.label || property.name || colId,
          minWidth: colId === 'size' ? 110 : (colId === 'trackingTime' ? 140 : 150),
          hide: !isColumnVisible(colId, CORE_VISIBLE_PROPERTY_KEYS.has(propertyKey)),
          propertyId: property.id || colId,
          propertyKey: property.key || null,
          sourceKey: property.key || property.id || colId,
          propertyType: propType,
          propertyOptions: resolvePropertyOptions(property),
          propertySourceField: property?.settings?.sourceField || null,
          isReadonly: Boolean(property?.settings?.readonly)
        }

        if (isTrackingTimeColumn) {
          baseDef.cellRenderer = 'TrackingTimeCell'
          return baseDef
        }

        if (isUserProperty) {
          baseDef.cellRenderer = 'PropertyUserCell'
          baseDef.cellClass = 'flex items-center p-0'
          return baseDef
        }

        if (useInteractiveRenderer && rendererMeta?.cellRenderer) {
          baseDef.cellRenderer = rendererMeta.cellRenderer
          baseDef.cellClass = rendererMeta.cellClass
          return baseDef
        }

        baseDef.valueGetter = (params) => {
          const rowData = params.data || {}
          const customFieldMap = rowData.customFieldMap || {}
          const candidates = [
            normalizeLookupKey(baseDef.sourceKey),
            normalizeLookupKey(baseDef.headerName),
            normalizeLookupKey(colId),
            baseDef.sourceKey,
            colId
          ].filter(Boolean)

          for (const candidate of candidates) {
            const mapValue = customFieldMap[candidate]
            if (hasValue(mapValue)) {
              return formatUnknownValue(mapValue)
            }

            const direct = getByPath(rowData, candidate) ?? getByPath(rowData._raw, candidate)
            if (direct !== undefined && direct !== null && direct !== '') {
              return formatUnknownValue(direct)
            }
          }

          const byPath = getByPath(rowData, baseDef.sourceKey) ?? getByPath(rowData._raw, baseDef.sourceKey)
          return formatUnknownValue(byPath)
        }

        return baseDef
      })
      .filter(Boolean)

    const localCustomColumnDefs = customColumns.value.map((column) => {
      // Try to find matching property definition to get type metadata
      const propDef = findPropertyForColumn(column)
      const propType = propDef?.type || column.type || null
      const normalizedPropType = normalizePropertyType(propType)
      const rendererMeta = propType ? getPropertyCellRenderer(propType) : null
      const isUserProperty = normalizedPropType === 'user'
      const useInteractiveRenderer = propType && hasInteractiveCellRenderer(propType)

      const baseDef = {
        colId: column.id,
        field: column.id,
        headerName: column.label,
        minWidth: 150,
        hide: !isColumnVisible(column.id, column.defaultVisible !== false),
        // Attach property metadata for cell renderers to access
        propertyId: propDef?.id || column.id,
        propertyKey: propDef?.key || column.sourceKey || null,
        sourceKey: column.sourceKey || column.label,
        propertyType: propType,
        propertyOptions: propDef?.settings?.options || [],
        propertySourceField: propDef?.settings?.sourceField || null,
        isReadonly: Boolean(propDef?.settings?.readonly)
      }

      if (isUserProperty) {
        baseDef.cellRenderer = 'PropertyUserCell'
        baseDef.cellClass = 'flex items-center p-0'
      } else if (useInteractiveRenderer && rendererMeta?.cellRenderer) {
        // Use dedicated interactive cell renderer
        baseDef.cellRenderer = rendererMeta.cellRenderer
        baseDef.cellClass = rendererMeta.cellClass
      } else {
        // Fallback: plain text display via valueGetter
        baseDef.valueGetter = (params) => {
          const rowData = params.data || {}
          const customFieldMap = rowData.customFieldMap || {}
          const candidates = [
            normalizeLookupKey(column.sourceKey),
            normalizeLookupKey(column.label),
            normalizeLookupKey(column.id),
            column.sourceKey,
            column.id
          ].filter(Boolean)

          for (const candidate of candidates) {
            const mapValue = customFieldMap[candidate]
            if (hasValue(mapValue)) {
              return formatUnknownValue(mapValue)
            }

            const direct = getByPath(rowData, candidate) ?? getByPath(rowData._raw, candidate)
            if (direct !== undefined && direct !== null && direct !== '') {
              return formatUnknownValue(direct)
            }
          }

          const byPath = getByPath(rowData, column.sourceKey) ?? getByPath(rowData._raw, column.sourceKey)
          return formatUnknownValue(byPath)
        }
      }

      return baseDef
    })

    return [...propertyColumnDefs, ...localCustomColumnDefs]
  })

  /**
   * Find a property definition that matches a custom column.
   * Matches by id, key, or normalized label.
   */
  function findPropertyForColumn(column) {
    const defs = propertyDefinitions.value
    if (!defs.length) return null

    // Direct id match
    const byId = defs.find(p => p.id === column.id)
    if (byId) return byId

    // Key match
    const normalizedKey = normalizeLookupKey(column.sourceKey || column.label)
    const byKey = defs.find(p => {
      const pKey = normalizeLookupKey(p.key || p.label)
      return pKey && pKey === normalizedKey
    })
    if (byKey) return byKey

    // Label match
    const normalizedLabel = normalizeLabel(column.label)
    return defs.find(p => normalizeLabel(p.label) === normalizedLabel) || null
  }

  function persistColumnSettings() {
    if (typeof window === 'undefined') return
    try {
      const payload = {
        visibility: columnVisibility.value,
        customColumns: customColumns.value
      }
      window.localStorage.setItem(storageKey.value, JSON.stringify(payload))
    } catch (error) {
      // Ignore localStorage failures and keep runtime behavior.
    }
  }

  function loadColumnSettings() {
    if (typeof window === 'undefined') {
      columnVisibility.value = { ...BASE_COLUMN_VISIBILITY }
      customColumns.value = []
      return
    }

    try {
      const raw = window.localStorage.getItem(storageKey.value)
      const parsed = raw ? JSON.parse(raw) : {}
      const savedVisibility = parsed?.visibility && typeof parsed.visibility === 'object'
        ? parsed.visibility
        : (parsed && typeof parsed === 'object' ? parsed : {})
      const savedCustomColumns = Array.isArray(parsed?.customColumns)
        ? parsed.customColumns.map(normalizeCustomColumn).filter(Boolean)
        : []

      customColumns.value = savedCustomColumns

      const baselineVisibility = { ...BASE_COLUMN_VISIBILITY }
      propertyDefinitions.value.forEach((property) => {
        const propertyKey = normalizeLookupKey(property?.key)
        const colId = PROPERTY_KEY_TO_GRID_COLUMN_ID[propertyKey] || String(property?.id || property?.key || '')
        if (!colId) return
        baselineVisibility[colId] = CORE_VISIBLE_PROPERTY_KEYS.has(propertyKey)
      })
      savedCustomColumns.forEach((column) => {
        baselineVisibility[column.id] = true
      })

      columnVisibility.value = {
        ...baselineVisibility,
        ...(savedVisibility || {}),
        title: true
      }
    } catch (error) {
      columnVisibility.value = { ...BASE_COLUMN_VISIBILITY }
      customColumns.value = []
    }
  }

  function setColumnScope(projectItemId, projectId) {
    const scope = projectItemId || projectId || 'global'
    storageKey.value = `${COLUMN_SETTINGS_STORAGE_PREFIX}:${scope}`
    loadColumnSettings()
  }

  function applyColumnVisibilityToGrid(gridApi) {
    if (!gridApi) return
    columnMenuDefinitions.value.forEach((item) => {
      const isVisible = isColumnVisible(item.id, item.defaultVisible !== false)
      gridApi.setColumnsVisible([item.id], isVisible)
    })
  }

  function toggleColumnVisibility(columnId) {
    const target = columnMenuDefinitions.value.find((item) => item.id === columnId)
    if (!target || target.locked) return

    const currentlyVisible = isColumnVisible(columnId, target.defaultVisible !== false)
    columnVisibility.value = {
      ...columnVisibility.value,
      [columnId]: !currentlyVisible,
      title: true
    }

    persistColumnSettings()
  }

  function addCustomColumn() {
    const label = String(newCustomColumnLabel.value || '').trim()
    if (!label) return null

    const normalizedLabel = normalizeLabel(label)
    const hasDuplicateLabel = columnMenuDefinitions.value.some(
      (item) => normalizeLabel(item.label) === normalizedLabel
    )
    if (hasDuplicateLabel) return null

    const existingIds = new Set(columnMenuDefinitions.value.map((item) => item.id))
    const slug = slugify(label) || 'field'
    let customId = `custom_${slug}`
    let suffix = 2
    while (existingIds.has(customId)) {
      customId = `custom_${slug}_${suffix}`
      suffix += 1
    }

    customColumns.value = [
      ...customColumns.value,
      {
        id: customId,
        label,
        sourceKey: label
      }
    ]

    columnVisibility.value = {
      ...columnVisibility.value,
      [customId]: true,
      title: true
    }

    newCustomColumnLabel.value = ''
    persistColumnSettings()
    return customId
  }

  function removeCustomColumn(columnId) {
    const target = customColumns.value.find((column) => column.id === columnId)
    if (!target) return

    customColumns.value = customColumns.value.filter((column) => column.id !== columnId)
    const nextVisibility = { ...columnVisibility.value }
    delete nextVisibility[columnId]
    nextVisibility.title = true
    columnVisibility.value = nextVisibility
    persistColumnSettings()
  }

  function mapTaskColumnMeta(task) {
    const propertyValueMap = task?.propertyValueMap && typeof task.propertyValueMap === 'object'
      ? task.propertyValueMap
      : {}
    const customFieldMap = {
      ...propertyValueMap,
      ...extractCustomFieldMap(task)
    }

    return {
      size: task?.size || task?.taskSize || task?._raw?.size || '',
      createdAt: task?.createdAt || task?.created_at || null,
      createdBy: resolveDisplayUser(task?.createdBy || task?.creator || task?.createdByUser || task?.created_by),
      updatedAt: task?.updatedAt || task?.updated_at || null,
      updatedBy: resolveDisplayUser(task?.updatedBy || task?.updater || task?.updatedByUser || task?.updated_by),
      timezone: task?.timezone || task?.projectTimezone || task?._raw?.timezone || '',
      propertyValueMap,
      customFieldMap
    }
  }

  return {
    columnVisibility,
    customColumns,
    newCustomColumnLabel,
    columnMenuDefinitions,
    columnMenuItems,
    managedColumnDefs,
    setColumnScope,
    applyColumnVisibilityToGrid,
    toggleColumnVisibility,
    addCustomColumn,
    removeCustomColumn,
    mapTaskColumnMeta
  }
}
