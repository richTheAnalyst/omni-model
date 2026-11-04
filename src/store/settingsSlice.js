import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { pickPersisted } from './persist.js'
import { suggestFit as suggestFitApi } from '../api/fit.js'
import { buildRequestProfile } from '../config/profile.js'

const persisted = pickPersisted('settings')

export const BUSINESS_FIELDS = ['our_name', 'our_email', 'our_phone', 'service', 'our_title']

function cleanBusiness(raw) {
  const out = {}
  for (const key of BUSINESS_FIELDS) out[key] = typeof raw?.[key] === 'string' ? raw[key] : ''
  return out
}

// "How you sell": the words and drafts that make the profile this business's own. Empty means "use the neutral default".
export const PLAYBOOK_FIELDS = ['signal_words', 'competitor_kind', 'email', 'proposal', 'followup']

function cleanPlaybook(raw) {
  const out = {}
  for (const key of PLAYBOOK_FIELDS) out[key] = typeof raw?.[key] === 'string' ? raw[key] : ''
  return out
}

/** Ask the AI to suggest offering fit scores for each industry, then store
 * them in the profile so /search returns meaningful best-fit results.
 * Called once when the user saves or changes their services. */
export const runSuggestFit = createAsyncThunk(
  'settings/suggestFit',
  async ({ profile, sectors }, { getState, signal, rejectWithValue }) => {
    const stored = profile || getState().profiles.byId[getState().profiles.selectedId]
    if (!stored) {
      return rejectWithValue({ kind: 'config', status: 503, detail: 'No business profile loaded yet. Reload the page.' })
    }
    // Rate the services this business really sells (from Settings), not the neutral placeholder service.
    const baseProfile = buildRequestProfile(stored, { business: getState().settings.business, playbook: getState().settings.playbook })
    const sectorKeys = sectors || Object.keys(baseProfile.sectors || {})
    try {
      const res = await suggestFitApi({ profile: baseProfile, sectors: sectorKeys }, { signal })
      return res
    } catch (err) {
      return rejectWithValue({ kind: err.kind, status: err.status, detail: err.detail })
    }
  },
)

const slice = createSlice({
  name: 'settings',
  initialState: {
    business: cleanBusiness(persisted.businessDetails),
    playbook: cleanPlaybook(persisted.playbook),
    welcomeSeen: persisted.welcomeSeen === true,
    fitScores: persisted.fitScores || {},
    fitStatus: 'idle', // idle | loading | succeeded | failed
    fitError: null,
    fitFilled: 0,
  },
  reducers: {
    businessSaved(state, { payload }) {
      const next = cleanBusiness(payload)
      // Fit ratings belong to the services they were made for. A different service list means rating again.
      if (next.service.trim() !== state.business.service.trim()) state.fitScores = {}
      state.business = next
    },
    playbookSaved(state, { payload }) {
      state.playbook = cleanPlaybook(payload)
    },
    setFitScores(state, { payload }) {
      state.fitScores = { ...state.fitScores, ...payload }
    },
    welcomeSeen(state) {
      state.welcomeSeen = true
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSuggestFit.pending, (state) => {
        state.fitStatus = 'loading'
        state.fitError = null
      })
      .addCase(runSuggestFit.fulfilled, (state, { payload }) => {
        state.fitStatus = 'succeeded'
        state.fitFilled = payload.filled
        // Merge AI-suggested fit scores into the profile's sectors
        for (const [sectorKey, offeringScores] of Object.entries(payload.fit || {})) {
          state.fitScores[sectorKey] = offeringScores
        }
      })
      .addCase(runSuggestFit.rejected, (state, { payload }) => {
        state.fitStatus = 'failed'
        state.fitError = payload
      })
  },
})

export const { businessSaved, playbookSaved, setFitScores, welcomeSeen } = slice.actions
export default slice.reducer