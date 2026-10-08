import { ApiError, request } from './client.js'

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError({ kind: 'aborted' }))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new ApiError({ kind: 'aborted' }))
      },
      { once: true },
    )
  })
}

const SLOW_DEADLINE_MS = 120_000 // sleeping server: timeouts and 5xx while it boots
const NETWORK_DEADLINE_MS = 45_000 // a booting host often answers without CORS headers

/**
 * Calls GET /health until the workspace answers. A sleeping Render server can
 * take 50+ seconds, so transient failures are retried for a while. Network
 * errors give up sooner, because a persistent one usually means CORS or offline.
 */
export async function wakeWorkspace({ signal } = {}) {
  const startedAt = Date.now()
  for (;;) {
    try {
      await request('/health', { auth: false, timeoutMs: 60_000, signal })
      return
    } catch (err) {
      if (err.kind === 'aborted') throw err
      const elapsed = Date.now() - startedAt
      const limit = err.kind === 'network' ? NETWORK_DEADLINE_MS : SLOW_DEADLINE_MS
      const retryable = err.kind === 'network' || err.kind === 'timeout' || err.status >= 500
      if (!retryable || elapsed > limit) throw err
      await sleep(3000, signal)
    }
  }
}
