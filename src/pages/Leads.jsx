import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import Button, { LinkButton } from '../components/Button.jsx'
import { LeadCards, LeadsTable } from '../components/LeadList.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { EmptyState, ErrorPanel, ResultsSkeleton } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { COPY } from '../config/product.js'
import { useDocumentTitle, useMediaQuery } from '../hooks/hooks.js'
import { countByOwnership, filterLeads } from '../lib/ownership.js'
import { bestEntry, getBand, toPercent } from '../lib/score.js'
import { selectActiveProfile, selectDncById, selectResultLeads } from '../store/selectors.js'

const FIT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'strong', label: 'Strong fit' },
  { id: 'potential', label: 'Potential fit' },
  { id: 'low', label: 'Low fit' },
]

const OWNER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'government', label: 'Government & public sector' },
  { id: 'non_government', label: 'Non-government' },
]

const bandOf = (lead) => getBand(toPercent(bestEntry(lead)?.score)).key

function FilterGroup({ label, options, value, counts, onChange }) {
  return (
    <div role="group" aria-label={label}>
      <p className="section-label">{label}</p>
      <div className="filters">
        {options.map((f) => (
          <button
            key={f.id}
            type="button"
            className="filter"
            aria-pressed={value === f.id}
            onClick={() => onChange(f.id)}
          >
            {f.label}
            <span className="filter-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Leads() {
  useDocumentTitle('Leads')
  const profile = useSelector(selectActiveProfile)
  const status = useSelector((s) => s.search.status)
  const error = useSelector((s) => s.search.error)
  const lastQuery = useSelector((s) => s.search.lastQuery)
  const leads = useSelector(selectResultLeads)
  const dncById = useSelector(selectDncById)
  const isMobile = useMediaQuery('(max-width: 719px)')

  // Filters live in the address (?ownership=government&fit=strong), so they survive opening a lead and coming back.
  const [params, setParams] = useSearchParams()
  const pick = (key, options) => (options.some((o) => o.id === params.get(key)) ? params.get(key) : 'all')
  const owner = pick('ownership', OWNER_FILTERS)
  const fit = pick('fit', FIT_FILTERS)
  const setFilter = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'all') next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const ownerCounts = useMemo(() => countByOwnership(leads), [leads])
  const byOwner = useMemo(() => filterLeads(leads, owner), [leads, owner])
  const fitCounts = useMemo(() => {
    const counts = { all: byOwner.length, strong: 0, potential: 0, low: 0 }
    for (const lead of byOwner) counts[bandOf(lead)] += 1
    return counts
  }, [byOwner])
  const shown = useMemo(() => (fit === 'all' ? byOwner : byOwner.filter((l) => bandOf(l) === fit)), [byOwner, fit])

  const where = lastQuery ? [lastQuery.city, lastQuery.region].filter(Boolean).join(', ') : ''
  const what = lastQuery ? industryLabel(lastQuery.sector, profile) : ''
  const summary = lastQuery
    ? `${leads.length} companies · ${what}${where ? ` in ${where}` : ''}`
    : `${leads.length} companies`

  const findButton = (
    <LinkButton to="/find" variant="primary" iconRight="arrow">
      Find Leads
    </LinkButton>
  )

  let body
  if (status === 'loading') {
    body = (
      <>
        <p className="muted" role="status">
          {COPY.loading.search}
        </p>
        <ResultsSkeleton />
      </>
    )
  } else if (status === 'failed') {
    body = (
      <>
        <ErrorPanel error={error} context="search" />
        <div>{findButton}</div>
      </>
    )
  } else if (leads.length === 0) {
    body = (
      <EmptyState icon="search" title="No results yet" action={findButton}>
        Run a search to see companies here, scored for each of your offerings.
      </EmptyState>
    )
  } else {
    body = (
      <>
        <div className="toolbar">
          <FilterGroup
            label="Organisation type"
            options={OWNER_FILTERS}
            value={owner}
            counts={ownerCounts}
            onChange={(v) => setFilter('ownership', v)}
          />
          <FilterGroup label="Fit" options={FIT_FILTERS} value={fit} counts={fitCounts} onChange={(v) => setFilter('fit', v)} />
        </div>
        <p className="muted small">
          Government labels are best effort. Not verified means no government clue was found, so open a company and analyze its
          website to check.
        </p>

        {shown.length === 0 ? (
          <EmptyState
            icon="info"
            title="No companies match these filters"
            action={
              <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            }
          >
            {owner === 'government' && ownerCounts.government === 0
              ? 'There are no government organisations in these results. To search for them directly, choose the Government offices and agencies industry.'
              : 'Try a different combination of filters.'}
          </EmptyState>
        ) : isMobile ? (
          <LeadCards leads={shown} dncById={dncById} />
        ) : (
          <LeadsTable leads={shown} dncById={dncById} />
        )}

        <details className="score-help">
          <summary>How scores work</summary>
          <ScoreLegend compact />
        </details>
      </>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Search results</p>
        <h1>Leads</h1>
        {status === 'loading' ? null : <p className="lead">{summary}</p>}
      </header>
      {body}
    </div>
  )
}