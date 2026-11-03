import { request } from './client.js'

/** Who is signed in? The server creates the user and their business workspace on first sign-in. */
export function fetchMe() {
  return request('/me', { auth: false, timeoutMs: 30_000 })
}