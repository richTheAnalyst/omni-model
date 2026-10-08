import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import BusinessForm from '../components/BusinessForm.jsx'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { ErrorPanel } from '../components/States.jsx'
import { useDocumentTitle } from '../hooks/hooks.js'
import { timeAgo } from '../lib/format.js'
import { localDataCleared } from '../store/actions.js'
import { clearedDoNotContact } from '../store/dncSlice.js'
import { selectProfile } from '../store/profilesSlice.js'
import { selectActiveProfile } from '../store/selectors.js'

export default function Settings() {
  useDocumentTitle('Settings')
  const dispatch = useDispatch()
  const profile = useSelector(selectActiveProfile)
  const ids = useSelector((s) => s.profiles.ids)
  const byId = useSelector((s) => s.profiles.byId)
  const switching = useSelector((s) => s.profiles.switching)
  const switchError = useSelector((s) => s.profiles.switchError)
  const dnc = useSelector((s) => s.dnc.byId)
  const [confirmClear, setConfirmClear] = useState(false)
  const [cleared, setCleared] = useState(false)

  const dncList = useMemo(() => Object.entries(dnc).sort((a, b) => b[1].at - a[1].at), [dnc])

  return (
    <div className="page page-narrow-wide">
      <header className="page-head">
        <h1>Settings</h1>
        <p className="lead">Your business details and what Omni Model keeps on this device.</p>
      </header>

      <div className="stack">
        <BusinessForm />

        <section className="panel" aria-labelledby="workspace-title">
          <header className="panel-head">
            <h2 id="workspace-title">Workspace</h2>
          </header>
          <dl className="kv">
            <div>
              <dt>Business profile</dt>
              <dd>{profile.name}</dd>
            </div>
            {profile.country ? (
              <div>
                <dt>Country</dt>
                <dd>{profile.country}</dd>
              </div>
            ) : null}
          </dl>
          {ids.length > 1 ? (
            <div className="profile-list" role="group" aria-label="Switch business profile">
              {ids.map((id) => (
                <Button
                  key={id}
                  size="sm"
                  variant={id === profile.id ? 'primary' : 'secondary'}
                  disabled={switching || id === profile.id}
                  aria-pressed={id === profile.id}
                  onClick={() => dispatch(selectProfile(id))}
                >
                  {byId[id]?.name || id}
                </Button>
              ))}
              <p className="muted small">Switching profiles clears the current search results.</p>
            </div>
          ) : null}
          {switchError ? <ErrorPanel compact error={switchError} context="profile" /> : null}
        </section>

        <section className="panel" aria-labelledby="dnc-list-title">
          <header className="panel-head">
            <h2 id="dnc-list-title">Do not contact</h2>
            <p className="muted">
              Companies you’ve flagged. This list lives on this device only and isn’t enforced by Omni Model’s server.
            </p>
          </header>
          {dncList.length === 0 ? (
            <p className="muted">No companies are flagged.</p>
          ) : (
            <ul className="plain-list divided">
              {dncList.map(([id, entry]) => (
                <li key={id} className="dnc-item">
                  <span>
                    <strong>{entry.name}</strong>
                    <span className="muted small block">Flagged {timeAgo(entry.at)}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => dispatch(clearedDoNotContact(id))}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="data-title">
          <header className="panel-head">
            <h2 id="data-title">Data on this device</h2>
            <p className="muted">
              Search results, drafts and activity are saved in this browser so you can pick up where you left off. Your
              sender details and do-not-contact list are kept.
            </p>
          </header>
          {confirmClear ? (
            <div className="confirm" role="alert">
              <span className="small">Remove saved results, drafts and activity?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  dispatch(localDataCleared())
                  setConfirmClear(false)
                  setCleared(true)
                }}
              >
                Clear saved work
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="form-foot-row">
              <Button variant="secondary" icon="trash" onClick={() => setConfirmClear(true)}>
                Clear saved work
              </Button>
              <span className="muted small" role="status" aria-live="polite">
                {cleared ? (
                  <>
                    <Icon name="check" size={14} /> Cleared.
                  </>
                ) : null}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
