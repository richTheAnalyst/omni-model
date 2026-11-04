import { useId, useState } from 'react'
import '../styles/account-export.css' 
import { useDispatch, useSelector } from 'react-redux'
import { accountsEnabled } from '../api/auth.js'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { TextField } from '../components/Fields.jsx'
import { useDocumentTitle } from '../hooks/hooks.js'
import { accountMessageCleared, signInEmail, signOutAccount, signOutEverywhere, signUpEmail } from '../store/accountSlice.js'

const PERKS = [
  ['star', 'Save every company you find', 'Your leads follow you to any phone or computer.'],
  ['clock', 'Track every call and message', 'See what happened, when, and what to do next.'],
  ['check', 'Follow-up reminders', 'Never lose a warm lead because you forgot to call back.'],
  ['download', 'Download to Excel', 'Leads, statuses and history for a week or for everything.'],
]


function strengthOf(password) {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) score += 1
  else if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(3, score)
}
const STRENGTH_LABEL = ['Too short', 'Okay', 'Good', 'Strong']

function PasswordField({ value, onChange, mode, error }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const strength = strengthOf(value)
  return (
    <div className="field">
      <label htmlFor={id}>
        Password<span className="req" aria-hidden="true"> *</span>
      </label>
      <div className="pw-wrap">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
        <button type="button" className="pw-toggle" onClick={() => setShown((v) => !v)} aria-pressed={shown}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {mode === 'signup' ? (
        <div className="pw-meter" aria-live="polite">
          <span className={`pw-bars s${strength}`} aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="field-hint">{value ? `${STRENGTH_LABEL[strength]}. Use at least 8 characters.` : 'Use at least 8 characters.'}</span>
        </div>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function initialsOf(user) {
  const source = (user?.name || user?.email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

export default function Account() {
  useDocumentTitle('Account')
  const dispatch = useDispatch()
  const { status, user, workspaces, busy, error, notice } = useSelector((s) => s.account)
  const [mode, setMode] = useState('signin') // signin | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const tabId = useId()

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
    if (next === mode) return
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
      <section className="panel acct-me" aria-labelledby="account-title">
        <div className="acct-me-head">
          <span className="acct-avatar" aria-hidden="true">
            {initialsOf(user)}
          </span>
          <div>
            <h2 id="account-title">{user?.name || 'Your account'}</h2>
            <p className="muted">{user?.email || ''}</p>
          </div>
          <span className="tag tag-good">Signed in</span>
        </div>
        {workspaces.length ? (
          <dl className="kv">
            {workspaces.map((w) => (
              <div key={w.id}>
                <dt>Business</dt>
                <dd>
                  {w.name} <span className="muted">({w.role})</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {error ? (
          <p className="notice notice-warn" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-foot acct-me-foot">
          <Button variant="secondary" loading={busy} onClick={() => dispatch(signOutAccount())}>
            Sign out
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => dispatch(signOutEverywhere())}>
            Sign out on all devices
          </Button>
        </div>
      </section>
    )
  } else {
    const signup = mode === 'signup'
    body = (
      <div className="auth-card">
        <aside className="auth-side" aria-label="Why create an account">
          <p className="eyebrow eyebrow-light">Omni Model</p>
          <h2 className="auth-side-title">Turn leads into clients, and keep the proof.</h2>
          <ul className="auth-perks">
            {PERKS.map(([icon, title, text]) => (
              <li key={title}>
                <span className="auth-perk-icon" aria-hidden="true">
                  <Icon name={icon} size={18} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="auth-guest">Not ready? You can keep using Omni Model as a guest. Guest leads stay in this browser only.</p>
        </aside>

        <form className="auth-form" onSubmit={submit} noValidate aria-labelledby={`${tabId}-title`}>
          <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
            <button type="button" role="tab" aria-selected={!signup} className={!signup ? 'is-on' : ''} onClick={() => switchMode('signin')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={signup} className={signup ? 'is-on' : ''} onClick={() => switchMode('signup')}>
              Create account
            </button>
          </div>
          <div>
            <h2 id={`${tabId}-title`}>{signup ? 'Create your free account' : 'Welcome back'}</h2>
            <p className="muted">{signup ? 'It takes less than a minute.' : 'Sign in to see your saved leads.'}</p>
          </div>

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

          <div className="auth-fields">
            {signup ? (
              <TextField label="Your name" value={name} onChange={setName} autoComplete="name" required error={touched ? errors.name : undefined} />
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
            <PasswordField value={password} onChange={setPassword} mode={mode} error={touched ? errors.password : undefined} />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={busy} className="auth-submit">
            {signup ? 'Create account' : 'Sign in'}
          </Button>
          <p className="auth-switch muted">
            {signup ? 'Already have an account? ' : 'New here? '}
            <button type="button" className="link-button" disabled={busy} onClick={() => switchMode(signup ? 'signin' : 'signup')}>
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </div>
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