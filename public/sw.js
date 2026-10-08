// Omni Model service worker. In development (?mode=development) every
// request passes through so Vite's HMR keeps working. In production the
// app shell and content-hashed assets are cached for offline use; API
// traffic always goes to the network because it is live data.
const MODE = new URL(self.location.href).searchParams.get('mode') || 'production'
const SHELL = 'omni-shell-v1'
const RUNTIME = 'omni-runtime-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.map((name) => (name === SHELL || name === RUNTIME ? null : caches.delete(name)))),
      )
      .then(() => self.clients.claim()),
  )
})

if (MODE === 'development') {
  self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request))
  })
} else {
  self.addEventListener('fetch', (event) => {
    const { request } = event
    if (request.method !== 'GET') return
    const url = new URL(request.url)
    if (url.origin !== self.location.origin) return // API calls: network only

    if (request.mode === 'navigate') {
      // App shell: network first, fall back to the cached shell offline.
      event.respondWith(
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(SHELL).then((cache) => cache.put('/', copy))
            return res
          })
          .catch(() => caches.match('/')),
      )
      return
    }

    // Static assets are content-hashed: cache first, refresh in the background.
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request)
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || fresh
      }),
    )
  })
}
