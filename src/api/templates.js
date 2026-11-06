import { request } from './client.js'

export const MAX_PDF_BYTES = 5 * 1024 * 1024

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
}

/** Sends a proposal PDF to the server and gets its text back: { text, pages, truncated }. */
export async function readProposalPdf(file, { signal } = {}) {
  const res = await request('/templates/from-pdf', {
    method: 'POST',
    body: { filename: file.name.slice(0, 120), data: await toBase64(file) },
    timeoutMs: 60_000,
    signal,
  })
  return { text: typeof res?.text === 'string' ? res.text : '', pages: res?.pages || 0, truncated: Boolean(res?.truncated) }
}