import { request } from './client.js'

// None of these send the shared API key: signing up and in is how a person gets a token, and /me and /auth/logout-all
// are about the token itself. client.js adds the token when there is one.

/** Who is signed in? */
export function fetchMe() {
  return request('/me', { auth: false, timeoutMs: 30_000 })
}

/** { token, expires_at, me } */
export function loginRequest({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password }, auth: false, timeoutMs: 30_000 })
}

/** { token, expires_at, me } */
export function registerRequest({ name, email, password }) {
  return request('/auth/register', { method: 'POST', body: { name, email, password }, auth: false, timeoutMs: 30_000 })
}

/** Cancels every sign-in this account has, on every device. */
export function logoutAllRequest() {
  return request('/auth/logout-all', { method: 'POST', auth: false, timeoutMs: 30_000 })
}