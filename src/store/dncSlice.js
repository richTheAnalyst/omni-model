import { createSlice } from '@reduxjs/toolkit'
import { pickPersisted } from './persist.js'

const persisted = pickPersisted('dnc')

// Frontend-only. The API has no concept of this flag and does not enforce it.
// byId[leadId] = { name, at }
const slice = createSlice({
  name: 'dnc',
  initialState: {
    byId: persisted.byId && typeof persisted.byId === 'object' ? persisted.byId : {},
  },
  reducers: {
    markedDoNotContact(state, { payload: { id, name } }) {
      state.byId[id] = { name: name || 'Unnamed business', at: Date.now() }
    },
    clearedDoNotContact(state, { payload }) {
      delete state.byId[payload]
    },
  },
})

export const { markedDoNotContact, clearedDoNotContact } = slice.actions
export default slice.reducer
