import { createSlice } from '@reduxjs/toolkit'
import { localDataCleared } from './actions.js'

// Leads ticked on the Leads page, and the batch being generated. Kept in memory only.
const slice = createSlice({
  name: 'selection',
  initialState: { ids: [], batch: null },
  reducers: {
    toggled(state, { payload }) {
      const i = state.ids.indexOf(payload)
      if (i >= 0) state.ids.splice(i, 1)
      else state.ids.push(payload)
    },
    added(state, { payload }) {
      for (const id of payload) if (!state.ids.includes(id)) state.ids.push(id)
    },
    removed(state, { payload }) {
      const drop = new Set(payload)
      state.ids = state.ids.filter((id) => !drop.has(id))
    },
    cleared(state) {
      state.ids = []
    },
    // batch = { leadIds, kinds, total, done, running }
    batchStarted(state, { payload }) {
      state.batch = { ...payload, done: 0, running: true }
    },
    batchProgress(state) {
      if (state.batch) state.batch.done += 1
    },
    batchFinished(state) {
      if (state.batch) state.batch.running = false
    },
    batchDiscarded(state) {
      state.batch = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(localDataCleared, (state) => {
      state.ids = []
      state.batch = null
    })
  },
})

export const { toggled, added, removed, cleared, batchStarted, batchProgress, batchFinished, batchDiscarded } = slice.actions
export default slice.reducer