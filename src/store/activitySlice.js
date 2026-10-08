import { createSlice, nanoid } from '@reduxjs/toolkit'
import { analyzeLead } from './analysisSlice.js'
import { exportLogged, localDataCleared } from './actions.js'
import { generateDraft } from './outreachSlice.js'
import { pickPersisted } from './persist.js'
import { runSearch } from './searchSlice.js'

const persisted = pickPersisted('activity')
const MAX_ITEMS = 40

// A local log of what happened on this device. The server keeps no history.
const slice = createSlice({
  name: 'activity',
  initialState: { items: Array.isArray(persisted.items) ? persisted.items : [] },
  reducers: {
    activityCleared(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    const push = (state, entry) => {
      state.items.unshift({ id: nanoid(8), at: Date.now(), ...entry })
      if (state.items.length > MAX_ITEMS) state.items.length = MAX_ITEMS
    }
    builder
      .addCase(runSearch.fulfilled, (state, { payload }) => {
        const { params } = payload
        push(state, {
          type: 'search',
          profileId: params.profileId,
          region: params.region,
          city: params.city,
          sector: params.sector,
          maxResults: params.maxResults,
          count: payload.count,
        })
      })
      .addCase(analyzeLead.fulfilled, (state, { payload }) => {
        push(state, {
          type: 'analysis',
          leadId: payload.leadId,
          name: payload.leadName,
          partial: Boolean(payload.result.warning),
        })
      })
      .addCase(generateDraft.fulfilled, (state, { payload }) => {
        push(state, { type: 'draft', leadId: payload.leadId, name: payload.leadName, kind: payload.kind })
      })
      .addCase(exportLogged, (state, { payload }) => {
        push(state, { type: 'export', ...payload })
      })
      .addCase(localDataCleared, (state) => {
        state.items = []
      })
  },
})

export const { activityCleared } = slice.actions
export default slice.reducer
