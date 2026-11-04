import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { accountsEnabled } from '../api/auth.js'
import { LinkButton } from '../components/Button.jsx'
import AddCompanyPanel from '../components/AddCompany.jsx'
import { ExportLeadsPanel } from '../components/ExportLeads.jsx'
import { StatusTag } from '../components/TrackingParts.jsx'
import { EmptyState, ErrorPanel } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { followUpOf, formatDay, STATUSES } from '../config/trackingUi.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { displayName, timeAgo } from '../lib/format.js'
import { selectActiveProfile } from '../store/selectors.js'
import { loadTracking } from '../store/trackingSlice.js'

const FILTERS = [{ value: 'all', label: 'All' }, { value: 'due', label: 'Follow-up due' }, ...STATUSES]

function WeekLine({ week }) {
  if (!week) return null
  const n = (...types) => types.reduce((sum, t) => sum + (week[t] || 0), 0)
  const items = [
    ['Calls', n('call_attempt', 'call_answered')],
    ['Messages', n('email_sent', 'whatsapp_sent')],
    ['Meetings', n('meeting', 'visit')],
    ['Proposals', n('proposal_sent')],
    ['Won', n('won')],
  ]
  return (
    <p className="muted small" aria-label="This week">
      Last 7 days: {items.map(([label, count]) => `${label} ${count}`).join(' · ')}
    </p>
  )
}

export default function Pipeline() {
  useDocumentTitle('Pipeline')
  const dispatch = useDispatch()
  const profile = useSelector(selectActiveProfile)
  const accountStatus = useSelector((s) => s.account.status)
  const { status, error, byPlaceId, week } = useSelector((s) => s.tracking)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const all = useMemo(() => Object.values(byPlaceId), [byPlaceId])
  const counts = useMemo(() => {
    const out = { all: all.length, due: 0 }
    for (const s of STATUSES) out[s.value] = 0
    for (const l of all) {
      out[l.status] = (out[l.status] || 0) + 1
      if (followUpOf(l)?.overdue) out.due += 1
    }
    return out
  }, [all])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((l) => (filter === 'all' ? true : filter === 'due' ? followUpOf(l)?.overdue : l.status === filter))
      .filter((l) => !q || [l.name, l.city, l.address].some((v) => v && v.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (filter === 'due') return Date.parse(a.next_follow_up_at) - Date.parse(b.next_follow_up_at)
        return Date.parse(b.updated_at) - Date.parse(a.updated_at)
      })
  }, [all, filter, query])

  let body
  if (!accountsEnabled || accountStatus === 'guest') {
    body = (
      <EmptyState
        icon="info"
        title="Sign in to track your leads"
        action={
          <LinkButton to="/account" variant="primary">
            Sign in or create an account
          </LinkButton>
        }
      >
        With an account you can save companies, log every call and message, set follow-up reminders and record which leads you won.
      </EmptyState>
    )
  } else if (accountStatus === 'checking' || status === 'idle' || (status === 'loading' && all.length === 0)) {
    body = <p className="muted" role="status">Loading your leads...</p>
  } else if (status === 'error' && all.length === 0) {
    body = <ErrorPanel error={error} context="startup" onRetry={() => dispatch(loadTracking())} />
  } else if (all.length === 0) {
    body = (
      <EmptyState
        icon="list"
        title="No saved leads yet"
        action={
          <LinkButton to="/leads" variant="primary">
            Go to your results
          </LinkButton>
        }
      >
        Open a company from your search results and choose Save lead. It will show up here.
      </EmptyState>
    )
  } else {
    body = (
      <>
        <ExportLeadsPanel status={filter} />
        <div role="group" aria-label="Filter by status">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" className="filter" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
                <span className="filter-count">{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="pipeline-search" className="sr-only">
            Search saved leads
          </label>
          <input id="pipeline-search" type="text" placeholder="Search by name or city" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {shown.length === 0 ? (
          <p className="muted">No saved leads match.</p>
        ) : (
          <ul className="pipeline-list">
            {shown.map((l) => {
              const due = followUpOf(l)
              return (
                <li key={l.id} className="pipeline-item">
                  <Link to={`/leads/${encodeURIComponent(l.place_id)}`} className="pipeline-main">
                    <span className="pipeline-top">
                      <strong>{displayName(l)}</strong>
                      <StatusTag tracked={l} />
                      {l.do_not_contact ? <span className="tag tag-bad">Do not contact</span> : null}
                    </span>
                    <span className="muted small">
                      {[l.city, industryLabel(l.sector, profile)].filter(Boolean).join(' · ') || 'No location'}
                    </span>
                    {l.last_note ? <span className="pipeline-note clamp-2">{l.last_note}</span> : null}
                  </Link>
                  <span className="pipeline-meta small">
                    <span className="muted">
                      {l.contact_attempts
                        ? `${l.contact_attempts} contact${l.contact_attempts === 1 ? '' : 's'}${l.last_contacted_at ? `, last ${timeAgo(Date.parse(l.last_contacted_at))}` : ''}`
                        : 'Not contacted'}
                    </span>
                    {due ? <span className={due.overdue ? 'track-due is-overdue' : 'track-due'}>{due.overdue ? 'Follow up: due ' : 'Follow up: '}{formatDay(due.at)}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Pipeline</h1>
        <p className="lead">The companies you saved, and where each one stands.</p>
        <WeekLine week={week} />
      </header>
      <div className="stack">
        {accountStatus === 'signedIn' ? <AddCompanyPanel /> : null}
        {body}
      </div>
    </div>
  )
}