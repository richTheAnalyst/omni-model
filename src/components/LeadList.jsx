import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { displayName, formatRating, hostname, safeUrl, telHref } from '../lib/format.js'
import { bestEntry } from '../lib/score.js'
import Icon from './Icon.jsx'
import { ScoreBadge } from './ScoreBadge.jsx'

function Flags({ lead, dnc }) {
  const analyzed = Boolean(lead.analysis)
  if (!dnc && !analyzed) return null
  return (
    <span className="flags">
      {dnc ? (
        <span className="tag tag-bad">
          <Icon name="block" size={12} /> Do not contact
        </span>
      ) : null}
      {analyzed ? (
        <span className="tag tag-accent">
          <Icon name="check" size={12} /> Website analyzed
        </span>
      ) : null}
    </span>
  )
}

function ExternalSite({ url }) {
  const href = safeUrl(url)
  if (!href) return <span className="muted">No website</span>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-link" onClick={(e) => e.stopPropagation()}>
      {hostname(href)}
      <Icon name="external" size={12} />
    </a>
  )
}

const Row = memo(function Row({ lead, dnc }) {
  const navigate = useNavigate()
  const best = bestEntry(lead)
  const tel = telHref(lead.phone)
  const rating = formatRating(lead.rating, lead.review_count)
  const open = () => navigate(`/leads/${encodeURIComponent(lead.id)}`)

  return (
    <tr className={`row ${dnc ? 'is-dnc' : ''}`} onClick={open}>
      <td className="cell-main">
        <Link to={`/leads/${encodeURIComponent(lead.id)}`} className="row-link" onClick={(e) => e.stopPropagation()}>
          {displayName(lead)}
        </Link>
        <span className="muted small clamp-1">{lead.address || lead.city || 'No address listed'}</span>
        <Flags lead={lead} dnc={dnc} />
      </td>
      <td>
        <span className="offer-name">{best?.label || '—'}</span>
        <span className="muted small">{lead.analysis ? 'Website analyzed' : 'Estimated'}</span>
      </td>
      <td className="cell-score">{best ? <ScoreBadge score={best.score} /> : <span className="muted">—</span>}</td>
      <td className="cell-num">{rating ? <span className="rating"><Icon name="star" size={13} /> {rating}</span> : <span className="muted">No rating</span>}</td>
      <td>
        {tel ? (
          <a href={tel} className="inline-link" onClick={(e) => e.stopPropagation()}>
            {lead.phone}
          </a>
        ) : (
          <span className="muted">No phone</span>
        )}
      </td>
      <td>
        <ExternalSite url={lead.website} />
      </td>
    </tr>
  )
})

export function LeadsTable({ leads, dncById }) {
  return (
    <div className="panel table-panel">
      <table className="table">
        <caption className="sr-only">Companies found, best fit first</caption>
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Best-fit offering</th>
            <th scope="col">Score</th>
            <th scope="col">Rating</th>
            <th scope="col">Phone</th>
            <th scope="col">Website</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <Row key={lead.id} lead={lead} dnc={Boolean(dncById[lead.id])} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Card = memo(function Card({ lead, dnc }) {
  const best = bestEntry(lead)
  const tel = telHref(lead.phone)
  const site = safeUrl(lead.website)
  const rating = formatRating(lead.rating, lead.review_count)
  return (
    <li className={`lead-card ${dnc ? 'is-dnc' : ''}`}>
      <Link to={`/leads/${encodeURIComponent(lead.id)}`} className="lead-card-main">
        <span className="lead-card-top">
          <strong className="lead-card-name">{displayName(lead)}</strong>
          {best ? <ScoreBadge score={best.score} /> : null}
        </span>
        <span className="muted small clamp-2">{lead.address || lead.city || 'No address listed'}</span>
        <span className="lead-card-offer">
          <span className="eyebrow">Best fit</span> {best?.label || '—'}
          <span className="muted"> · {lead.analysis ? 'Website analyzed' : 'Estimated'}</span>
        </span>
        <Flags lead={lead} dnc={dnc} />
      </Link>
      <div className="lead-card-meta">
        <span className="rating">
          <Icon name="star" size={13} /> {rating || 'No rating'}
        </span>
        <span className="lead-card-links">
          {tel ? (
            <a href={tel} className="chip-link">
              <Icon name="phone" size={13} /> Call
            </a>
          ) : null}
          {site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" className="chip-link">
              <Icon name="globe" size={13} /> Website
            </a>
          ) : null}
        </span>
      </div>
    </li>
  )
})

export function LeadCards({ leads, dncById }) {
  return (
    <ul className="lead-cards">
      {leads.map((lead) => (
        <Card key={lead.id} lead={lead} dnc={Boolean(dncById[lead.id])} />
      ))}
    </ul>
  )
}
