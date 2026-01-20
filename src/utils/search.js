export const DEFAULT_SEARCH_MIN_LENGTH = 3

export function resolveSearchKeywords(value, minLength = DEFAULT_SEARCH_MIN_LENGTH) {
  const query = (value || '').trim()
  if (!query) return ''
  if (query.length < minLength) return null
  return query
}
