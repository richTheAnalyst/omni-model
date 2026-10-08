import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Button, { LinkButton } from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { EmptyState } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { OUTREACH_KINDS } from '../config/product.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { dayLabel } from '../lib/format.js'
import { activityCleared } from '../store/activitySlice.js'
import { selectLeadEntities } from '../store/selectors.js'

const ICONS = { search: 'search', analysis: 'globe', draft: 'mail', export: 'download' }
const kindLabel = (id) => OUTREACH_KINDS.find((k) => k.id === id)?.label.toLowerCase() || id

export default function Activity() {
  useDocumentTitle('Activity')
  const dispatch = useDispatch()
  const items = useSelector((s) => s.activity.items)
  const profiles = useSelector((s) => s.profiles.byId)
  const leads = useSelector(selectLeadEntities)
  const [confirm, setConfirm] = useState(false)

  const groups = useMemo(() => {
    const out = []
    for (const item of items) {
      const label = dayLabel(item.at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(item)
      else out.push({ label, items: [item] })
    }
    return out
  }, [items])

  const describe = (item) => {
    switch (item.type) {
      case 'search': {
        const sector = industryLabel(item.sector, profiles[item.profileId])
        return (
          <>
            Searched {sector} in {item.city}, {item.region}
            <span className="muted small block">
              {item.count} {item.count === 1 ? 'company' : 'companies'} found
            </span>
          </>
        )
      }
      case 'analysis':
        return (
          <>
            Analyzed the website of{' '}
            {leads[item.leadId] ? (
              <Link to={`/leads/${encodeURIComponent(item.leadId)}`} className="inline-link">
                {item.name || 'a company'}
              </Link>
            ) : (
              item.name || 'a company'
            )}
            {item.partial ? <span className="muted small block">No signals could be used</span> : null}
          </>
        )
      case 'draft':
        return (
          <>
            Prepared a {kindLabel(item.kind)} draft for{' '}
            {leads[item.leadId] ? (
              <Link to={`/outreach/${encodeURIComponent(item.leadId)}`} className="inline-link">
                {item.name}
              </Link>
            ) : (
              item.name
            )}
          </>
        )
      case 'export':
        return (
          <>
            Exported a {kindLabel(item.kind)} for {item.name}
            <span className="muted small block">{String(item.format).toUpperCase()} file</span>
          </>
        )
      default:
        return 'Activity'
    }
  }

  return (
    <div className="page page-narrow-wide">
      <header className="page-head">
        <p className="eyebrow">History</p>
        <h1>Activity</h1>
        <p className="lead">What you’ve done in Omni Model on this device.</p>
      </header>

      <p className="notice notice-info">
        <Icon name="info" size={16} />
        <span>
          This list is saved in this browser only. Omni Model’s server keeps no history, so it won’t follow you to another
          device.
        </span>
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No activity yet"
          action={
            <LinkButton to="/find" variant="primary" iconRight="arrow">
              Find Leads
            </LinkButton>
          }
        >
          Searches, website analyses, drafts and exports will be listed here as you work.
        </EmptyState>
      ) : (
        <>
          {groups.map((group) => (
            <section className="section" key={group.label} aria-label={group.label}>
              <h2 className="section-label">{group.label}</h2>
              <ul className="timeline panel">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <span className="timeline-icon">
                      <Icon name={ICONS[item.type] || 'clock'} size={16} />
                    </span>
                    <span className="timeline-body">{describe(item)}</span>
                    <time className="muted small" dateTime={new Date(item.at).toISOString()}>
                      {new Date(item.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="clear-row">
            {confirm ? (
              <span className="confirm" role="alert">
                <span className="small">Clear the activity list on this device?</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    dispatch(activityCleared())
                    setConfirm(false)
                  }}
                >
                  Clear activity
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" icon="trash" onClick={() => setConfirm(true)}>
                Clear activity
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
