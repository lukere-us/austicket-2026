import bcrypt from 'bcryptjs'
import { ValidationError } from 'adminjs'

const BCRYPT_ROUNDS = 10

/**
 * Hash a plaintext password for admins/users tables.
 * @param {string} plaintext
 * @returns {string}
 */
export function hashAccountPassword(plaintext) {
  return bcrypt.hashSync(String(plaintext), BCRYPT_ROUNDS)
}

/**
 * AdminJS before-hook: map virtual `password` → `password_hash`, strip virtual field.
 * @param {import('adminjs').ActionRequest} request
 * @param {{ requirePassword?: boolean }} [opts]
 */
export function applyPasswordHashBefore(request, opts = {}) {
  const { requirePassword = false } = opts
  if (String(request?.method || '').toLowerCase() !== 'post') {
    return request
  }

  const payload = { ...(request.payload || {}) }
  const raw = payload.password != null ? String(payload.password) : ''
  delete payload.password

  const trimmed = raw.trim()
  if (trimmed) {
    if (trimmed.length < 6) {
      throw new ValidationError({
        password: { message: 'Password must be at least 6 characters.' },
      })
    }
    payload.password_hash = hashAccountPassword(trimmed)
  } else if (requirePassword) {
    throw new ValidationError({
      password: { message: 'Password is required.' },
    })
  }

  if (payload.email != null && payload.email !== '') {
    payload.email = String(payload.email).trim().toLowerCase()
  }

  return { ...request, payload }
}

/** Shared property config for a virtual password field. */
export function passwordPropertyOptions() {
  return {
    type: 'password',
    isVisible: {
      list: false,
      filter: false,
      show: false,
      new: true,
      edit: true,
    },
  }
}
