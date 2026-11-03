// Words and options for saved-lead tracking. The status values match the server (omnimodel/tracking.py).

export const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_interested', label: 'Not interested' },
]

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]))

/** Leads still being worked: these are the ones a follow-up reminder applies to. */
export const OPEN_STATUSES = ['new', 'contacted', 'meeting', 'proposal']

/** One-tap ways to record what you just did. `type` is the server's event type. */
export const LOG_ACTIONS = [
  { type: 'call_attempt', label: 'Called, no answer' },
  { type: 'call_answered', label: 'Spoke by phone' },
  { type: 'email_sent', label: 'Emailed' },
  { type: 'whatsapp_sent', label: 'WhatsApp sent' },
  { type: 'visit', label: 'Visited' },
  { type: 'meeting', label: 'Meeting held' },
  { type: 'proposal_sent', label: 'Proposal sent' },
]

export const LOST_REASONS = [
  { value: '', label: 'Not stated' },
  { value: 'price', label: 'Price' },
  { value: 'competitor', label: 'Chose a competitor' },
  { value: 'no_need', label: 'No need' },
  { value: 'no_budget', label: 'No budget' },
  { value: 'no_response', label: 'No response' },
  { value: 'timing', label: 'Bad timing' },
  { value: 'other', label: 'Other' },
]

const EVENT_LABEL = {
  call_attempt: 'Called, no answer',
  call_answered: 'Spoke by phone',
  email_sent: 'Email sent',
  whatsapp_sent: 'WhatsApp sent',
  visit: 'Visited',
  meeting: 'Meeting held',
  proposal_sent: 'Proposal sent',
  note: 'Note',
  won: 'Marked as won',
  lost: 'Marked as lost',
  do_not_contact_on: 'Marked do not contact',
  do_not_contact_off: 'Do not contact removed',
}

/** A short line for one history entry. */
export function describeEvent(event) {
  if (event.type === 'status_change') {
    const from = STATUS_LABEL[event.detail?.from] || event.detail?.from
    const to = STATUS_LABEL[event.detail?.to] || event.detail?.to
    return `Status: ${from} to ${to}${event.detail?.auto ? ' (automatic)' : ''}`
  }
  return EVENT_LABEL[event.type] || event.type
}

/** { at, overdue } for a lead's follow-up reminder, or null when none is set. */
export function followUpOf(tracked, now = Date.now()) {
  if (!tracked?.next_follow_up_at || !OPEN_STATUSES.includes(tracked.status)) return null
  const at = Date.parse(tracked.next_follow_up_at)
  return Number.isFinite(at) ? { at, overdue: at <= now } : null
}

export function formatDay(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** The yyyy-mm-dd of a date input becomes 9:00 that morning, local time, as an ISO string for the server. */
export function dateToIso(yyyyMmDd) {
  const d = new Date(`${yyyyMmDd}T09:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export function todayInputValue() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** What to tell the person when a tracking request failed. `error` is the plain object kept in Redux. */
export function trackingErrorMessage(error) {
  if (!error) return ''
  if (error.kind === 'network' || error.kind === 'timeout') return 'Could not reach the server. Check your connection and try again.'
  if (error.kind === 'auth') return 'Your sign-in has expired. Sign in again to keep tracking leads.'
  if (error.kind === 'config') return error.detail || 'Tracking is not available on the server right now.'
  return error.detail || 'Something went wrong. Please try again.'
}