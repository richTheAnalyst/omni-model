import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { LinkButton } from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { ScoreBadge } from '../components/ScoreBadge.jsx'
import { EmptyState } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { WORKFLOW } from '../config/product.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { displayName, greeting, timeAgo } from '../lib/format.js'
import { bestEntry } from '../lib/score.js'
import { formChanged } from '../store/searchSlice.js'
import { selectActiveProfile, selectDraftSummaries, selectLeadEntities } from '../store/selectors.js'

export default function Home() {
  useDocumentTitle('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const profile = useSelector(selectActiveProfile)
  const lastQuery = useSelector((s) => s.search.lastQuery)
  const resultCount = useSelector((s) => s.search.resultIds.length)
  const activity = useSelector((s) => s.activity.items)
  const drafts = useSelector(selectDraftSummaries)
  const leads = useSelector(selectLeadEntities)

  const recentSearches = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const item of activity) {
      if (item.type !== 'search' || item.profileId !== profile?.id) continue
      const key = [item.region, item.city.toLowerCase(), item.sector].join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
      if (out.length === 4) break
    }
    return out
  }, [activity, profile?.id])

  const draftLeads = drafts.filter((d) => leads[d.leadId]).slice(0, 4)
  const hasRecent = Boolean(lastQuery) || recentSearches.length > 0 || draftLeads.length > 0
  const sectorLabel = (key) => industryLabel(key, profile)

  const rerun = (item) => {
    dispatch(formChanged({ region: item.region, city: item.city, sector: item.sector, maxResults: item.maxResults }))
    navigate('/find')
  }

  return (
    <div className="page">
      <header className="home-head">
        <p className="eyebrow">{greeting()}</p>
        <h1>What are you looking for today?</h1>
        <p className="lead">
          Tell Omni Model who you want to reach, and it will find the companies that fit.
        </p>
        <LinkButton to="/find" variant="primary" size="lg" iconRight="arrow">
          Find new leads
        </LinkButton>
      </header>

      <section className="section" aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title">Recent work</h2>
          <span className="tag">Stored on this device</span>
        </div>

        {!hasRecent ? (
          <EmptyState icon="search" title="Nothing here yet">
            Your searches and drafts will appear here so you can pick up where you left off. Omni Model’s server doesn’t
            keep any history.
          </EmptyState>
        ) : (
          <div className="recent-grid">
            {lastQuery && resultCount > 0 ? (
              <div className="panel recent-card">
                <p className="eyebrow">Latest search</p>
                <h3>
                  {sectorLabel(lastQuery.sector)} · {lastQuery.city} · {lastQuery.region}
                </h3>
                <p className="muted">
                  {lastQuery.count} {lastQuery.count === 1 ? 'company' : 'companies'} found · {timeAgo(lastQuery.at)}
                </p>
                <LinkButton to="/leads" variant="secondary" size="sm" iconRight="arrow">
                  Open results
                </LinkButton>
              </div>
            ) : null}

            {recentSearches.length > 0 ? (
              <div className="panel recent-card">
                <p className="eyebrow">Search again</p>
                <ul className="plain-list">
                  {recentSearches.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="list-button" onClick={() => rerun(item)}>
                        <span>
                          {sectorLabel(item.sector)} · {item.city}
                          <span className="muted small block">{item.region}</span>
                        </span>
                        <Icon name="arrow" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {draftLeads.length > 0 ? (
              <div className="panel recent-card">
                <p className="eyebrow">Drafts in progress</p>
                <ul className="plain-list">
                  {draftLeads.map((d) => {
                    const lead = leads[d.leadId]
                    const best = bestEntry(lead)
                    return (
                      <li key={d.leadId}>
                        <Link to={`/outreach/${encodeURIComponent(d.leadId)}`} className="list-button">
                          <span>
                            {displayName(lead)}
                            <span className="muted small block">
                              {d.kinds.length} {d.kinds.length === 1 ? 'draft' : 'drafts'} · {timeAgo(d.at)}
                            </span>
                          </span>
                          {best ? <ScoreBadge score={best.score} showLabel={false} /> : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="flow-title">
        <div className="section-head">
          <h2 id="flow-title">How a lead moves through Omni Model</h2>
        </div>
        <ol className="flow">
          {WORKFLOW.map((step, i) => (
            <li key={step.title}>
              <span className="flow-num" aria-hidden="true">{i + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <span className="muted small block">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
