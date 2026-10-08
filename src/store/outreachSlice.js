import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { serializeError } from '../api/client.js'
import { createOutreach } from '../api/outreach.js'
import { localDataCleared } from './actions.js'
import { pickPersisted } from './persist.js'
import { draftKey, selectBusiness, selectBusinessComplete } from './selectors.js'
import { buildOfferingsFromServices } from '../config/profile.js'

const persisted = pickPersisted('outreach')

const initialState = {
  // drafts[key] = { leadId, kind, offering, text, generatedText, generatedAt }
  drafts: persisted.drafts && typeof persisted.drafts === 'object' ? persisted.drafts : {},
  // statusByKey[key] = { status: 'loading' | 'error', error }
  statusByKey: {},
}

export const generateDraft = createAsyncThunk(
  'outreach/generate',
  async ({ leadId, kind, offering }, { getState, signal, rejectWithValue }) => {
    const state = getState()
    const lead = state.leads.entities[leadId]
    const business = selectBusiness(state)
    const baseProfile = state.profiles.byId[state.profiles.selectedId]
    if (!baseProfile) {
      return rejectWithValue({
        kind: 'config',
        status: 503,
        detail: 'The business profile is not loaded yet. Reload the page.',
      })
    }
    const dynamicOfferings = buildOfferingsFromServices(business.service)
    const profile = {
      ...baseProfile,
      offerings: Object.keys(dynamicOfferings).length ? dynamicOfferings : baseProfile.offerings,
    }
    try {
      const res = await createOutreach(
        {
          profile,
          kind,
          offering,
          lead: {
            name: lead.name,
            ...(lead.city ? { city: lead.city } : {}),
            ...(lead.region ? { region: lead.region } : {}),
            ...(lead.sector ? { sector: lead.sector } : {}),
          },
          business: {
            our_name: business.our_name.trim(),
            our_title: business.our_title.trim(),
            our_email: business.our_email.trim(),
            our_phone: business.our_phone.trim(),
          },
        },
        { signal },
      )
      return { leadId, kind, offering, text: res.text, leadName: lead.name }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  {
    condition: ({ leadId, kind }, { getState }) => {
      const state = getState()
      const lead = state.leads.entities[leadId]
      if (!lead?.name) return false // /outreach requires a company name
      if (state.dnc.byId[leadId]) return false // Do not contact: no drafts
      if (!selectBusinessComplete(state)) return false // drafts must be signed by the user's own details
      return state.outreach.statusByKey[draftKey(leadId, kind)]?.status !== 'loading'
    },
  },
)

const slice = createSlice({
  name: 'outreach',
  initialState,
  reducers: {
    draftEdited(state, { payload: { leadId, kind, text } }) {
      const draft = state.drafts[draftKey(leadId, kind)]
      if (draft) draft.text = text
    },
    errorDismissed(state, { payload }) {
      delete state.statusByKey[payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateDraft.pending, (state, action) => {
        const { leadId, kind } = action.meta.arg
        state.statusByKey[draftKey(leadId, kind)] = { status: 'loading', error: null }
      })
      .addCase(generateDraft.fulfilled, (state, { payload }) => {
        const key = draftKey(payload.leadId, payload.kind)
        delete state.statusByKey[key]
        const business = state.settings.business
        state.drafts[key] = {
          leadId: payload.leadId,
          kind: payload.kind,
          offering: payload.offering,
          text: payload.text,
          generatedText: payload.text,
          generatedAt: Date.now(),
          businessSnapshot: {
            our_name: business.our_name,
            our_title: business.our_title,
            our_email: business.our_email,
            our_phone: business.our_phone,
          },
        }
      })
      .addCase(generateDraft.rejected, (state, action) => {
        const { leadId, kind } = action.meta.arg
        const key = draftKey(leadId, kind)
        if (action.meta.aborted || action.payload?.kind === 'aborted') {
          delete state.statusByKey[key]
          return
        }
        state.statusByKey[key] = { status: 'error', error: action.payload || { kind: 'unknown' } }
      })
      .addCase(localDataCleared, (state) => {
        state.drafts = {}
        state.statusByKey = {}
      })
  },
})

export const { draftEdited, errorDismissed } = slice.actions
export default slice.reducer
