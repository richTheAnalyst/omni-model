// Small, versioned localStorage layer. Only a whitelist of state is saved, and
// writes are skipped unless one of the saved slices actually changed.

const KEY = 'omni-model:v1'
let cache = null

export function readPersisted() {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}')
    cache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    cache = {}
  }
  return cache
}

export function pickPersisted(slice) {
  const value = readPersisted()[slice]
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function clearPersisted() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/**
 * spec: { refs: (state) => [stable references], serialize: (state) => object }
 * serialize() only runs when one of the references changed.
 */
export function attachPersistence(store, spec) {
  let lastRefs = spec.refs(store.getState())
  let timer = null

  const write = () => {
    timer = null
    try {
      localStorage.setItem(KEY, JSON.stringify(spec.serialize(store.getState())))
    } catch {
      /* storage full or blocked: the app keeps working without persistence */
    }
  }

  store.subscribe(() => {
    const refs = spec.refs(store.getState())
    if (refs.every((r, i) => r === lastRefs[i])) return
    lastRefs = refs
    if (timer) clearTimeout(timer)
    timer = setTimeout(write, 400)
  })

  window.addEventListener('pagehide', () => {
    if (timer) {
      clearTimeout(timer)
      write()
    }
  })
}
