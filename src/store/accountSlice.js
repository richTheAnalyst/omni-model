import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchMe, loginRequest, logoutAllRequest, registerRequest } from '../api/account.js'
import { clearSession, getAccessToken, storeSession } from '../api/auth.js'
import { ApiError } from '../api/client.js'

// Not saved in the store's local-storage copy: the token has its own entry (see api/auth.js), and the server knows the rest.
const initialState = {
  status: getAccessToken() ? 'checking' : 'guest', // checking | guest | signedIn
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
    if (err.kind === 'request') return 'Please check the details you entered and try again.'
    if (err.detail) return err.detail // e.g. "Incorrect email or password." or "An account with this email already exists."
    if (err.kind === 'config') return 'Sign-in is not available on the server right now.'
  }
  return err?.message || 'Something went wrong. Please try again.'
}

/** Is the saved token still good? A "no" from the server means sign in again; a network failure keeps the token. */
export const initAccount = createAsyncThunk('account/init', async (_, { rejectWithValue }) => {
  if (!getAccessToken()) return null
  try {
    return await fetchMe()
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'auth') {
      clearSession()
      return null
    }
    return rejectWithValue(friendly(err))
  }
})

export const signInEmail = createAsyncThunk('account/signIn', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await loginRequest({ email, password })
    storeSession(res)
    return res.me
  } catch (err) {
    return rejectWithValue(friendly(err))
  }
})

export const signUpEmail = createAsyncThunk('account/signUp', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const res = await registerRequest({ name, email, password })
    storeSession(res)
    return { me: res.me }
  } catch (err) {
    return rejectWithValue(friendly(err))
  }
})

/** Signs out on this device only. */
export const signOutAccount = createAsyncThunk('account/signOut', async () => {
  clearSession()
  return true
})

/** Signs out on every device. If the server cannot be reached, nothing changes and the person is told. */
export const signOutEverywhere = createAsyncThunk('account/signOutEverywhere', async (_, { rejectWithValue }) => {
  try {
    await logoutAllRequest()
  } catch (err) {
    if (!(err instanceof ApiError && err.kind === 'auth')) return rejectWithValue(friendly(err)) // already signed out is fine
  }
  clearSession()
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
        applyMe(state, payload.me)
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
      .addCase(signOutEverywhere.pending, (state) => {
        state.busy = true
        state.error = ''
      })
      .addCase(signOutEverywhere.fulfilled, (state) => {
        state.busy = false
        applyGuest(state)
        state.notice = 'You have been signed out on all devices.'
      })
      .addCase(signOutEverywhere.rejected, (state, { payload }) => {
        state.busy = false
        state.error = payload || 'Could not sign out everywhere. Try again.'
      })
  },
})

export const { accountMessageCleared } = slice.actions
export default slice.reducer