import { request } from './client.js'

export const EXPORT_MAX_CHARS = 50_000

/** Returns the file as a Blob. Saving it is lib/download.js's job. */
export function exportDraft({ text, format, title, filename }, { signal } = {}) {
  return request('/export', {
    method: 'POST',
    body: { text, format, title, filename },
    timeoutMs: 60_000,
    signal,
    responseType: 'blob',
  })
}
