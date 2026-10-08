import { createSlice } from '@reduxjs/toolkit'
import { pickPersisted } from './persist.js'

const persisted = pickPersisted('settings')

export const BUSINESS_FIELDS = ['our_name', 'our_email', 'our_phone', 'service', 'our_title']

function cleanBusiness(raw) {
  const out = {}
  for (const key of BUSINESS_FIELDS) out[key] = typeof raw?.[key] === 'string' ? raw[key] : ''
  return out
}

const slice = createSlice({
  name: 'settings',
  initialState: {
    // Typed by the user in Settings. Nothing here comes from the API.
    business: cleanBusiness(persisted.businessDetails),
    welcomeSeen: persisted.welcomeSeen === true,
  },
  reducers: {
    businessSaved(state, { payload }) {
      state.business = cleanBusiness(payload)
    },
    welcomeSeen(state) {
      state.welcomeSeen = true
    },
  },
})

export const { businessSaved, welcomeSeen } = slice.actions
export default slice.reducer
