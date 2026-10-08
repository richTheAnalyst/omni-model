export function displayName(lead) {
  return lead?.name?.trim() || 'Unnamed business'
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Only http(s) links are ever rendered as links. API data is not trusted. */
export function safeUrl(value) {
  if (!value || typeof value !== 'string') return null
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export function hostname(value) {
  const href = safeUrl(value)
  if (!href) return value || ''
  return new URL(href).hostname.replace(/^www\./, '')
}

export function telHref(phone) {
  if (!phone) return null
  const cleaned = String(phone).replace(/[^\d+]/g, '')
  return cleaned.length >= 5 ? `tel:${cleaned}` : null
}

export function formatRating(rating, reviewCount) {
  if (rating == null) return null
  const base = rating.toFixed(1)
  return reviewCount != null ? `${base} (${reviewCount.toLocaleString()})` : base
}

export function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

export function prettifyKey(key) {
  const spaced = String(key).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1).toLowerCase() : String(key)
}

/** Safe file names for downloads: letters, numbers, dash and underscore only. */
export function sanitizeFilename(input, fallback = 'omni-model-draft') {
  const cleaned = String(input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
    .replace(/_+$/g, '')
  return cleaned || fallback
}

export function cityKey(value) {
  return String(value || '').trim().toLowerCase()
}

/** The API matches sector keys exactly: "Real Estate" -> "real_estate". */
export function normalizeSector(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** The API matches region keys exactly: "greater accra" -> "Greater Accra". */
export function normalizeRegion(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}
