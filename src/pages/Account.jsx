import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { accountsEnabled } from '../api/auth.js'
import Button from '../components/Button.jsx'
import { TextField } from '../components/Fields.jsx'
import { useDocumentTitle } from '../hooks/hooks.js'
import { accountMessageCleared, signInEmail, signOutAccount, signUpEmail } from '../store/accountSlice.js'

export default function Account() {
  useDocumentTitle('Account')
  const dispatch = useDispatch()
  const { status, user, workspaces, busy, error, notice } = useSelector((s) => s.account)
  const [mode, setMode] = useState('signin') // signin | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const errors = {}
  if (mode === 'signup' && !name.trim()) errors.name = 'Enter your name.'
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (password.length < 8) errors.password = 'Use at least 8 characters.'
  const invalid = Object.keys(errors).length > 0

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    if (mode === 'signup') dispatch(signUpEmail({ name: name.trim(), email: email.trim(), password }))
    else dispatch(signInEmail({ email: email.trim(), password }))
  }

  const switchMode = (next) => {
    setMode(next)
    setTouched(false)
    dispatch(accountMessageCleared())
  }

  let body
  if (!accountsEnabled) {
    body = (
      <section className="panel">
        <p>Accounts are not switched on for this site yet. You can keep using Omni Model as a guest.</p>
      </section>
    )
  } else if (status === 'checking') {
    body = (
      <section className="panel">
        <p className="muted" role="status">
          Checking your sign-in...
        </p>
      </section>
    )
  } else if (status === 'signedIn') {
    body = (
      <section className="panel" aria-labelledby="account-title">
        <header className="panel-head">
          <h2 id="account-title">Signed in</h2>
        </header>
        <dl className="kv">
          <div>
            <dt>Name</dt>
            <dd>{user?.name || 'Not set'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email || 'Not set'}</dd>
          </div>
          {workspaces.map((w) => (
            <div key={w.id}>
              <dt>Business</dt>
              <dd>
                {w.name} ({w.role})
              </dd>
            </div>
          ))}
        </dl>
        <div className="form-foot">
          <Button variant="secondary" loading={busy} onClick={() => dispatch(signOutAccount())}>
            Sign out
          </Button>
        </div>
      </section>
    )
  } else {
    body = (
      <>
        <section className="panel">
          <p>
            You are using Omni Model as a <strong>guest</strong>. Your leads are kept in this browser only, and they are gone
            if you clear its data or switch devices. An account keeps your work safe and lets you track your calls and clients.
          </p>
        </section>
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <header className="panel-head">
            <h2>{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2>
          </header>
          {notice ? (
            <p className="notice notice-info" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="notice notice-warn" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-grid">
            {mode === 'signup' ? (
              <TextField
                label="Your name"
                value={name}
                onChange={setName}
                autoComplete="name"
                required
                error={touched ? errors.name : undefined}
              />
            ) : null}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              inputMode="email"
              required
              error={touched ? errors.email : undefined}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              error={touched ? errors.password : undefined}
            />
          </div>
          <div className="form-foot">
            <Button type="submit" variant="primary" loading={busy}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
            <Button variant="ghost" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} disabled={busy}>
              {mode === 'signup' ? 'I already have an account' : 'Create an account'}
            </Button>
          </div>
        </form>
      </>
    )
  }

  return (
    <div className="page page-narrow-wide">
      <header className="page-head">
        <h1>Account</h1>
        <p className="lead">Optional. Everything works without one.</p>
      </header>
      <div className="stack">{body}</div>
    </div>
  )
}