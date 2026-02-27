function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value === '')
}

export function normalizeLookupKey(value) {
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

function readMapValue(map, candidates = []) {
  if (!map || typeof map !== 'object') return undefined
  for (const candidate of candidates) {
    const rawKey = String(candidate || '').trim()
    if (!rawKey) continue

    if (rawKey in map) {
      return map[rawKey]
    }

    const normalized = normalizeLookupKey(rawKey)
    if (normalized in map) {
      return map[normalized]
    }
  }
  return undefined
}

export function getPropertyId(params) {
  return String(params?.colDef?.propertyId || params?.colDef?.colId || params?.colDef?.field || '').trim()
}

export function getPropertyDefinition(params) {
  const propertyId = getPropertyId(params)
  const sourceKey = String(params?.colDef?.sourceKey || '').trim()
  const normalizedSourceKey = normalizeLookupKey(sourceKey)
  const definitionsSource = params?.context?.propertyDefinitions
  const definitions = Array.isArray(definitionsSource?.value)
    ? definitionsSource.value
    : Array.isArray(definitionsSource)
      ? definitionsSource
      : []

  const fromDefinitions = definitions.find((property) => {
    if (!property || typeof property !== 'object') return false
    return (
      String(property.id || '').trim() === propertyId ||
      String(property.key || '').trim() === propertyId ||
      (sourceKey && String(property.key || '').trim() === sourceKey) ||
      (normalizedSourceKey && normalizeLookupKey(property.key || '') === normalizedSourceKey)
    )
  }) || null

  if (fromDefinitions) return fromDefinitions

  const data = params?.data || {}
  const sources = [
    data?.propertyValues,
    data?.customValues,
    data?._raw?.propertyValues,
    data?._raw?.customValues
  ]

  for (const source of sources) {
    if (!Array.isArray(source)) continue
    const matchedEntry = source.find((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const entryProperty = entry.property && typeof entry.property === 'object' ? entry.property : null
      const entryPropertyId = String(entry.propertyId || entryProperty?.id || '').trim()
      const entryPropertyKey = String(entry.propertyKey || entry.key || entryProperty?.key || '').trim()
      const normalizedEntryPropertyKey = normalizeLookupKey(entryPropertyKey)

      return (
        (propertyId && (entryPropertyId === propertyId || entryPropertyKey === propertyId)) ||
        (sourceKey && (entryPropertyKey === sourceKey || normalizedEntryPropertyKey === normalizedSourceKey))
      )
    })

    if (matchedEntry?.property && typeof matchedEntry.property === 'object') {
      return matchedEntry.property
    }
  }

  return null
}

export function isPropertyReadonly(params) {
  const propDef = getPropertyDefinition(params)
  return Boolean(propDef?.settings?.readonly || params?.colDef?.isReadonly)
}

export function getPropertyOptions(params) {
  const data = params?.data || {}
  const propertyId = getPropertyId(params)
  const sourceKey = String(params?.colDef?.sourceKey || '').trim()
  const normalizedSourceKey = normalizeLookupKey(sourceKey)

  const sources = [
    data?.propertyValues,
    data?.customValues,
    data?._raw?.propertyValues,
    data?._raw?.customValues
  ]

  let rowLevelOptions = null
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    const matchedEntry = source.find((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const entryProperty = entry.property && typeof entry.property === 'object' ? entry.property : null
      const entryPropertyId = String(entry.propertyId || entryProperty?.id || '').trim()
      const entryPropertyKey = String(entry.propertyKey || entry.key || entryProperty?.key || '').trim()
      const normalizedEntryPropertyKey = normalizeLookupKey(entryPropertyKey)

      return (
        (propertyId && (entryPropertyId === propertyId || entryPropertyKey === propertyId)) ||
        (sourceKey && (entryPropertyKey === sourceKey || normalizedEntryPropertyKey === normalizedSourceKey))
      )
    })

    const candidateOptions = matchedEntry?.property?.settings?.options
    if (Array.isArray(candidateOptions)) {
      rowLevelOptions = candidateOptions
      break
    }
  }

  const propDef = getPropertyDefinition(params)
  const rawOptions = rowLevelOptions || propDef?.settings?.options || params?.colDef?.propertyOptions || []

  if (!Array.isArray(rawOptions)) return []

  return rawOptions
    .map((option, index) => {
      if (typeof option === 'string' || typeof option === 'number') {
        const value = String(option)
        return {
          id: value,
          label: value,
          value,
          color: ''
        }
      }

      if (!option || typeof option !== 'object') return null

      const value = option.value ?? option.label ?? option.name ?? ''
      const label = String(option.label ?? option.value ?? option.name ?? '').trim() || String(value || '').trim()
      const id = String(option.id ?? value ?? `opt-${index}`).trim() || `opt-${index}`

      return {
        id,
        label: label || id,
        value,
        color: option.color || '',
        raw: option
      }
    })
    .filter(Boolean)
}

export function getNumberPropertyFormatOptions(params) {
  const propDef = getPropertyDefinition(params)
  if (!propDef || propDef.type !== 'number') return []

  const formatKey = propDef?.settings?.format
  const formats = propDef?.settings?.formats
  if (!formatKey || !formats || typeof formats !== 'object') return []

  const options = formats[formatKey]
  if (!Array.isArray(options) || !options.length) return []

  return options.map((option, index) => {
    const value = typeof option === 'number' ? option : String(option)
    const label = String(option)
    return {
      id: String(value ?? `opt-${index}`),
      label,
      value,
      color: ''
    }
  })
}

export function resolvePropertyValue(params) {
  const data = params?.data || {}
  const propertyId = getPropertyId(params)
  const colId = String(params?.colDef?.colId || params?.colDef?.field || '').trim()
  const sourceKey = String(params?.colDef?.sourceKey || '').trim()

  const directCandidates = [colId, propertyId, sourceKey].filter(Boolean)
  for (const candidate of directCandidates) {
    const direct = data[candidate]
    if (hasValue(direct)) return direct
  }

  const propertyValueMap = data?.propertyValueMap && typeof data.propertyValueMap === 'object'
    ? data.propertyValueMap
    : {}
  const mapValue = readMapValue(propertyValueMap, [sourceKey, propertyId, colId])
  if (mapValue !== undefined) return mapValue

  const customFieldMap = data?.customFieldMap && typeof data.customFieldMap === 'object'
    ? data.customFieldMap
    : {}
  const customValue = readMapValue(customFieldMap, [sourceKey, propertyId, colId])
  if (customValue !== undefined) return customValue

  if (hasValue(params?.value)) {
    return params.value
  }

  const propDef = getPropertyDefinition(params)
  const sourceField = String(
    propDef?.settings?.sourceField || params?.colDef?.propertySourceField || ''
  ).trim()

  if (sourceField) {
    if (sourceField.endsWith('Id')) {
      const relationKey = sourceField.slice(0, -2)
      const relation = getByPath(data?._raw, relationKey) ?? getByPath(data, relationKey)
      if (hasValue(relation)) return relation
    }

    const rawSource = getByPath(data, sourceField) ?? getByPath(data?._raw, sourceField)
    if (hasValue(rawSource)) return rawSource
  }

  return null
}
