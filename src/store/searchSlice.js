import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { serializeError } from '../api/client.js'
import { searchLeads } from '../api/leads.js'
import { DEFAULT_COUNTRY } from '../config/markets.js'
import { cityKey, normalizeRegion, normalizeSector } from '../lib/format.js'
import { localDataCleared } from './actions.js'
import { pickPersisted } from './persist.js'
import { selectProfile } from './profilesSlice.js'
import { profileWithSector } from '../config/profile.js'

const persisted = pickPersisted('search')

const emptyForm = { country: DEFAULT_COUNTRY, region: '', city: '', sector: '', maxResults: 10 }

const initialState = {
  form: { ...emptyForm, ...(persisted.form || {}) },
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  pending: null, // the params of the search currently running
  lastQuery: persisted.lastQuery || null,
  resultIds: Array.isArray(persisted.resultIds) ? persisted.resultIds : [],
}

export function queryKey(p) {
  return [p.profileId, p.region, cityKey(p.city), p.sector, p.maxResults].join('|')
}

const REUSE_WINDOW_MS = 60_000

export const runSearch = createAsyncThunk(
  'search/run',
  async (params, { getState, signal, rejectWithValue }) => {
    try {
      const baseProfile = getState().profiles.byId[params.profileId]
      if (!baseProfile) {
        return rejectWithValue({
          kind: 'config',
          status: 503,
          detail: 'The business profile is not loaded yet. Reload the page.',
        })
      }
      const sectorKey = normalizeSector(params.sector)
      const profile = profileWithSector(baseProfile, params.sector, sectorKey)
      const res = await searchLeads(
        {
          profile,
          region: normalizeRegion(params.region),
          city: params.city.trim(),
          sector: sectorKey,
          maxResults: params.maxResults,
        },
        { signal },
      )
      return { params, ...res }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  { condition: (_, { getState }) => getState().search.status !== 'loading' },
)

/**
 * Starts a search unless the same one just finished (the server also caches
 * repeats, but there is no reason to spend a call). Returns what happened.
 */
export const startSearch = (params) => (dispatch, getState) => {
  const { lastQuery, status, resultIds } = getState().search
  if (status === 'loading') return 'busy'
  if (
    lastQuery &&
    resultIds.length > 0 &&
    lastQuery.key === queryKey(params) &&
    Date.now() - lastQuery.at < REUSE_WINDOW_MS
  ) {
    return 'reused'
  }
  dispatch(runSearch(params))
  return 'started'
}

const slice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    formChanged(state, { payload }) {
      state.form = { ...state.form, ...payload }
    },
    formReset(state) {
      state.form = { ...emptyForm }
    },
    resultsCleared(state) {
      state.status = 'idle'
      state.error = null
      state.resultIds = []
      state.lastQuery = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSearch.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.pending = action.meta.arg
      })
      .addCase(runSearch.fulfilled, (state, { payload }) => {
        state.status = 'succeeded'
        state.pending = null
        state.resultIds = payload.leads.map((l) => l.id)
        state.lastQuery = {
          ...payload.params,
          key: queryKey(payload.params),
          count: payload.count,
          at: Date.now(),
        }
      })
      .addCase(runSearch.rejected, (state, action) => {
        state.pending = null
        if (action.meta.aborted) {
          state.status = 'idle'
          return
        }
        if (action.meta.condition) return // blocked as a duplicate; keep current state
        state.status = 'failed'
        state.error = action.payload || { kind: 'unknown' }
      })
      .addCase(localDataCleared, (state) => {
        state.status = 'idle'
        state.error = null
        state.resultIds = []
        state.lastQuery = null
      })
      // A different business profile means different regions, industries and offerings.
      .addCase(selectProfile.fulfilled, (state) => {
        state.form = { ...emptyForm }
        state.status = 'idle'
        state.error = null
        state.resultIds = []
        state.lastQuery = null
      })
  },
})

export const { formChanged, formReset, resultsCleared } = slice.actions
export default slice.reducer
