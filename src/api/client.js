// The only place in the app that calls fetch(). Everything else goes through
// the service modules in this folder.

const BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_API_KEY || ''

export const isConfigured = Boolean(BASE && KEY)

export class ApiError extends Error {
  constructor({ kind, status = 0, detail = '' }) {
    super(detail || kind)
    this.name = 'ApiError'
    this.kind = kind // network | timeout | aborted | auth | notfound | validation | request | upstream | config | server | http | empty
    this.status = status
    this.detail = detail
  }
}

/** Turns any thrown value into a plain object that is safe to keep in Redux. */
export function serializeError(err) {
  if (err instanceof ApiError) return { kind: err.kind, status: err.status, detail: err.detail }
  if (err?.name === 'AbortError') return { kind: 'aborted', status: 0, detail: '' }
  return { kind: 'unknown', status: 0, detail: err?.message || '' }
}

function kindForStatus(status) {
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'notfound'
  if (status === 422) return 'validation'
  if (status === 502) return 'upstream'
  if (status === 503) return 'config'
  return status >= 500 ? 'server' : 'http'
}

async function toHttpError(res) {
  let detail = ''
  let kind = kindForStatus(res.status)
  try {
    const body = await res.json()
    const d = body?.detail
    if (typeof d === 'string') {
      detail = d.slice(0, 400)
    } else if (Array.isArray(d)) {
      // Request-shape errors are a bug in our request, not something to show raw.
      kind = 'request'
      console.warn('[Omni Model] Request shape rejected by the API:', d)
    }
  } catch {
    /* body was not JSON */
  }
  return new ApiError({ kind, status: res.status, detail })
}

const inflight = new Map()

async function execute(path, { method, body, timeoutMs, signal, auth, responseType }) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer)
      throw new ApiError({ kind: 'aborted' })
    }
    signal.addEventListener('abort', forwardAbort, { once: true })
  }

  try {
    const headers = {}
    if (auth) headers['X-API-Key'] = KEY
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!res.ok) throw await toHttpError(res)
    return responseType === 'blob' ? await res.blob() : await res.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (timedOut) throw new ApiError({ kind: 'timeout' })
    if (signal?.aborted || err?.name === 'AbortError') throw new ApiError({ kind: 'aborted' })
    // fetch() rejects with a TypeError for offline, DNS failure and blocked CORS alike.
    throw new ApiError({ kind: 'network', detail: err?.message || '' })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/**
 * request('/path', { method, body, timeoutMs, signal, auth, responseType })
 * Identical GET requests that are already in flight share one network call.
 */
export function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    timeoutMs = 30_000,
    signal,
    auth = true,
    responseType = 'json',
  } = options

  const shareable = method === 'GET' && !signal
  const key = `${method} ${path}`
  if (shareable && inflight.has(key)) return inflight.get(key)

  const promise = execute(path, { method, body, timeoutMs, signal, auth, responseType })
  if (shareable) {
    inflight.set(key, promise)
    promise.finally(() => inflight.delete(key)).catch(() => {})
  }
  return promise
}
