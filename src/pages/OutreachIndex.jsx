import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { LinkButton } from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { ScoreBadge } from '../components/ScoreBadge.jsx'
import { EmptyState } from '../components/States.jsx'
import { COPY, OUTREACH_KINDS } from '../config/product.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { displayName, timeAgo } from '../lib/format.js'
import { bestEntry } from '../lib/score.js'
import {
  selectDncById,
  selectDraftSummaries,
  selectLeadEntities,
  selectResultLeads,
} from '../store/selectors.js'

function LeadItem({ lead, kinds = [], at, dnc }) {
  const best = bestEntry(lead)
  return (
    <li>
      <Link to={`/outreach/${encodeURIComponent(lead.id)}`} className="pick">
        <span className="pick-main">
          <strong>{displayName(lead)}</strong>
          <span className="muted small">
            {[lead.city, best?.label].filter(Boolean).join(' · ')}
          </span>
          <span className="flags">
            {OUTREACH_KINDS.filter((k) => kinds.includes(k.id)).map((k) => (
              <span key={k.id} className="tag">
                <Icon name="check" size={12} /> {k.label}
              </span>
            ))}
            {dnc ? (
              <span className="tag tag-bad">
                <Icon name="block" size={12} /> Do not contact
              </span>
            ) : null}
            {at ? <span className="muted small">{timeAgo(at)}</span> : null}
          </span>
        </span>
        {best ? <ScoreBadge score={best.score} showLabel={false} /> : null}
        <Icon name="arrow" size={16} />
      </Link>
    </li>
  )
}

export default function OutreachIndex() {
  useDocumentTitle('Outreach')
  const results = useSelector(selectResultLeads)
  const summaries = useSelector(selectDraftSummaries)
  const entities = useSelector(selectLeadEntities)
  const dncById = useSelector(selectDncById)

  const inProgress = useMemo(
    () => summaries.filter((s) => entities[s.leadId]).map((s) => ({ ...s, lead: entities[s.leadId] })),
    [summaries, entities],
  )
  const draftIds = useMemo(() => new Set(inProgress.map((d) => d.leadId)), [inProgress])
  const others = useMemo(() => results.filter((l) => !draftIds.has(l.id)), [results, draftIds])

  const nothing = inProgress.length === 0 && results.length === 0

  return (
    <div className="page page-narrow-wide">
      <header className="page-head">
        <p className="eyebrow">Create outreach</p>
        <h1>Outreach</h1>
        <p className="lead">Choose a company to write an email, a proposal or a follow-up.</p>
      </header>

      <p className="review-note review-note-block" role="note">
        <Icon name="alert" size={16} />
        <span>
          <strong>{COPY.review}</strong> {COPY.reviewDetail}
        </span>
      </p>

      {nothing ? (
        <EmptyState
          icon="mail"
          title="No companies to write to yet"
          action={
            <LinkButton to="/find" variant="primary" iconRight="arrow">
              Find Leads
            </LinkButton>
          }
        >
          Outreach starts from a company. Run a search, open a lead, then create outreach for the offering that fits.
        </EmptyState>
      ) : (
        <>
          {inProgress.length > 0 ? (
            <section className="section" aria-labelledby="progress-title">
              <div className="section-head">
                <h2 id="progress-title">Drafts in progress</h2>
                <span className="tag">Stored on this device</span>
              </div>
              <ul className="pick-list panel">
                {inProgress.map((d) => (
                  <LeadItem key={d.leadId} lead={d.lead} kinds={d.kinds} at={d.at} dnc={Boolean(dncById[d.leadId])} />
                ))}
              </ul>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section className="section" aria-labelledby="latest-title">
              <div className="section-head">
                <h2 id="latest-title">From your latest search</h2>
              </div>
              <ul className="pick-list panel">
                {others.map((lead) => (
                  <LeadItem key={lead.id} lead={lead} dnc={Boolean(dncById[lead.id])} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
