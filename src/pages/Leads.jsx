import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LinkButton } from '../components/Button.jsx'
import Button from '../components/Button.jsx'
import { LeadCards, LeadsTable } from '../components/LeadList.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { EmptyState, ErrorPanel, ResultsSkeleton } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { COPY } from '../config/product.js'
import { useDocumentTitle, useMediaQuery } from '../hooks/hooks.js'
import { getBand, toPercent, bestEntry } from '../lib/score.js'
import { runSearch } from '../store/searchSlice.js'
import { selectActiveProfile, selectDncById, selectResultLeads } from '../store/selectors.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'strong', label: 'Strong fit' },
  { id: 'potential', label: 'Potential fit' },
  { id: 'low', label: 'Low fit' },
]

export default function Leads() {
  useDocumentTitle('Leads')
  const dispatch = useDispatch()
  const profile = useSelector(selectActiveProfile)
  const status = useSelector((s) => s.search.status)
  const error = useSelector((s) => s.search.error)
  const pending = useSelector((s) => s.search.pending)
  const lastQuery = useSelector((s) => s.search.lastQuery)
  const leads = useSelector(selectResultLeads)
  const dncById = useSelector(selectDncById)
  const isMobile = useMediaQuery('(max-width: 719px)')
  const [filter, setFilter] = useState('all')

  const counts = useMemo(() => {
    const c = { all: leads.length, strong: 0, potential: 0, low: 0 }
    for (const lead of leads) {
      const best = bestEntry(lead)
      if (best) c[getBand(toPercent(best.score)).key] += 1
    }
    return c
  }, [leads])

  const visible = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((lead) => {
      const best = bestEntry(lead)
      return best && getBand(toPercent(best.score)).key === filter
    })
  }, [leads, filter])

  const query = status === 'loading' ? pending : lastQuery || pending
  const sectorLabel = query ? industryLabel(query.sector, profile) : ''
  const retry = () => query && dispatch(runSearch(query))

  // 1. Nothing searched yet.
  if (!query && status !== 'failed') {
    return (
      <div className="page">
        <header className="page-head">
          <p className="eyebrow">Step 2 of 2 · Discover qualified leads</p>
          <h1>Search results</h1>
        </header>
        <EmptyState
          icon="search"
          title="No search yet"
          action={
            <LinkButton to="/find" variant="primary" iconRight="arrow">
              Find Leads
            </LinkButton>
          }
        >
          Choose a region, city and industry, and Omni Model will find and score the companies that fit.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Step 2 of 2 · Discover qualified leads</p>
        <h1>Search results</h1>
        {query ? (
          <p className="lead">
            {sectorLabel} · {query.city} · {query.region}
          </p>
        ) : null}
        <p className="muted" aria-live="polite">
          {status === 'loading'
            ? COPY.loading.search
            : status === 'failed'
              ? ''
              : `${lastQuery?.count ?? leads.length} ${(lastQuery?.count ?? leads.length) === 1 ? 'company' : 'companies'} found`}
        </p>
      </header>

      {status === 'loading' ? (
        <ResultsSkeleton />
      ) : status === 'failed' ? (
        <ErrorPanel error={error} context="search" onRetry={query ? retry : undefined} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon="search"
          title="No companies found"
          action={
            <LinkButton to="/find" variant="primary">
              Change your search
            </LinkButton>
          }
        >
          Nothing matched {sectorLabel ? `${sectorLabel.toLowerCase()} companies ` : ''}in {query?.city}. Try a nearby city or
          a different industry.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="filters" role="group" aria-label="Filter by fit">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="filter"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label} <span className="filter-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <LinkButton to="/find" variant="ghost" size="sm" icon="search">
              New search
            </LinkButton>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon="info" title="No companies in this group">
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Show all
              </Button>
            </EmptyState>
          ) : isMobile ? (
            <LeadCards leads={visible} dncById={dncById} />
          ) : (
            <LeadsTable leads={visible} dncById={dncById} />
          )}

          <details className="panel panel-flat score-help">
            <summary>How scores work</summary>
            <ScoreLegend />
          </details>
        </>
      )}
    </div>
  )
}
