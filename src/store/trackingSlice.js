import { createAsyncThunk, createSlice, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit'
import * as api from '../api/tracking.js'
import { serializeError } from '../api/client.js'
import { signOutAccount } from './accountSlice.js'

// The server is the source of truth for saved leads, so none of this is kept in local storage.
// byPlaceId[googlePlaceId] = the saved lead as the server returned it (its own `id` is the server's id).
// detail[googlePlaceId]    = { status, events, outcome } for the lead page, reloaded whenever the lead changes.
const initialState = {
  status: 'idle', // idle | loading | ready | error
  error: null,
  total: 0,
  byPlaceId: {},
  week: null, // this week's calls, messages and wins, as counted by the server
  detail: {},
  busy: {}, // placeId -> true while a change is on its way
  actionError: null, // { placeId, error } for the last change that failed
}

function serverIdOf(state, placeId) {
  const saved = state.tracking.byPlaceId[placeId]
  if (!saved) throw new Error('Save this lead first.')
  return saved.id
}

/** This week's numbers. Best effort: the board works without them. */
export const loadWeek = createAsyncThunk('tracking/week', async (_, { rejectWithValue }) => {
  try {
    const res = await api.fetchWeek()
    return res?.week ?? null
  } catch (err) {
    return rejectWithValue(serializeError(err))
  }
})

export const loadTracking = createAsyncThunk(
  'tracking/load',
  async (_, { rejectWithValue }) => {
    try {
      const [list, week] = await Promise.all([api.fetchTracked(), api.fetchWeek().catch(() => null)])
      return { leads: Array.isArray(list?.leads) ? list.leads : [], total: Number(list?.total) || 0, week: week?.week ?? null }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  },
  { condition: (_, { getState }) => getState().tracking.status !== 'loading' },
)

export const loadDetail = createAsyncThunk('tracking/detail', async ({ placeId }, { getState, rejectWithValue }) => {
  try {
    const res = await api.fetchTrackedDetail(serverIdOf(getState(), placeId))
    return { placeId, events: res.events || [], outcome: res.outcome || null }
  } catch (err) {
    return rejectWithValue(serializeError(err))
  }
})

/** A change to one lead: run it, refresh this week's numbers, and hand back what the server answered. */
function mutation(type, run) {
  return createAsyncThunk(type, async (arg, { getState, dispatch, rejectWithValue }) => {
    try {
      const result = await run(arg, (placeId) => serverIdOf(getState(), placeId))
      dispatch(loadWeek())
      return { placeId: arg.placeId ?? arg.id, ...result }
    } catch (err) {
      return rejectWithValue(serializeError(err))
    }
  })
}

/** arg: a lead as shown in search results. */
export const saveToTracking = mutation('tracking/save', async (lead) => {
  const res = await api.saveTrackedLead(lead)
  return { lead: res.lead, created: Boolean(res.created) }
})

/** arg: { placeId, status }. Won and lost go through recordOutcome instead. */
export const changeStatus = mutation('tracking/status', async ({ placeId, status }, idOf) => ({
  lead: (await api.patchTrackedLead(idOf(placeId), { status })).lead,
}))

/** arg: { placeId, at } with `at` an ISO string, or null to clear the reminder. */
export const setFollowUp = mutation('tracking/followUp', async ({ placeId, at }, idOf) => ({
  lead: (await api.patchTrackedLead(idOf(placeId), { next_follow_up_at: at })).lead,
}))

/** arg: { placeId, value } */
export const setTrackedDnc = mutation('tracking/dnc', async ({ placeId, value }, idOf) => ({
  lead: (await api.patchTrackedLead(idOf(placeId), { do_not_contact: value })).lead,
}))

/** arg: { placeId, type, note?, followUpAt? } */
export const logEvent = mutation('tracking/event', async ({ placeId, type, note, followUpAt }, idOf) => {
  const body = { type }
  if (note) body.note = note
  if (followUpAt) body.follow_up_at = followUpAt
  return { lead: (await api.logTrackedEvent(idOf(placeId), body)).lead }
})

/** arg: { placeId, result: 'won' | 'lost', ...details } */
export const recordOutcome = mutation('tracking/outcome', async ({ placeId, ...fields }, idOf) => {
  const res = await api.putOutcome(idOf(placeId), fields)
  return { lead: res.lead, outcome: res.outcome }
})

/** arg: { placeId } */
export const removeTracked = mutation('tracking/remove', async ({ placeId }, idOf) => {
  await api.deleteTrackedLead(idOf(placeId))
  return {}
})

const changes = [saveToTracking, changeStatus, setFollowUp, setTrackedDnc, logEvent, recordOutcome, removeTracked]
const keyOf = (action) => action.meta.arg.placeId ?? action.meta.arg.id

const slice = createSlice({
  name: 'tracking',
  initialState,
  reducers: {
    trackingErrorCleared(state) {
      state.actionError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTracking.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadTracking.fulfilled, (state, { payload }) => {
        state.status = 'ready'
        state.total = payload.total
        state.week = payload.week
        state.byPlaceId = Object.fromEntries(payload.leads.map((lead) => [lead.place_id, lead]))
      })
      .addCase(loadTracking.rejected, (state, { payload }) => {
        state.status = 'error'
        state.error = payload || { kind: 'unknown', status: 0, detail: '' }
      })
      .addCase(loadWeek.fulfilled, (state, { payload }) => {
        state.week = payload
      })
      .addCase(loadDetail.pending, (state, { meta }) => {
        const { placeId } = meta.arg
        const had = state.detail[placeId]
        state.detail[placeId] = { events: had?.events || [], outcome: had?.outcome || null, status: had ? had.status : 'loading' }
      })
      .addCase(loadDetail.fulfilled, (state, { payload }) => {
        state.detail[payload.placeId] = { events: payload.events, outcome: payload.outcome, status: 'ready' }
      })
      .addCase(loadDetail.rejected, (state, { meta }) => {
        const had = state.detail[meta.arg.placeId]
        state.detail[meta.arg.placeId] = { events: had?.events || [], outcome: had?.outcome || null, status: 'error' }
      })
      .addCase(saveToTracking.fulfilled, (state, { payload }) => {
        state.byPlaceId[payload.placeId] = payload.lead
        if (payload.created) state.total += 1
      })
      .addCase(removeTracked.fulfilled, (state, { payload }) => {
        delete state.byPlaceId[payload.placeId]
        delete state.detail[payload.placeId]
        state.total = Math.max(0, state.total - 1)
      })
      .addCase(signOutAccount.fulfilled, () => initialState)
      .addMatcher(isPending(...changes), (state, action) => {
        state.busy[keyOf(action)] = true
        state.actionError = null
      })
      .addMatcher(isFulfilled(changeStatus, setFollowUp, setTrackedDnc, logEvent, recordOutcome), (state, { payload }) => {
        state.byPlaceId[payload.placeId] = payload.lead
      })
      .addMatcher(isFulfilled(...changes), (state, action) => {
        delete state.busy[keyOf(action)]
      })
      .addMatcher(isRejected(...changes), (state, action) => {
        delete state.busy[keyOf(action)]
        state.actionError = { placeId: keyOf(action), error: action.payload || { kind: 'unknown', status: 0, detail: '' } }
      })
  },
})

export const { trackingErrorCleared } = slice.actions
export default slice.reducer