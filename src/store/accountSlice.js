import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchMe } from '../api/account.js'
import { accountsEnabled, getAuthClient, markSignedIn } from '../api/auth.js'
import { ApiError } from '../api/client.js'

// Not saved to local storage: the sign-in library keeps its own session, and the server knows the rest.
const initialState = {
  status: accountsEnabled ? 'checking' : 'guest', // checking | guest | signedIn
  user: null,
  workspaces: [],
  activeWorkspaceId: null,
  busy: false,
  error: '',
  notice: '',
}

function friendly(err) {
  if (err instanceof ApiError) {
    if (err.kind === 'network' || err.kind === 'timeout') return 'Could not reach the server. Check your connection and try again.'
    if (err.kind === 'config') return 'Accounts are not available on the server right now.'
  }
  return err?.message || 'Something went wrong. Please try again.'
}

/** Asks the server who this is. Turning the token on first lets the request carry it. */
async function loadMe() {
  markSignedIn(true)
  try {
    return await fetchMe()
  } catch (err) {
    markSignedIn(false)
    throw err
  }
}

export const initAccount = createAsyncThunk('account/init', async (_, { rejectWithValue }) => {
  if (!accountsEnabled) return null
  try {
    const client = await getAuthClient()
    const session = await client.getSession()
    if (!session?.data?.session) return null
    return await loadMe()
  } catch (err) {
    return rejectWithValue(friendly(err))
  }
})

export const signInEmail = createAsyncThunk('account/signIn', async ({ email, password }, { rejectWithValue }) => {
  try {
    const client = await getAuthClient()
    const res = await client.signIn.email({ email, password })
    if (res?.error) return rejectWithValue(res.error.message || 'Could not sign in. Check your email and password.')
    return await loadMe()
  } catch (err) {
    return rejectWithValue(friendly(err))
  }
})

export const signUpEmail = createAsyncThunk('account/signUp', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const client = await getAuthClient()
    const res = await client.signUp.email({ name, email, password })
    if (res?.error) return rejectWithValue(res.error.message || 'Could not create the account.')
    const session = await client.getSession()
    if (!session?.data?.session) return { verify: true } // email verification is on: sign in after verifying
    return { me: await loadMe() }
  } catch (err) {
    return rejectWithValue(friendly(err))
  }
})

export const signOutAccount = createAsyncThunk('account/signOut', async () => {
  try {
    const client = await getAuthClient()
    await client?.signOut()
  } finally {
    markSignedIn(false)
  }
  return true
})

function applyMe(state, me) {
  state.status = 'signedIn'
  state.user = me.user
  state.workspaces = me.workspaces
  state.activeWorkspaceId = me.active_workspace_id
}

function applyGuest(state) {
  state.status = 'guest'
  state.user = null
  state.workspaces = []
  state.activeWorkspaceId = null
}

const slice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    accountMessageCleared(state) {
      state.error = ''
      state.notice = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAccount.fulfilled, (state, { payload }) => (payload ? applyMe(state, payload) : applyGuest(state)))
      .addCase(initAccount.rejected, (state) => applyGuest(state)) // keep working as a guest if the check fails
      .addCase(signInEmail.pending, (state) => {
        state.busy = true
        state.error = ''
        state.notice = ''
      })
      .addCase(signInEmail.fulfilled, (state, { payload }) => {
        state.busy = false
        applyMe(state, payload)
      })
      .addCase(signInEmail.rejected, (state, { payload }) => {
        state.busy = false
        state.error = payload || 'Could not sign in.'
      })
      .addCase(signUpEmail.pending, (state) => {
        state.busy = true
        state.error = ''
        state.notice = ''
      })
      .addCase(signUpEmail.fulfilled, (state, { payload }) => {
        state.busy = false
        if (payload.verify) {
          state.notice = 'Account created. Check your email to verify your address, then sign in.'
          applyGuest(state)
        } else {
          applyMe(state, payload.me)
        }
      })
      .addCase(signUpEmail.rejected, (state, { payload }) => {
        state.busy = false
        state.error = payload || 'Could not create the account.'
      })
      .addCase(signOutAccount.fulfilled, (state) => {
        applyGuest(state)
        state.error = ''
        state.notice = ''
      })
  },
})

export const { accountMessageCleared } = slice.actions
export default slice.reducer