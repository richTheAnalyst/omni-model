import { request } from './client.js'
import { normalizeLead } from './leads.js'

// Saving and tracking leads needs a signed-in account. client.js adds the sign-in token, so these calls send no
// shared API key (auth: false). A guest gets a 401, which the app reports as kind "auth".

const MAX_SNAPSHOT_CHARS = 80_000 // the server refuses more than 100,000

/** The part of a lead the server keeps so the lead looks the same on any device. */
function snapshotOf(lead) {
  const analysis = lead.analysis
    ? { at: lead.analysis.at, url: lead.analysis.url, signals: lead.analysis.signals, warning: lead.analysis.warning, before: lead.analysis.before }
    : null
  const snapshot = {
    best_offering: lead.best_offering,
    scores: lead.scores,
    ownership_source: lead.ownership_source,
    ownership_reason: lead.ownership_reason,
    analysis,
  }
  if (JSON.stringify(snapshot).length > MAX_SNAPSHOT_CHARS && analysis) {
    snapshot.analysis = { at: analysis.at, url: analysis.url, warning: analysis.warning, signals: {} } // drop the bulky parts
  }
  return snapshot
}

/** A search-result lead in the shape POST /leads expects. The lead's id is the Google place id. */
export function toSaveBody(lead) {
  return {
    place_id: lead.id,
    name: lead.name,
    address: lead.address,
    city: lead.city,
    region: lead.region,
    sector: lead.sector,
    phone: lead.phone,
    website: lead.website,
    lat: lead.lat,
    lng: lead.lng,
    types: lead.types,
    rating: lead.rating,
    review_count: lead.review_count,
    ownership: lead.ownership,
    ownership_confidence: lead.ownership_confidence,
    snapshot: snapshotOf(lead),
  }
}

/** The reverse: a saved lead from the server, rebuilt into the shape the rest of the app uses (for another device). */
export function leadFromTracked(t) {
  const snap = t.snapshot && typeof t.snapshot === 'object' ? t.snapshot : {}
  const lead = normalizeLead({
    id: t.place_id,
    name: t.name,
    address: t.address,
    phone: t.phone,
    website: t.website,
    rating: t.rating,
    review_count: t.review_count,
    region: t.region,
    city: t.city,
    sector: t.sector,
    types: t.types,
    lat: t.lat,
    lng: t.lng,
    ownership: t.ownership,
    ownership_confidence: t.ownership_confidence,
    ownership_source: snap.ownership_source,
    ownership_reason: snap.ownership_reason,
    scores: snap.scores,
    best_offering: snap.best_offering,
  })
  lead.analysis = snap.analysis && typeof snap.analysis === 'object' ? snap.analysis : null
  return lead
}

const opts = (extra = {}) => ({ auth: false, ...extra })

export const fetchTracked = () => request('/leads?limit=500', opts())
export const fetchWeek = () => request('/pipeline', opts())
export const saveTrackedLead = (lead) => request('/leads', opts({ method: 'POST', body: toSaveBody(lead) }))
export const fetchTrackedDetail = (id) => request(`/leads/${encodeURIComponent(id)}`, opts())
export const patchTrackedLead = (id, patch) => request(`/leads/${encodeURIComponent(id)}`, opts({ method: 'PATCH', body: patch }))
export const deleteTrackedLead = (id) => request(`/leads/${encodeURIComponent(id)}`, opts({ method: 'DELETE' }))
export const logTrackedEvent = (id, body) => request(`/leads/${encodeURIComponent(id)}/events`, opts({ method: 'POST', body }))
export const putOutcome = (id, body) => request(`/leads/${encodeURIComponent(id)}/outcome`, opts({ method: 'PUT', body }))