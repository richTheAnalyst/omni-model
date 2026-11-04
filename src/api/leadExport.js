import { request } from './client.js'

// Asks the server for an Excel file of saved leads. Needs a signed-in account (client.js adds the token), so no API key.
// body: { scope: 'all' | 'lead' | 'week', lead_id?, status?, week_start? ('YYYY-MM-DD'), tz_offset_minutes, profile? }
// Returns the file as a Blob; saving it is lib/download.js's job.
export function exportLeadsXlsx(body, { signal } = {}) {
  return request('/exports/leads', { method: 'POST', body, auth: false, timeoutMs: 120_000, signal, responseType: 'blob' })
}