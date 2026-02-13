/**
 * Shared avatar color palette and hash function.
 * Generates a consistent background color for user initials
 * based on a deterministic hash of the user's name.
 */

const AVATAR_COLORS = [
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

/**
 * Return a consistent colour from the palette for the given name.
 * Falls back to gray for empty / "Unassigned" names.
 *
 * @param {string} name
 * @returns {string} hex colour
 */
export function getAvatarColor(name) {
  if (!name || name === 'Unassigned') return '#9CA3AF'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
