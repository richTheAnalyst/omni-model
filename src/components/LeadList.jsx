import { memo } from 'react'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { added, removed, toggled } from '../store/selectionSlice.js'
import { Link, useNavigate } from 'react-router-dom'
import { StatusTag } from './TrackingParts.jsx'
import { bestEntry } from '../lib/score.js'
import EmailCell from './EmailCell.jsx'
import Icon from './Icon.jsx'
import { displayName, formatRating, hostname, safeUrl, telHref } from '../lib/format.js'
import { badgeText, ownershipOf } from '../lib/ownership.js'
import { directionsUrl, earthUrl } from '../lib/geo.js'
import { ScoreBadge } from './ScoreBadge.jsx'

function OwnerTag({ lead }) {
  const gov = ownershipOf(lead) === 'government'
  return (
    <span className={`tag ${gov ? 'tag-accent' : ''}`} title={lead.ownership_reason || undefined}>
      {badgeText(lead)}
    </span>
  )
}

function Flags({ lead, dnc }) {
  const analyzed = Boolean(lead.analysis)
  const tracked = useSelector((s) => s.tracking.byPlaceId[lead.id])
  return (
    <span className="flags">
      <OwnerTag lead={lead} />
      <StatusTag tracked={tracked} />
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
function MapLinks({ lead }) {
  const stop = (e) => e.stopPropagation()
  return (
    <span className="lead-card-links">
      <a href={earthUrl(lead)} target="_blank" rel="noopener noreferrer" className="chip-link" onClick={stop}>
        <Icon name="globe" size={13} /> Earth
      </a>
      <a href={directionsUrl(lead)} target="_blank" rel="noopener noreferrer" className="chip-link" onClick={stop}>
        <Icon name="arrow" size={13} /> Directions
      </a>
    </span>
  )
}
function Pick({ lead, dnc, selected, onToggle }) {
  return (
    <input
      type="checkbox"
      className="pick"
      checked={selected}
      disabled={dnc}
      onChange={() => onToggle(lead.id)}
      onClick={(e) => e.stopPropagation()}
      aria-label={dnc ? `${displayName(lead)} is marked do not contact` : `Select ${displayName(lead)}`}
      title={dnc ? 'Do not contact' : undefined}
    />
  )
}

const Row = memo(function Row({ lead, dnc, selected, onToggle }) {
  const navigate = useNavigate()
  const best = bestEntry(lead)
  const tel = telHref(lead.phone)
  const rating = formatRating(lead.rating, lead.review_count)
  const open = () => navigate(`/leads/${encodeURIComponent(lead.id)}`)

  return (
    <tr className={`row ${dnc ? 'is-dnc' : ''} ${selected ? 'is-picked' : ''}`} onClick={open}>
      <td className="cell-pick" onClick={(e) => e.stopPropagation()}>
        <Pick lead={lead} dnc={dnc} selected={selected} onToggle={onToggle} />
      </td>
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
        <span className="cell-email"><EmailCell lead={lead} /></span>
      </td>
      <td>
        <ExternalSite url={lead.website} />
      </td>
      <td>
        <MapLinks lead={lead} />
      </td>
    </tr>
  )
})

function useSelection(leads, dncById) {
  const dispatch = useDispatch()
  const ids = useSelector((s) => s.selection.ids)
  const picked = new Set(ids)
  const onToggle = useCallback((id) => dispatch(toggled(id)), [dispatch])
  const pickable = leads.filter((l) => !dncById[l.id]).map((l) => l.id)
  const allOn = pickable.length > 0 && pickable.every((id) => picked.has(id))
  const toggleAll = () => dispatch(allOn ? removed(pickable) : added(pickable))
  return { picked, onToggle, allOn, toggleAll, canAll: pickable.length > 0 }
}

export function LeadsTable({ leads, dncById }) {
  const { picked, onToggle, allOn, toggleAll, canAll } = useSelection(leads, dncById)
  return (
    <div className="panel table-panel">
      <table className="table">
        <caption className="sr-only">Companies found, best fit first</caption>
        <thead>
          <tr>
            <th scope="col" className="cell-pick">
              <input type="checkbox" className="pick" checked={allOn} disabled={!canAll} onChange={toggleAll} aria-label="Select all companies on this page" />
            </th>
            <th scope="col">Company</th>
            <th scope="col">Best-fit offering</th>
            <th scope="col">Score</th>
            <th scope="col">Rating</th>
            <th scope="col">Phone</th>
            <th scope="col">Website</th>
            <th scope="col">Map</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <Row key={lead.id} lead={lead} dnc={Boolean(dncById[lead.id])} selected={picked.has(lead.id)} onToggle={onToggle} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Card = memo(function Card({ lead, dnc, selected, onToggle }) {
  const best = bestEntry(lead)
  const tel = telHref(lead.phone)
  const site = safeUrl(lead.website)
  const rating = formatRating(lead.rating, lead.review_count)
  return (
    <li className={`lead-card ${dnc ? 'is-dnc' : ''} ${selected ? 'is-picked' : ''}`}>
      <label className="card-pick">
        <Pick lead={lead} dnc={dnc} selected={selected} onToggle={onToggle} />
        <span>{dnc ? 'Do not contact' : selected ? 'Selected' : 'Select'}</span>
      </label>
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
          <EmailCell lead={lead} compact />
          {site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" className="chip-link">
              <Icon name="globe" size={13} /> Website
            </a>
          ) : null}
        </span>
        <MapLinks lead={lead} />
      </div>
    </li>
  )
})

export function LeadCards({ leads, dncById }) {
  const { picked, onToggle, allOn, toggleAll, canAll } = useSelection(leads, dncById)
  return (
    <>
    <label className="card-pick card-pick-all">
      <input type="checkbox" className="pick" checked={allOn} disabled={!canAll} onChange={toggleAll} />
      <span>Select all on this page</span>
    </label>
    <ul className="lead-cards">
      {leads.map((lead) => (
        <Card key={lead.id} lead={lead} dnc={Boolean(dncById[lead.id])} selected={picked.has(lead.id)} onToggle={onToggle} />
      ))}
    </ul>
    </>
  )
}