import { createSlice } from '@reduxjs/toolkit'
import { localDataCleared } from './actions.js'

// The person's own changes to the wording of their designed proposal, per company: { [leadId]: { [page]: { [line]: text } } }.
// Kept in memory only: they belong to the proposal being prepared right now.
const slice = createSlice({
  name: 'designEdits',
  initialState: { byLead: {} },
  reducers: {
    lineEdited(state, { payload: { leadId, page, line, text } }) {
      const pages = (state.byLead[leadId] ||= {})
      ;(pages[page] ||= {})[line] = text
    },
    lineReset(state, { payload: { leadId, page, line } }) {
      const pages = state.byLead[leadId]
      if (!pages?.[page]) return
      delete pages[page][line]
      if (!Object.keys(pages[page]).length) delete pages[page]
    },
    leadReset(state, { payload }) {
      delete state.byLead[payload]
    },
  },
  extraReducers: (builder) => {
    builder.addCase(localDataCleared, (state) => {
      state.byLead = {}
    })
  },
})

export const { lineEdited, lineReset, leadReset } = slice.actions
export default slice.reducer