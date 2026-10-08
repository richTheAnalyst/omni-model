import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { serializeError } from '../api/client.js'
import { wakeWorkspace } from '../api/health.js'
import { fetchProfile, fetchProfileIds, minimalProfile } from '../api/profiles.js'
import { pickPersisted } from './persist.js'

const persisted = pickPersisted('profiles')

const initialState = {
  // idle -> waking (health) -> profiles (loading) -> ready | error
  phase: 'idle',
  error: null,
  ids: [],
  byId: {}, // cached profile details, kept for the session
  selectedId: typeof persisted.selectedId === 'string' ? persisted.selectedId : null,
  switching: false,
  switchError: null,
}

/** App start: wake the server, list profiles, load the selected one. */
export const bootstrap = createAsyncThunk(
  'profiles/bootstrap',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      await wakeWorkspace()
      dispatch(phaseChanged('profiles'))
      const ids = await fetchProfileIds()
      const saved = getState().profiles.selectedId
      const id = ids.includes(saved) ? saved : ids[0]
      let profile
      try {
        profile = await fetchProfile(id)
      } catch (err) {
        // Auth and connection problems are real; anything else we can work around.
        if (err.kind === 'auth' || err.kind === 'network' || err.kind === 'timeout') throw err
        profile = minimalProfile(id)
      }
      return { ids, profile }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  {
    condition: (_, { getState }) => {
      const { phase } = getState().profiles
      return phase === 'idle' || phase === 'error'
    },
  },
)

/** Switch business profile. Uses the cache when the profile was already loaded. */
export const selectProfile = createAsyncThunk(
  'profiles/select',
  async (id, { getState, rejectWithValue }) => {
    const cached = getState().profiles.byId[id]
    if (cached) return { profile: cached }
    try {
      return { profile: await fetchProfile(id) }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  {
    condition: (id, { getState }) => {
      const { switching, selectedId } = getState().profiles
      return !switching && id !== selectedId
    },
  },
)

const slice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    phaseChanged(state, action) {
      state.phase = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.pending, (state) => {
        state.phase = 'waking'
        state.error = null
      })
      .addCase(bootstrap.fulfilled, (state, { payload }) => {
        state.ids = payload.ids
        state.byId[payload.profile.id] = payload.profile
        state.selectedId = payload.profile.id
        state.phase = 'ready'
      })
      .addCase(bootstrap.rejected, (state, { payload }) => {
        state.phase = 'error'
        state.error = payload || { kind: 'unknown' }
      })
      .addCase(selectProfile.pending, (state) => {
        state.switching = true
        state.switchError = null
      })
      .addCase(selectProfile.fulfilled, (state, { payload }) => {
        state.switching = false
        state.byId[payload.profile.id] = payload.profile
        state.selectedId = payload.profile.id
      })
      .addCase(selectProfile.rejected, (state, { payload }) => {
        state.switching = false
        state.switchError = payload || { kind: 'unknown' }
      })
  },
})

export const { phaseChanged } = slice.actions
export default slice.reducer
