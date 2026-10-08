import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { COPY, PRODUCT } from '../config/product.js'
import { useElapsed } from '../hooks/hooks.js'
import { bootstrap } from '../store/profilesSlice.js'
import Button from './Button.jsx'
import { Logo } from './Icon.jsx'
import { ErrorPanel } from './States.jsx'

const STEPS = [
  { id: 'waking', label: 'Waking the workspace' },
  { id: 'profiles', label: 'Loading your business profile' },
]

export default function StartupScreen() {
  const dispatch = useDispatch()
  const phase = useSelector((s) => s.profiles.phase)
  const error = useSelector((s) => s.profiles.error)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const elapsed = useElapsed(phase === 'error' ? 0 : startedAt)

  const retry = () => {
    setStartedAt(Date.now())
    dispatch(bootstrap())
  }

  // After a while, say plainly that a cold start is expected rather than leaving silence.
  const slow = elapsed >= 8
  const activeIndex = phase === 'profiles' ? 1 : 0

  return (
    <div className="startup">
      <div className="startup-card">
        <div className="startup-brand">
          <Logo size={36} />
          <span>{PRODUCT.name}</span>
        </div>

        {phase === 'error' ? (
          <>
            <ErrorPanel error={error} context="startup" onRetry={retry} />
          </>
        ) : (
          <div role="status" aria-live="polite">
            <h1 className="startup-title">{COPY.loading.startup}</h1>
            <p className="startup-copy">We’re waking up the workspace. This may take a moment.</p>

            <ol className="startup-steps">
              {STEPS.map((step, i) => {
                const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo'
                return (
                  <li key={step.id} className={`startup-step is-${state}`}>
                    <span className="startup-dot" aria-hidden="true" />
                    <span>{step.label}</span>
                    <span className="sr-only">{state === 'done' ? ' (done)' : state === 'active' ? ' (in progress)' : ''}</span>
                  </li>
                )
              })}
            </ol>

            <div className="progress" aria-hidden="true">
              <span className="progress-bar" />
            </div>

            <p className="startup-foot muted small">
              {slow
                ? `Still starting up (${elapsed}s). The first start of the day can take up to a minute.`
                : 'Usually just a few seconds.'}
            </p>
            {slow ? (
              <Button variant="ghost" size="sm" onClick={retry}>
                Start over
              </Button>
            ) : null}
          </div>
        )}
      </div>
      <p className="startup-tagline">{PRODUCT.tagline}</p>
    </div>
  )
}

// Shown when the app has no API configuration at all (a developer-facing problem).
export function ConfigMissing() {
  return (
    <div className="startup">
      <div className="startup-card">
        <div className="startup-brand">
          <Logo size={36} />
          <span>{PRODUCT.name}</span>
        </div>
        <div className="state state-error" role="alert">
          <div className="state-body">
            <h3>Omni Model isn’t configured yet</h3>
            <p>
              Add <code>VITE_API_URL</code> and <code>VITE_API_KEY</code> to a <code>.env.local</code> file, then
              restart the dev server.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
