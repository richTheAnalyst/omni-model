import { SCORE_BANDS } from '../config/product.js'

/** The API returns 0–1. The UI shows 0–100. Scores are never recomputed here. */
export function toPercent(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.min(1, Math.max(0, n)) * 100)
}

/** Bands are applied to the number the user actually sees. */
export function getBand(percent) {
  if (percent >= 70) return SCORE_BANDS[0]
  if (percent >= 40) return SCORE_BANDS[1]
  return SCORE_BANDS[2]
}

/** The score entry for the lead's best-fit offering (or the highest one). */
export function bestEntry(lead) {
  const scores = lead?.scores || {}
  const direct = scores[lead?.best_offering]
  if (direct) return { key: lead.best_offering, ...direct }
  let top = null
  for (const [key, value] of Object.entries(scores)) {
    if (!top || Number(value?.score) > Number(top.score)) top = { key, ...value }
  }
  return top
}

/** Offerings of a lead, in the order the API gave them, best fit first. */
export function offeringEntries(lead) {
  const entries = Object.entries(lead?.scores || {}).map(([key, value]) => ({ key, ...value }))
  return entries.sort((a, b) => {
    if (a.key === lead.best_offering) return -1
    if (b.key === lead.best_offering) return 1
    return Number(b.score) - Number(a.score)
  })
}
