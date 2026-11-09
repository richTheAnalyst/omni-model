import { request } from './client.js'

/** Looks on a company's website for a contact email. Free (no AI), but it opens the site in a browser on the server, so it takes a few seconds. */
export async function findEmail(url, { signal } = {}) {
  const res = await request('/find-email', { method: 'POST', body: { url }, timeoutMs: 60_000, signal })
  const list = Array.isArray(res?.emails) ? res.emails.filter((e) => typeof e === 'string') : []
  return { email: typeof res?.email === 'string' ? res.email : null, emails: list }
}