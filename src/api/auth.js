// Optional accounts. If VITE_NEON_AUTH_URL is not set, the app is guest-only and none of this runs.
// The sign-in library is loaded only when it is first needed, so guests never download it.

const AUTH_URL = String(import.meta.env.VITE_NEON_AUTH_URL || '').replace(/\/+$/, '')

export const accountsEnabled = Boolean(AUTH_URL)

let clientPromise = null

export function getAuthClient() {
  if (!accountsEnabled) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@neondatabase/neon-js/auth').then((m) => m.createAuthClient(AUTH_URL))
    clientPromise.catch(() => {
      clientPromise = null // allow a retry after a failed load
    })
  }
  return clientPromise
}

// Guests never ask for a token. The account slice switches this on after a successful sign-in.
let signedIn = false
let cached = { token: null, exp: 0 }

export function markSignedIn(value) {
  signedIn = Boolean(value)
  if (!signedIn) cached = { token: null, exp: 0 }
}

function expiryOf(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number(payload.exp) * 1000 || 0
  } catch {
    return 0
  }
}

/** A token for the API, or null for guests. Tokens last about 15 minutes, so one is reused until nearly expired. */
export async function getAccessToken() {
  if (!accountsEnabled || !signedIn) return null
  if (cached.token && cached.exp - Date.now() > 60_000) return cached.token
  try {
    const client = await getAuthClient()
    const { data } = await client.token()
    let token = data?.token || null
    if (!token) {
      const session = await client.getSession()
      token = session?.data?.session?.access_token || null
    }
    cached = { token, exp: token ? expiryOf(token) : 0 }
    return token
  } catch {
    return null
  }
}