/** Turns the text of a finished proposal into a reusable template by swapping real details for {placeholders}. */

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Matches the phrase as a whole, ignoring capitals; spaces in the phrase match any run of spaces or line breaks. */
function phraseRegex(phrase) {
  const body = escape(phrase.trim()).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![\\w])${body}(?![\\w])`, 'gi')
}

/** A phone number matches however it is spaced or dashed: 024 123 4567, 024-123-4567, +233 24 123 4567. */
function phoneRegex(phone) {
  let digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  // 0241234567 and +233 24 123 4567 are the same number: drop the leading 0 and allow a country code in front.
  const local = digits.startsWith('0')
  if (local) digits = digits.slice(1)
  const core = digits.split('').join('[\\s\\-.()]*')
  const prefix = local ? '(?:\\+?\\d{1,3}[\\s\\-.()]*)?0?[\\s\\-.()]*' : '\\+?'
  return new RegExp(`(?<![\\d])${prefix}${core}(?![\\d])`, 'g')
}

/**
 * pairs: [[phrase, placeholder]] in priority order (longer phrases first so "Acme Ltd" wins over "Acme").
 * Returns { text, counts } where counts[placeholder] is how many swaps were made.
 */
export function makeTemplate(text, { business = {}, clientName = '', clientCity = '', service = '', ownNames = [] } = {}) {
  const counts = {}
  let out = String(text || '')
  const swap = (regex, placeholder) => {
    if (!regex) return
    out = out.replace(regex, () => {
      counts[placeholder] = (counts[placeholder] || 0) + 1
      return `{${placeholder}}`
    })
  }
  const pairs = [
    [business.our_email, 'our_email'],
    ...ownNames.map((n) => [n, 'our_name']),
    [business.our_name, 'our_name'],
    [business.our_title, 'our_title'],
    [clientName, 'company'],
    [service, 'offering_label'],
    [clientCity, 'city'],
  ]
    .map(([phrase, ph]) => [String(phrase || '').trim(), ph])
    .filter(([phrase]) => phrase.length >= 2)
    .sort((a, b) => b[0].length - a[0].length)
  for (const [phrase, ph] of pairs) swap(phraseRegex(phrase), ph)
  swap(phoneRegex(String(business.our_phone || '')), 'our_phone')
  return { text: out, counts }
}