import { request } from './client.js'

function topOffering(scores) {
  let bestKey = null
  let best = -Infinity
  for (const [key, value] of Object.entries(scores)) {
    const s = Number(value?.score)
    if (Number.isFinite(s) && s > best) {
      best = s
      bestKey = key
    }
  }
  return bestKey
}

/** Keeps the shape the UI relies on, whatever nulls the API sends. */
export function normalizeLead(raw) {
  const scores = raw?.scores && typeof raw.scores === 'object' ? raw.scores : {}
  const best = raw?.best_offering in scores ? raw.best_offering : topOffering(scores) || raw?.best_offering || ''
  return {
    id: String(raw?.id || `${raw?.name || 'lead'}|${raw?.address || ''}`),
    name: raw?.name ?? null,
    address: raw?.address ?? null,
    phone: raw?.phone ?? null,
    website: raw?.website ?? null,
    rating: typeof raw?.rating === 'number' ? raw.rating : null,
    review_count: typeof raw?.review_count === 'number' ? raw.review_count : null,
    region: raw?.region || '',
    city: raw?.city || '',
    sector: raw?.sector || '',
    best_offering: best,
    scores,
    analysis: null,
  }
}

export async function searchLeads({ profile, region, city, sector, maxResults }, { signal } = {}) {
  const res = await request('/search', {
    method: 'POST',
    body: { profile, region, city, sector, max_results: maxResults },
    timeoutMs: 60_000,
    signal,
  })
  const leads = Array.isArray(res?.leads) ? res.leads.map(normalizeLead) : []
  return { count: typeof res?.count === 'number' ? res.count : leads.length, leads }
}
