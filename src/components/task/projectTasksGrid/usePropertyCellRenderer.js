/**
 * usePropertyCellRenderer.js
 *
 * Maps project property types to AG Grid cell renderer metadata.
 */

/**
 * Property type to cell renderer component name mapping.
 * These component names must be registered in AG Grid `gridOptions.components`.
 */
const TYPE_TO_RENDERER = {
  text: 'PropertyTextCell',
  number: 'PropertyNumberCell',
  boolean: 'PropertyCheckboxCell',
  checkbox: 'PropertyCheckboxCell',
  date: 'PropertyDateCell',
  status: 'StatusCell',
  select: 'PropertySelectCell',
  multiselect: 'PropertyMultiselectCell',
  user: 'PropertyUserCell',
  time_tracking: 'TrackingTimeCell'
}

/**
 * Property type to cell CSS class mapping.
 */
const TYPE_TO_CELL_CLASS = {
  text: 'flex items-center p-0',
  number: 'flex items-center p-0',
  boolean: 'flex items-center p-0',
  checkbox: 'flex items-center p-0',
  date: 'flex items-center p-0',
  status: 'flex items-center p-0',
  select: 'flex items-center p-0',
  multiselect: 'flex items-center p-0',
  user: 'flex items-center p-0',
  time_tracking: 'flex items-center p-0'
}

/**
 * Property type to filter type mapping.
 */
const TYPE_TO_FILTER_TYPE = {
  text: 'text',
  number: 'number',
  boolean: 'boolean',
  checkbox: 'boolean',
  date: 'date',
  status: 'select',
  select: 'select',
  multiselect: 'multiselect',
  user: 'user',
  time_tracking: 'number'
}

function normalizePropertyType(type) {
  const raw = String(type || 'text')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  const aliases = {
    multi_select: 'multiselect',
    multiple_select: 'multiselect',
    user_select: 'user',
    users: 'user',
    people: 'user',
    person: 'user',
    datetime: 'date',
    date_time: 'date',
    bool: 'boolean'
  }

  return aliases[raw] || raw
}

/**
 * Get cell renderer metadata for a property type.
 *
 * @param {string} type
 * @returns {{ cellRenderer: string|null, cellClass: string, filterType: string }}
 */
export function getPropertyCellRenderer(type) {
  const normalizedType = normalizePropertyType(type)
  return {
    cellRenderer: TYPE_TO_RENDERER[normalizedType] || null,
    cellClass: TYPE_TO_CELL_CLASS[normalizedType] || 'flex items-center p-0',
    filterType: TYPE_TO_FILTER_TYPE[normalizedType] || 'text'
  }
}

/**
 * Check whether a property type has a dedicated renderer.
 *
 * @param {string} type
 * @returns {boolean}
 */
export function hasInteractiveCellRenderer(type) {
  return !!TYPE_TO_RENDERER[normalizePropertyType(type)]
}

/**
 * Get all supported property types.
 *
 * @returns {string[]}
 */
export function getSupportedPropertyTypes() {
  return Object.keys(TYPE_TO_RENDERER)
}

export default {
  getPropertyCellRenderer,
  hasInteractiveCellRenderer,
  getSupportedPropertyTypes
}
