import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { LinkButton } from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import {
  AnalysisPanel,
  BreakdownPanel,
  DncControl,
  ScoreCompare,
  SignalsPanel,
} from '../components/LeadParts.jsx'
import { BandLabel, ScoreBadge, ScoreRing } from '../components/ScoreBadge.jsx'
import { EmptyState } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { offeringLabels } from '../config/profile.js'
import { selectBusiness } from '../store/selectors.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { displayName, formatRating, hostname, safeUrl, telHref } from '../lib/format.js'
import { offeringEntries } from '../lib/score.js'
import { selectActiveProfile, selectLeadById } from '../store/selectors.js'

export default function LeadDetail() {
  const { leadId } = useParams()
  const lead = useSelector((s) => selectLeadById(s, leadId))
  const profile = useSelector(selectActiveProfile)
  const business = useSelector(selectBusiness)
  const dnc = useSelector((s) => Boolean(s.dnc.byId[leadId]))
  const [picked, setPicked] = useState(null)
  const name = lead ? displayName(lead) : 'Company'
  useDocumentTitle(name)

  const offerings = useMemo(() => (lead ? offeringEntries(lead) : []), [lead])
  const offeringLabelsMemo = useMemo(() => offeringLabels(profile, business.service), [profile, business.service])
  const offeringLabels = useMemo(() => {
    const map = { ...offeringLabelsMemo }
    for (const o of offerings) if (!map[o.key]) map[o.key] = o.label
    return map
  }, [offeringLabelsMemo, offerings])

  if (!lead) {
    return (
      <div className="page">
        <EmptyState
          icon="search"
          title="We can’t find that company"
          action={
            <LinkButton to="/leads" variant="primary">
              Back to results
            </LinkButton>
          }
        >
          It may be from an earlier search that is no longer on this device.
        </EmptyState>
      </div>
    )
  }

  const selectedKey = picked && lead.scores[picked] ? picked : lead.best_offering
  const selected = offerings.find((o) => o.key === selectedKey) || offerings[0]
  const sectorLabel = industryLabel(lead.sector, profile)
  const site = safeUrl(lead.website)
  const tel = telHref(lead.phone)
  const rating = formatRating(lead.rating, lead.review_count)

  return (
    <div className="page">
      <Link to="/leads" className="back-link">
        <Icon name="back" size={16} /> Search results
      </Link>

      <header className="lead-head">
        <div>
          <h1>{name}</h1>
          <p className="lead">
            {[lead.city, sectorLabel].filter(Boolean).join(' · ')}
          </p>
          {lead.address ? <p className="muted">{lead.address}</p> : null}
          <ul className="contact-line">
            {tel ? (
              <li>
                <a href={tel} className="inline-link">
                  <Icon name="phone" size={14} /> {lead.phone}
                </a>
              </li>
            ) : (
              <li className="muted">No phone listed</li>
            )}
            <li>
              {site ? (
                <a href={site} target="_blank" rel="noopener noreferrer" className="inline-link">
                  <Icon name="globe" size={14} /> {hostname(site)} <Icon name="external" size={12} />
                </a>
              ) : (
                <span className="muted">No website listed</span>
              )}
            </li>
            <li className="muted">
              {rating ? (
                <span className="rating">
                  <Icon name="star" size={13} /> {rating} reviews
                </span>
              ) : (
                'No rating yet'
              )}
            </li>
          </ul>
        </div>
        {dnc ? (
          <span className="tag tag-bad tag-lg">
            <Icon name="block" size={14} /> Do not contact
          </span>
        ) : null}
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel opportunity" aria-labelledby="opp-title">
            <header className="panel-head">
              <h2 id="opp-title">Opportunity score</h2>
              <p className="muted">
                How well {name} matches what you sell, from 0 to 100. Pick an offering to see its score.
              </p>
            </header>

            <div className="opp-body">
              <div className="opp-score">
                <ScoreRing score={selected?.score} caption="out of 100" />
                <div className="opp-meta">
                  <span className="opp-offer">{selected?.label}</span>
                  <span className="opp-badges">
                    {selectedKey === lead.best_offering ? <span className="tag tag-accent">Best fit</span> : null}
                    <BandLabel score={selected?.score} />
                  </span>
                  <span className="tag">{lead.analysis ? 'Website analyzed' : 'Estimated'}</span>
                </div>
              </div>

              <fieldset className="offer-list">
                <legend className="sr-only">Offering</legend>
                {offerings.map((o) => (
                  <label key={o.key} className={`offer ${o.key === selectedKey ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="offering"
                      value={o.key}
                      checked={o.key === selectedKey}
                      onChange={() => setPicked(o.key)}
                    />
                    <span className="offer-label">
                      {o.label}
                      {o.key === lead.best_offering ? <span className="offer-best">Best fit</span> : null}
                    </span>
                    <ScoreBadge score={o.score} showLabel={false} />
                  </label>
                ))}
              </fieldset>
            </div>

            {lead.analysis ? (
              <ScoreCompare lead={lead} offeringKey={selectedKey} offeringLabels={offeringLabels} />
            ) : null}
          </section>

          {selected ? <BreakdownPanel entry={selected} /> : null}
          {lead.analysis ? <SignalsPanel analysis={lead.analysis} /> : null}
        </div>

        <aside className="detail-side">
          <AnalysisPanel lead={lead} displayName={name} />

          <section className="panel panel-flat" aria-labelledby="out-title">
            <h2 id="out-title" className="panel-title">Outreach</h2>
            {dnc ? (
              <p className="muted">This company is marked do not contact, so outreach is hidden.</p>
            ) : (
              <>
                <p className="muted">
                  Draft an email, proposal or follow-up for <strong>{selected?.label}</strong>.
                </p>
                <LinkButton
                  to={`/outreach/${encodeURIComponent(lead.id)}?offering=${encodeURIComponent(selectedKey)}`}
                  variant="primary"
                  iconRight="arrow"
                  className="btn-block"
                >
                  Create outreach
                </LinkButton>
              </>
            )}
          </section>

          <DncControl lead={lead} displayName={name} />
        </aside>
      </div>
    </div>
  )
}
