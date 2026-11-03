// Where the login token lives. Our own backend issues it (POST /auth/login or /auth/register) and it is sent with
// every request as "Authorization: Bearer <token>". It is kept in this browser's local storage until it expires or
// the person signs out. A guest has no token.

const KEY = 'omni-model:token'

// Sign-in is part of the app now: it only needs the same backend address the rest of the app already uses.
export const accountsEnabled = true

let session = read() // { token, exp } or null

function expiryOf(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number(payload.exp) * 1000 || 0
  } catch {
    return 0
  }
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (raw && typeof raw.token === 'string' && raw.exp > Date.now()) return raw
    if (raw) localStorage.removeItem(KEY) // expired or damaged
  } catch {
    /* storage blocked: the person stays signed in only until the page is closed */
  }
  return null
}

/** Remember a token the server just issued. */
export function storeSession({ token }) {
  session = { token, exp: expiryOf(token) }
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    /* ignore: the in-memory copy still works for this visit */
  }
}

/** Forget it (sign out, or the server says it is no longer good). */
export function clearSession() {
  session = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function hasSession() {
  return Boolean(getAccessToken())
}

/** The token for the API, or null for guests. An expired one is dropped. */
export function getAccessToken() {
  if (session && session.exp - Date.now() > 30_000) return session.token
  if (session) clearSession()
  return null
}