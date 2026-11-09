/** The address to prefill when emailing a company: the one on the lead, else the one saved with it. Empty if there is none. */
export const EMAIL_PATTERN = /^[^\s@<>",;]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/

export const isEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim())

export function leadEmail(lead, tracked) {
  for (const candidate of [lead?.email, tracked?.email]) {
    if (isEmail(candidate)) return String(candidate).trim()
  }
  return ''
}