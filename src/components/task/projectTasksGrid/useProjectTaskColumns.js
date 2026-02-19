import { computed, ref } from 'vue'

const COLUMN_SETTINGS_STORAGE_PREFIX = 'project-tasks-grid-columns-v2'

const DEFAULT_COLUMN_VISIBILITY = {
  title: true,
  projectName: true,
  status: true,
  assignee: true,
  dueDate: true,
  tags: true,
  priority: false,
  size: false,
  trackingTime: false,
  createdAt: false,
  createdBy: false,
  updatedAt: false,
  updatedBy: false,
  timezone: false
}

const BASE_MENU_COLUMN_DEFS = [
  { id: 'title', key: 'tasks.fields.title', fallback: 'Title', locked: true },
  { id: 'projectName', key: 'tasks.project', fallback: 'Project' },
  { id: 'status', key: 'taskDetail.status', fallback: 'Status' },
  { id: 'assignee', key: 'taskDetail.assignee', fallback: 'Assignee' },
  { id: 'dueDate', key: 'taskDetail.dueDate', fallback: 'Due date' },
  { id: 'tags', key: 'taskDetail.tags', fallback: 'Tags' },
  { id: 'priority', key: 'tasks.priority', fallback: 'Priority' },
  { id: 'size', key: 'tasks.columnOptions.size', fallback: 'Size' },
  { id: 'trackingTime', key: 'tasks.columnOptions.timeTracking', fallback: 'Time tracking' },
  { id: 'createdAt', key: 'taskDetail.createdAt', fallback: 'Created' },
  { id: 'createdBy', key: 'tasks.columnOptions.createdBy', fallback: 'Created by' },
  { id: 'updatedAt', key: 'taskDetail.lastUpdated', fallback: 'Last updated' },
  { id: 'updatedBy', key: 'tasks.columnOptions.lastUpdatedBy', fallback: 'Last updated by' },
  { id: 'timezone', key: 'tasks.columnOptions.timezone', fallback: 'Timezone' }
]

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

function resolveDisplayUser(user) {
  if (!user) return ''
  if (typeof user === 'string') return user
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return user.name || fullName || user.email || user.username || String(user.id || '')
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function extractCustomFieldMap(task) {
  const map = {}
  const write = (key, value) => {
    const normalized = normalizeLookupKey(key)
    if (!normalized) return
    map[normalized] = formatUnknownValue(value)
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

export function useProjectTaskColumns(t) {
  const storageKey = ref(`${COLUMN_SETTINGS_STORAGE_PREFIX}:global`)
  const columnVisibility = ref({ ...DEFAULT_COLUMN_VISIBILITY })
  const customColumns = ref([])
  const newCustomColumnLabel = ref('')

  const baseMenuColumns = computed(() =>
    BASE_MENU_COLUMN_DEFS.map((item) => ({
      ...item,
      label: t(item.key, item.fallback)
    }))
  )

  const customMenuColumns = computed(() =>
    customColumns.value.map((column) => ({
      ...column,
      isCustom: true
    }))
  )

  const columnMenuDefinitions = computed(() => [...baseMenuColumns.value, ...customMenuColumns.value])
  const hiddenColumnMenuDefinitions = computed(() =>
    columnMenuDefinitions.value.filter(
      (item) => !item.locked && columnVisibility.value[item.id] === false
    )
  )

  const columnMenuItems = computed(() => ([
    ...hiddenColumnMenuDefinitions.value.map((item) => ({
      id: `column-${item.id}`,
      key: item.id,
      label: item.label
    }))
  ]))

  const managedColumnDefs = computed(() => {
    const systemColumns = [
      {
        colId: 'priority',
        field: 'priority',
        headerName: t('tasks.priority', 'Priority'),
        minWidth: 120,
        hide: columnVisibility.value.priority === false,
        valueGetter: (params) => params.data?.priority || ''
      },
      {
        colId: 'size',
        field: 'size',
        headerName: t('tasks.columnOptions.size', 'Size'),
        minWidth: 110,
        hide: columnVisibility.value.size === false,
        valueGetter: (params) => params.data?.size || ''
      },
      {
        colId: 'trackingTime',
        field: 'trackingTime',
        headerName: t('tasks.columnOptions.timeTracking', 'Time tracking'),
        minWidth: 140,
        hide: columnVisibility.value.trackingTime === false,
        cellRenderer: 'TrackingTimeCell'
      },
      {
        colId: 'createdAt',
        field: 'createdAt',
        headerName: t('taskDetail.createdAt', 'Created'),
        minWidth: 160,
        hide: columnVisibility.value.createdAt === false,
        valueFormatter: (params) => formatDateTime(params.value)
      },
      {
        colId: 'createdBy',
        field: 'createdBy',
        headerName: t('tasks.columnOptions.createdBy', 'Created by'),
        minWidth: 150,
        hide: columnVisibility.value.createdBy === false,
        valueGetter: (params) => params.data?.createdBy || ''
      },
      {
        colId: 'updatedAt',
        field: 'updatedAt',
        headerName: t('taskDetail.lastUpdated', 'Last updated'),
        minWidth: 170,
        hide: columnVisibility.value.updatedAt === false,
        valueFormatter: (params) => formatDateTime(params.value)
      },
      {
        colId: 'updatedBy',
        field: 'updatedBy',
        headerName: t('tasks.columnOptions.lastUpdatedBy', 'Last updated by'),
        minWidth: 170,
        hide: columnVisibility.value.updatedBy === false,
        valueGetter: (params) => params.data?.updatedBy || ''
      },
      {
        colId: 'timezone',
        field: 'timezone',
        headerName: t('tasks.columnOptions.timezone', 'Timezone'),
        minWidth: 130,
        hide: columnVisibility.value.timezone === false,
        valueGetter: (params) => params.data?.timezone || ''
      }
    ]

    const customColumnDefs = customColumns.value.map((column) => ({
      colId: column.id,
      field: column.id,
      headerName: column.label,
      minWidth: 150,
      hide: columnVisibility.value[column.id] === false,
      valueGetter: (params) => {
        const rowData = params.data || {}
        const customFieldMap = rowData.customFieldMap || {}
        const candidates = [
          normalizeLookupKey(column.sourceKey),
          normalizeLookupKey(column.label),
          normalizeLookupKey(column.id)
        ].filter(Boolean)

        for (const candidate of candidates) {
          if (customFieldMap[candidate]) {
            return customFieldMap[candidate]
          }

          const direct = getByPath(rowData, candidate) ?? getByPath(rowData._raw, candidate)
          if (direct !== undefined && direct !== null && direct !== '') {
            return formatUnknownValue(direct)
          }
        }

        const byPath = getByPath(rowData, column.sourceKey) ?? getByPath(rowData._raw, column.sourceKey)
        return formatUnknownValue(byPath)
      }
    }))

    return [...systemColumns, ...customColumnDefs]
  })

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
      columnVisibility.value = { ...DEFAULT_COLUMN_VISIBILITY }
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

      const baselineVisibility = { ...DEFAULT_COLUMN_VISIBILITY }
      savedCustomColumns.forEach((column) => {
        baselineVisibility[column.id] = true
      })

      columnVisibility.value = {
        ...baselineVisibility,
        ...(savedVisibility || {}),
        title: true
      }
    } catch (error) {
      columnVisibility.value = { ...DEFAULT_COLUMN_VISIBILITY }
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
      const isVisible = columnVisibility.value[item.id] !== false
      gridApi.setColumnsVisible([item.id], isVisible)
    })
  }

  function toggleColumnVisibility(columnId) {
    const target = columnMenuDefinitions.value.find((item) => item.id === columnId)
    if (!target || target.locked) return

    columnVisibility.value = {
      ...columnVisibility.value,
      [columnId]: !(columnVisibility.value[columnId] !== false),
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
    return {
      size: task?.size || task?.taskSize || task?._raw?.size || '',
      createdAt: task?.createdAt || task?.created_at || null,
      createdBy: resolveDisplayUser(task?.createdBy || task?.creator || task?.createdByUser || task?.created_by),
      updatedAt: task?.updatedAt || task?.updated_at || null,
      updatedBy: resolveDisplayUser(task?.updatedBy || task?.updater || task?.updatedByUser || task?.updated_by),
      timezone: task?.timezone || task?.projectTimezone || task?._raw?.timezone || '',
      customFieldMap: extractCustomFieldMap(task)
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
