import { getAvatarColor } from '@/utils/avatarColor'

/**
 * Returns a normalized display name for a user.
 * Prioritizes full name, then first name, then email, then username, then ID.
 */
export function getUserDisplayName(user) {
  if (!user) return ''
  if (typeof user === 'string') return user

  const firstName = String(user.firstName || '').trim()
  const lastName = String(user.lastName || '').trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || user.name || user.email || user.username || (user.id ? String(user.id) : '')
}

/**
 * Returns a consistently formatted initial (1 character, uppercase) for a user.
 */
export function getUserInitial(user, fallback = '?') {
  if (!user) return fallback

  if (typeof user === 'string') {
    const trimmed = user.trim()
    return trimmed ? trimmed.charAt(0).toUpperCase() : fallback
  }

  const firstName = String(user.firstName || '').trim()
  if (firstName) return firstName.charAt(0).toUpperCase()

  const name = getUserDisplayName(user).trim()
  return name ? name.charAt(0).toUpperCase() : fallback
}

/**
 * Normalizes a user object/string into a consistent object structure
 * meant for UI display purposes (User lists, dropdowns, avatars, cells).
 * 
 * Includes `id`, `name`, `email`, `avatar`, `avatarUrl`, `initials`, and `color`.
 */
export function normalizeUserForDisplay(user) {
  if (!user) return null

  if (typeof user === 'string') {
    const initials = getUserInitial(user, '?')
    const color = getAvatarColor(user)
    return {
      id: user,
      name: user,
      email: '',
      avatar: null,
      avatarUrl: null,
      initials,
      color
    }
  }

  const name = getUserDisplayName(user)
  const initials = getUserInitial(user, '?')
  const avatar = user.avatar || user.avatarUrl || null
  const color = avatar ? 'transparent' : getAvatarColor(name)

  return {
    ...user, // Keep original data so components can still emit the full object
    id: user.id || null,
    name,
    email: user.email || '',
    avatar,
    avatarUrl: avatar,
    initials,
    color
  }
}
