import { configureStore } from '@reduxjs/toolkit'
import activity from './activitySlice.js'
import analysis from './analysisSlice.js'
import dnc from './dncSlice.js'
import leads from './leadsSlice.js'
import outreach from './outreachSlice.js'
import { attachPersistence } from './persist.js'
import profiles from './profilesSlice.js'
import search from './searchSlice.js'
import settings from './settingsSlice.js'

export const store = configureStore({
  reducer: { profiles, search, leads, analysis, outreach, dnc, settings, activity },
})

const KEEP_RECENT_LEADS = 80

/** Persist current results, drafts and flagged leads, plus a bounded recent history. */
function leadsToPersist(state) {
  const keep = new Set(state.search.resultIds)
  for (const draft of Object.values(state.outreach.drafts)) keep.add(draft.leadId)
  for (const id of Object.keys(state.dnc.byId)) keep.add(id)
  for (const id of state.leads.ids.slice(-KEEP_RECENT_LEADS)) keep.add(id)
  const ids = state.leads.ids.filter((id) => keep.has(id))
  const entities = {}
  for (const id of ids) entities[id] = state.leads.entities[id]
  return { ids, entities }
}

attachPersistence(store, {
  refs: (s) => [
    s.profiles.selectedId,
    s.search.form,
    s.search.lastQuery,
    s.search.resultIds,
    s.leads,
    s.outreach.drafts,
    s.dnc.byId,
    s.settings,
    s.activity.items,
  ],
  serialize: (s) => ({
    profiles: { selectedId: s.profiles.selectedId },
    search: { form: s.search.form, lastQuery: s.search.lastQuery, resultIds: s.search.resultIds },
    leads: leadsToPersist(s),
    outreach: { drafts: s.outreach.drafts },
    dnc: { byId: s.dnc.byId },
    settings: { businessDetails: s.settings.business, welcomeSeen: s.settings.welcomeSeen },
    activity: { items: s.activity.items },
  }),
})
