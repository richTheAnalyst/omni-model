import { PROFILE } from '../config/profile.js'
import { ApiError } from './client.js'

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function normalizeProfile(raw) {
  const geography = {}
  for (const [region, cities] of Object.entries(plainObject(raw?.geography))) {
    geography[region] = Array.isArray(cities) ? cities.filter((c) => typeof c === 'string') : []
  }
  return {
    ...raw,
    id: String(raw?.id ?? ''),
    name: String(raw?.name || ''),
    country: String(raw?.country || ''),
    business: plainObject(raw?.business),
    offerings: plainObject(raw?.offerings),
    sectors: plainObject(raw?.sectors),
    geography,
  }
}

export async function fetchProfileIds() {
  return [PROFILE.id]
}

export async function fetchProfile(id) {
  if (id !== PROFILE.id) {
    throw new ApiError({ kind: 'notfound', detail: `Unknown profile: ${id}` })
  }
  return normalizeProfile(PROFILE)
}

export function minimalProfile(id) {
  return normalizeProfile({ id, name: id })
}
