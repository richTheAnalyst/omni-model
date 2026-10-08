import { createSelector } from '@reduxjs/toolkit'

export const draftKey = (leadId, kind) => `${leadId}::${kind}`

export const selectProfileId = (state) => state.profiles.selectedId
export const selectActiveProfile = (state) => state.profiles.byId[state.profiles.selectedId] || null
export const selectLeadEntities = (state) => state.leads.entities
export const selectLeadById = (state, id) => state.leads.entities[id]
export const selectResultIds = (state) => state.search.resultIds
export const selectDncById = (state) => state.dnc.byId
export const selectDrafts = (state) => state.outreach.drafts

/** Leads of the latest search, in the order the server returned them. */
export const selectResultLeads = createSelector([selectResultIds, selectLeadEntities], (ids, entities) =>
  ids.map((id) => entities[id]).filter(Boolean),
)

/** Sender details exactly as the user typed them in Settings. */
export const selectBusiness = (state) => state.settings.business

/** Business details as they were when a draft was generated. */
export const selectBusinessSnapshot = (state, leadId, kind) => {
  const draft = state.outreach.drafts[`${leadId}::${kind}`]
  return draft?.businessSnapshot || null
}

/** Outreach is signed by the user, so name, email, phone and service are required. */
export const selectBusinessComplete = createSelector([selectBusiness], (b) =>
  Boolean(b.our_name.trim() && b.our_email.trim() && b.our_phone.trim() && b.service.trim()),
)

/** Leads that have at least one draft, newest first. */
export const selectDraftSummaries = createSelector([selectDrafts], (drafts) => {
  const byLead = new Map()
  for (const draft of Object.values(drafts)) {
    const entry = byLead.get(draft.leadId) || { leadId: draft.leadId, kinds: [], at: 0 }
    entry.kinds.push(draft.kind)
    entry.at = Math.max(entry.at, draft.generatedAt)
    byLead.set(draft.leadId, entry)
  }
  return [...byLead.values()].sort((a, b) => b.at - a.at)
})
