import { request } from './client.js'

// /suggest-fit asks the AI how well each offering suits each industry.
// Takes 5-20 seconds (one model call per ~10 industries). Call it once when
// the user saves or changes their services, then store the result in the
// profile's sectors[industry].fit so /search returns meaningful best-fit scores.
export async function suggestFit(payload, { signal } = {}) {
  const res = await request('/suggest-fit', {
    method: 'POST',
    body: payload,
    timeoutMs: 60_000,
    signal,
  })
  return {
    fit: res?.fit && typeof res.fit === 'object' ? res.fit : {},
    filled: Number(res?.filled) || 0,
    warnings: Array.isArray(res?.warnings) ? res.warnings : [],
  }
}