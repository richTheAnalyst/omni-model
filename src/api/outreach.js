import { request } from './client.js'

export async function createOutreach({ profile, kind, offering, lead, business }, { signal } = {}) {
  const res = await request('/outreach', {
    method: 'POST',
    body: { profile, kind, offering, lead, business },
    timeoutMs: 45_000,
    signal,
  })
  return { kind: res?.kind || kind, text: typeof res?.text === 'string' ? res.text : '' }
}
