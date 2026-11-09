import { findEmail } from '../api/findEmail.js'
import { serializeError } from '../api/client.js'
import { emailFound } from './leadsSlice.js'
import { saveToTracking } from './trackingSlice.js'

const PARALLEL = 2 // each lookup opens a browser on the server
let active = 0
const waiting = []
const gate = () => (active < PARALLEL ? (active += 1, Promise.resolve()) : new Promise((r) => waiting.push(r)))
const release = () => {
  const next = waiting.shift()
  if (next) next()
  else active -= 1
}

/** Finds and keeps one company's email. Resolves to { status: 'found' | 'none' | 'error', email, detail }. */
export const findLeadEmail = (leadId) => async (dispatch, getState) => {
  const lead = getState().leads.entities[leadId]
  if (!lead?.website) return { status: 'none', email: null }
  await gate()
  try {
    const { email } = await findEmail(lead.website)
    if (!email) return { status: 'none', email: null }
    dispatch(emailFound({ id: leadId, email }))
    // A saved company keeps it on the server too, so it is there on your other devices and in the send panel.
    if (getState().tracking.byPlaceId[leadId]) dispatch(saveToTracking(getState().leads.entities[leadId]))
    return { status: 'found', email }
  } catch (err) {
    const plain = serializeError(err)
    return { status: 'error', email: null, detail: plain.detail || '' }
  } finally {
    release()
  }
}

/** Looks up several at once, two at a time. Resolves to { found, none, failed }. */
export const findMissingEmails = (leadIds) => async (dispatch) => {
  const out = await Promise.all(leadIds.map((id) => dispatch(findLeadEmail(id))))
  return {
    found: out.filter((o) => o.status === 'found').length,
    none: out.filter((o) => o.status === 'none').length,
    failed: out.filter((o) => o.status === 'error').length,
  }
}