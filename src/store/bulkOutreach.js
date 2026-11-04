import { generateDraft } from './outreachSlice.js'
import { batchFinished, batchProgress, batchStarted } from './selectionSlice.js'
import { selectActiveProfile, selectBusiness } from './selectors.js'
import { pickOffering } from '../lib/offering.js'

const CONCURRENCY = 4
let runId = 0

/** Who can be written to: has a name and is not flagged do-not-contact. */
export function eligibleIds(state, ids) {
  return ids.filter((id) => state.leads.entities[id]?.name && !state.dnc.byId[id])
}


export const cancelBulk = () => () => {
  runId += 1
}

/** Generates one draft per (lead, kind), four at a time. Failures stay on the draft's own status for retry. */
export const generateBulk = ({ leadIds, kinds }) => async (dispatch, getState) => {
  const ids = eligibleIds(getState(), leadIds)
  const jobs = ids.flatMap((leadId) => kinds.map((kind) => ({ leadId, kind })))
  const mine = ++runId
  dispatch(batchStarted({ leadIds: ids, kinds, total: jobs.length }))
  let next = 0
  const worker = async () => {
    while (mine === runId) {
      const job = jobs[next++]
      if (!job) return
      const state = getState()
      const lead = state.leads.entities[job.leadId]
      const offering = pickOffering(selectActiveProfile(state), selectBusiness(state), lead)
      await dispatch(generateDraft({ ...job, offering }))
      if (mine === runId) dispatch(batchProgress())
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))
  if (mine === runId) dispatch(batchFinished())
}

/** Retry one draft from the review page. */
export const retryOne = (leadId, kind) => (dispatch, getState) => {
  const state = getState()
  const offering = pickOffering(selectActiveProfile(state), selectBusiness(state), state.leads.entities[leadId])
  return dispatch(generateDraft({ leadId, kind, offering }))
}