import { createSlice } from '@reduxjs/toolkit'
import { localDataCleared } from './actions.js'
import { pickPersisted } from './persist.js'
import { analyzeLead } from './analysisSlice.js'
import { runSearch } from './searchSlice.js'

const persisted = pickPersisted('leads')

// Leads are stored once, by id (the Google place id). Search results, drafts and
// flags all refer to them by id instead of copying them.
const initialState = {
  ids: Array.isArray(persisted.ids) ? persisted.ids : [],
  entities: persisted.entities && typeof persisted.entities === 'object' ? persisted.entities : {},
}

const slice = createSlice({
  name: 'leads',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(runSearch.fulfilled, (state, { payload }) => {
        for (const incoming of payload.leads) {
          const existing = state.entities[incoming.id]
          if (!existing) {
            state.entities[incoming.id] = incoming
            state.ids.push(incoming.id)
            continue
          }
          // Refresh contact details but never throw away a website analysis.
          const keepScores = Boolean(existing.analysis)
          state.entities[incoming.id] = {
            ...incoming,
            analysis: existing.analysis,
            scores: keepScores ? existing.scores : incoming.scores,
            best_offering: keepScores ? existing.best_offering : incoming.best_offering,
          }
        }
      })
      .addCase(localDataCleared, (state) => {
        state.ids = []
        state.entities = {}
      })
      .addCase(analyzeLead.fulfilled, (state, { payload }) => {
        const lead = state.entities[payload.leadId]
        if (!lead) return
        const { result } = payload
        lead.analysis = {
          at: Date.now(),
          url: result.url,
          signals: result.signals,
          warning: result.warning,
          // The very first (estimated) scores are kept so before/after stays visible.
          before: lead.analysis?.before ?? { best_offering: lead.best_offering, scores: lead.scores },
        }
        if (Object.keys(result.scores).length > 0) {
          lead.scores = result.scores
          lead.best_offering = result.best_offering in result.scores ? result.best_offering : lead.best_offering
        }
      })
  },
})

export default slice.reducer
