import { ApiError, request } from './client.js'

// Every /analyze call runs a browser and a paid LLM on the server, so only a
// couple may run at once. The rest wait in line.
const MAX_PARALLEL = 2
let active = 0
const waiting = []

function start(entry) {
  active += 1
  entry.resolve()
}

function acquire(signal) {
  return new Promise((resolve, reject) => {
    const entry = { resolve, reject }
    if (active < MAX_PARALLEL) return start(entry)
    waiting.push(entry)
    signal?.addEventListener(
      'abort',
      () => {
        const i = waiting.indexOf(entry)
        if (i >= 0) {
          waiting.splice(i, 1)
          reject(new ApiError({ kind: 'aborted' }))
        }
      },
      { once: true },
    )
  })
}

function release() {
  active -= 1
  const next = waiting.shift()
  if (next) start(next)
}

export const ANALYSIS_TIMEOUT_MS = 90_000

export async function analyzeWebsite(payload, { signal } = {}) {
  await acquire(signal)
  try {
    const res = await request('/analyze', {
      method: 'POST',
      body: payload,
      timeoutMs: ANALYSIS_TIMEOUT_MS,
      signal,
    })
    return {
      url: res?.url || payload.url,
      signals: res?.signals && typeof res.signals === 'object' ? res.signals : {},
      best_offering: res?.best_offering || '',
      scores: res?.scores && typeof res.scores === 'object' ? res.scores : {},
      warning: typeof res?.warning === 'string' ? res.warning : '',
    }
  } finally {
    release()
  }
}
