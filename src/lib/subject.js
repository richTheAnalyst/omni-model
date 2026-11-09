/** A first suggestion for the subject line and the covering note, so nobody starts from a blank box. Both stay editable. */
const clean = (s) => String(s || '').trim()

export function suggestSubject({ kind, company, offering, ourName }) {
  const c = clean(company)
  const o = clean(offering)
  const me = clean(ourName)
  if (kind === 'proposal') return [`Proposal for ${c || 'your company'}`, o ? `: ${o}` : '', me ? ` from ${me}` : ''].join('')
  if (kind === 'followup') return `Following up${o ? ` on ${o}` : ''}${c ? ` for ${c}` : ''}`
  return me ? `Introducing ${me}${c ? ` to ${c}` : ''}` : `Introduction${c ? ` for ${c}` : ''}`
}

/** The short email that goes with an attached proposal. */
export function coverNote({ company, offering, business }) {
  const c = clean(company)
  const o = clean(offering)
  const me = business || {}
  const contact = [clean(me.our_phone), clean(me.our_email)].filter(Boolean).join(' | ')
  const lines = [
    `Dear ${c ? `${c} team` : 'Sir or Madam'},`,
    '',
    `Please find our proposal attached${o ? ` for ${o}` : ''}. It sets out what we would do for ${c || 'you'}, how we work and how to reach us.`,
    '',
    `I would be glad to talk it through at a time that suits you. Just reply to this email${clean(me.our_phone) ? ` or call ${clean(me.our_phone)}` : ''}.`,
    '',
    'Kind regards,',
    clean(me.our_title) || clean(me.our_name),
    clean(me.our_title) && clean(me.our_name) ? clean(me.our_name) : '',
    contact,
  ]
  return lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n').replace(/\n{3,}/g, '\n\n').trim()
}