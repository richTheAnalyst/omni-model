import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import Button, { LinkButton } from '../components/Button.jsx'
import { LeadCards, LeadsTable } from '../components/LeadList.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { EmptyState, ErrorPanel, ResultsSkeleton } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { COPY } from '../config/product.js'
import { useDocumentTitle, useMediaQuery } from '../hooks/hooks.js'
import { downloadText, leadsToKml } from '../lib/geo.js'
import { countByOwnership, filterLeads } from '../lib/ownership.js'
import { bestEntry, getBand, toPercent } from '../lib/score.js'
import { selectActiveProfile, selectDncById, selectResultLeads } from '../store/selectors.js'

const PAGE_SIZE = 12

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

const ORDER_OPTIONS = [
  { id: 'found', label: 'Shuffled' },
  { id: 'score', label: 'Best fit first' },
]

const scoreOf = (lead) => Number(bestEntry(lead)?.score) || 0
const bandOf = (lead) => getBand(toPercent(bestEntry(lead)?.score)).key

/** Page numbers to show: first, last, and the pages around the current one, with gaps marked. */
function pageWindow(page, pages) {
  const wanted = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out = []
  wanted.forEach((n, i) => {
    if (i > 0 && n - wanted[i - 1] > 1) out.push('gap')
    out.push(n)
  })
  return out
}

function FilterGroup({ label, options, value, counts, onChange }) {
  return (
    <div role="group" aria-label={label}>
      <p className="section-label">{label}</p>
      <div className="filters">
        {options.map((f) => (
          <button key={f.id} type="button" className="filter" aria-pressed={value === f.id} onClick={() => onChange(f.id)}>
            {f.label}
            {counts ? <span className="filter-count">{counts[f.id] ?? 0}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className="filters">
      <button type="button" className="filter" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {pageWindow(page, pages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className="filter"
            aria-pressed={item === page}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" className="filter" disabled={page === pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
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
  const [earthNote, setEarthNote] = useState('')

  // Filters, order and page live in the address (?ownership=government&fit=strong&page=2), so they survive opening a lead.
  const [params, setParams] = useSearchParams()
  const pick = (key, options) => (options.some((o) => o.id === params.get(key)) ? params.get(key) : options[0].id)
  const owner = pick('ownership', OWNER_FILTERS)
  const fit = pick('fit', FIT_FILTERS)
  const order = pick('order', ORDER_OPTIONS)
  const setParam = (key, value, fallback) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === fallback) next.delete(key)
        else next.set(key, String(value))
        if (key !== 'page') next.delete('page') // a different filter or order starts again at page 1
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
  const filtered = useMemo(() => {
    const list = fit === 'all' ? byOwner : byOwner.filter((l) => bandOf(l) === fit)
    return order === 'score' ? [...list].sort((a, b) => scoreOf(b) - scoreOf(a)) : list
  }, [byOwner, fit, order])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page'), 10) || 1))
  const start = (page - 1) * PAGE_SIZE
  const shown = filtered.slice(start, start + PAGE_SIZE)
  const goToPage = (n) => {
    setParam('page', n, 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const where = lastQuery ? [lastQuery.city, lastQuery.region].filter(Boolean).join(', ') : ''
  const what = lastQuery ? industryLabel(lastQuery.sector, profile) : ''
  const summary = lastQuery
    ? `${leads.length} companies · ${what}${where ? ` in ${where}` : ''}`
    : `${leads.length} companies`

  const exportEarth = () => {
    const { kml, count, skipped } = leadsToKml(filtered, `Leads${where ? ` - ${where}` : ''}`)
    if (count === 0) {
      setEarthNote('None of these leads has map coordinates yet. Run the search again to load them.')
      return
    }
    const name = (where || 'leads').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    downloadText(`leads-${name || 'results'}.kml`, kml)
    setEarthNote(
      `Downloaded ${count} places${skipped ? ` (${skipped} skipped: no coordinates)` : ''}. In Google Earth, open the menu, choose Projects, then open or import a KML file from your computer (Google Earth Pro: File, then Open).`,
    )
  }

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
            onChange={(v) => setParam('ownership', v, 'all')}
          />
          <FilterGroup label="Fit" options={FIT_FILTERS} value={fit} counts={fitCounts} onChange={(v) => setParam('fit', v, 'all')} />
          <FilterGroup label="Order" options={ORDER_OPTIONS} value={order} onChange={(v) => setParam('order', v, 'found')} />
        </div>
        <p className="muted small">
          Government labels are best effort. Not verified means no government clue was found, so open a company and analyze its
          website to check.
        </p>

        <div className="toolbar">
          <p className="muted" role="status">
            {filtered.length === 0 ? 'No companies to show' : `Showing ${start + 1}-${start + shown.length} of ${filtered.length}`}
          </p>
          <Button variant="secondary" onClick={exportEarth} disabled={filtered.length === 0}>
            Open in Google Earth (KML)
          </Button>
        </div>
        {earthNote ? (
          <p className="muted small" role="status">
            {earthNote}
          </p>
        ) : null}

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

        <Pagination page={page} pages={pages} onChange={goToPage} />

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