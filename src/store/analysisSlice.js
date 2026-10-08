import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { serializeError } from '../api/client.js'
import { analyzeWebsite } from '../api/analysis.js'

// statusById[leadId] = { status: 'running' | 'error', startedAt, error }
const initialState = { statusById: {} }

export const analyzeLead = createAsyncThunk(
  'analysis/run',
  async ({ leadId }, { getState, signal, rejectWithValue }) => {
    const state = getState()
    const lead = state.leads.entities[leadId]
    const profile = state.profiles.byId[state.profiles.selectedId]
    if (!profile) {
      return rejectWithValue({
        kind: 'config',
        status: 503,
        detail: 'The business profile is not loaded yet. Reload the page.',
      })
    }
    try {
      const result = await analyzeWebsite(
        {
          profile,
          url: lead.website,
          sector: lead.sector,
          region: lead.region,
          city: lead.city,
          ...(lead.name ? { name: lead.name } : {}),
          ...(lead.review_count != null ? { review_count: lead.review_count } : {}),
        },
        { signal },
      )
      return { leadId, leadName: lead.name, result }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  {
    // One analysis per lead at a time, and only for leads that have a website.
    condition: ({ leadId }, { getState }) => {
      const state = getState()
      const lead = state.leads.entities[leadId]
      return Boolean(lead?.website) && state.analysis.statusById[leadId]?.status !== 'running'
    },
  },
)

// Handles let a running analysis be cancelled from any screen.
const handles = new Map()

export const startAnalysis = (leadId) => (dispatch) => {
  const handle = dispatch(analyzeLead({ leadId }))
  handles.set(leadId, handle)
  handle.finally(() => {
    if (handles.get(leadId) === handle) handles.delete(leadId)
  })
}

export const cancelAnalysis = (leadId) => () => {
  handles.get(leadId)?.abort()
}

const slice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    errorDismissed(state, { payload }) {
      delete state.statusById[payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeLead.pending, (state, action) => {
        state.statusById[action.meta.arg.leadId] = { status: 'running', startedAt: Date.now(), error: null }
      })
      .addCase(analyzeLead.fulfilled, (state, { payload }) => {
        delete state.statusById[payload.leadId]
      })
      .addCase(analyzeLead.rejected, (state, action) => {
        const { leadId } = action.meta.arg
        if (action.meta.condition) return
        if (action.meta.aborted || action.payload?.kind === 'aborted') {
          delete state.statusById[leadId]
          return
        }
        state.statusById[leadId] = { status: 'error', startedAt: 0, error: action.payload || { kind: 'unknown' } }
      })
  },
})

export const { errorDismissed } = slice.actions
export default slice.reducer
