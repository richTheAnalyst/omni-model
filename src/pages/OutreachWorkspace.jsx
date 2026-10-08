import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import BusinessForm from '../components/BusinessForm.jsx'
import Button, { LinkButton } from '../components/Button.jsx'
import DraftEditor from '../components/DraftEditor.jsx'
import Icon from '../components/Icon.jsx'
import { SelectField } from '../components/Fields.jsx'
import { EmptyState, ErrorPanel, Skeleton } from '../components/States.jsx'
import { COPY, OUTREACH_KINDS } from '../config/product.js'
import { offeringLabels } from '../config/profile.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { displayName } from '../lib/format.js'
import { clearedDoNotContact } from '../store/dncSlice.js'
import { draftEdited, errorDismissed, generateDraft } from '../store/outreachSlice.js'
import {
  draftKey,
  selectActiveProfile,
  selectBusiness,
  selectBusinessComplete,
  selectBusinessSnapshot,
  selectLeadById,
} from '../store/selectors.js'

export default function OutreachWorkspace() {
  const { leadId } = useParams()
  const [params, setParams] = useSearchParams()
  const dispatch = useDispatch()
  const lead = useSelector((s) => selectLeadById(s, leadId))
  const profile = useSelector(selectActiveProfile)
  const business = useSelector(selectBusiness)
  const businessComplete = useSelector(selectBusinessComplete)
  const dnc = useSelector((s) => s.dnc.byId[leadId])
  const drafts = useSelector((s) => s.outreach.drafts)
  const statuses = useSelector((s) => s.outreach.statusByKey)
  const businessSnapshot = useSelector((s) => selectBusinessSnapshot(s, lead.id, activeKind.id))
  const [kind, setKind] = useState('email')
  const tabRefs = useRef({})
  const name = lead ? displayName(lead) : 'Company'
  useDocumentTitle(`Outreach · ${name}`)

  // Scroll the page to the top when switching leads; the shell handles route changes.
  useEffect(() => {
    setKind('email')
  }, [leadId])

  if (!lead) {
    return (
      <div className="page">
        <EmptyState
          icon="mail"
          title="We can’t find that company"
          action={
            <LinkButton to="/outreach" variant="primary">
              Choose a company
            </LinkButton>
          }
        >
          It may be from an earlier search that is no longer on this device.
        </EmptyState>
      </div>
    )
  }

  const offerings = Object.keys(profile.offerings || {}).length
    ? offeringLabels(profile)
    : Object.fromEntries(Object.entries(lead.scores).map(([k, v]) => [k, v?.label || k]))
  const offeringKeys = Object.keys(offerings)
  const fromUrl = params.get('offering')
  // The offering is chosen from the URL, else by matching the service you typed in Settings
  // against the offering names, else the company's best fit.
  const serviceText = business.service.trim().toLowerCase()
  const matchedByService = serviceText
    ? offeringKeys.find((k) => {
        const label = String(offerings[k]).toLowerCase()
        return label.includes(serviceText) || serviceText.includes(label)
      })
    : undefined
  const offering =
    fromUrl && offeringKeys.includes(fromUrl)
      ? fromUrl
      : matchedByService || (offeringKeys.includes(lead.best_offering) ? lead.best_offering : offeringKeys[0])
  const offeringLabel = offerings[offering] || offering
  const bestLabel = offerings[lead.best_offering] || lead.scores[lead.best_offering]?.label || lead.best_offering

  const activeKind = OUTREACH_KINDS.find((k) => k.id === kind) || OUTREACH_KINDS[0]
  const key = draftKey(lead.id, activeKind.id)
  const draft = drafts[key]
  const status = statuses[key]
  const loading = status?.status === 'loading'

  const generate = () => dispatch(generateDraft({ leadId: lead.id, kind: activeKind.id, offering }))

  const onTabKey = (e) => {
    const i = OUTREACH_KINDS.findIndex((k) => k.id === kind)
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % OUTREACH_KINDS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + OUTREACH_KINDS.length) % OUTREACH_KINDS.length
    else return
    e.preventDefault()
    const id = OUTREACH_KINDS[next].id
    setKind(id)
    tabRefs.current[id]?.focus()
  }

  const setOffering = (value) => {
    const next = new URLSearchParams(params)
    next.set('offering', value)
    setParams(next, { replace: true })
  }

  const kindTitle = `${activeKind.label}: ${name}`.slice(0, 120)

  return (
    <div className="page">
      <Link to={`/leads/${encodeURIComponent(lead.id)}`} className="back-link">
        <Icon name="back" size={16} /> {name}
      </Link>

      <header className="page-head">
        <h1>Create outreach</h1>
      </header>

      <div className="outreach-head panel panel-flat">
        <dl className="target">
          <div>
            <dt>Target</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Recommended offering</dt>
            <dd>{bestLabel}</dd>
          </div>
          <div>
            <dt>Sending as</dt>
            <dd>
              {business.our_name || 'Not set yet'}
              {business.service ? <span className="muted small block">Marketing: {business.service}</span> : null}
              <Link to="/settings" className="inline-link small">
                {businessComplete ? 'Edit business details' : 'Add business details'}
              </Link>
            </dd>
          </div>
        </dl>
        <div className="offering-pick">
          <SelectField
            label="Write about"
            value={offering}
            onChange={setOffering}
            options={offeringKeys.map((k) => ({
              value: k,
              label: `${offerings[k]}${k === lead.best_offering ? ' (best fit)' : ''}`,
            }))}
          />
        </div>
      </div>

      {dnc ? (
        <div className="state state-error" role="status">
          <div className="state-icon" aria-hidden="true">
            <Icon name="block" size={20} />
          </div>
          <div className="state-body">
            <h3>Do not contact</h3>
            <p>You marked {name} as do not contact, so outreach is hidden. Remove the flag if that has changed.</p>
            <div className="state-actions">
              <Button variant="secondary" size="sm" onClick={() => dispatch(clearedDoNotContact(lead.id))}>
                Remove the flag
              </Button>
            </div>
          </div>
        </div>
      ) : !businessComplete ? (
        <BusinessForm
          heading="Before you draft: who is writing?"
          intro="Omni Model signs the draft with your details and mentions the service you market. Enter them once; they are saved on this device and used for every draft."
          submitLabel="Save and continue"
          onSaved={() => {}}
        />
      ) : !lead.name ? (
        <EmptyState icon="alert" title="This listing has no company name">
          Omni Model needs a company name to write outreach. Choose another company.
        </EmptyState>
      ) : (
        <section className="panel workspace" aria-label="Outreach draft">
          <p className="review-note" role="note">
            <Icon name="alert" size={16} />
            <span>
              <strong>{COPY.review}</strong> {COPY.reviewDetail}
            </span>
          </p>

          <div className="tabs" role="tablist" aria-label="Type of outreach" onKeyDown={onTabKey}>
            {OUTREACH_KINDS.map((k) => {
              const has = Boolean(drafts[draftKey(lead.id, k.id)])
              return (
                <button
                  key={k.id}
                  ref={(el) => {
                    tabRefs.current[k.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${k.id}`}
                  aria-selected={k.id === kind}
                  aria-controls="outreach-panel"
                  tabIndex={k.id === kind ? 0 : -1}
                  className="tab-btn"
                  onClick={() => setKind(k.id)}
                >
                  {k.label}
                  {has ? <span className="tab-dot" title="Draft ready" /> : null}
                  {has ? <span className="sr-only"> (draft ready)</span> : null}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id="outreach-panel" aria-labelledby={`tab-${kind}`} className="tab-panel">
            {loading ? (
              <div className="draft-loading" role="status" aria-live="polite">
                <p className="muted">{COPY.loading.outreach}</p>
                <Skeleton height={14} />
                <Skeleton width="92%" height={14} />
                <Skeleton width="84%" height={14} />
                <Skeleton width="60%" height={14} />
                <Skeleton height={14} />
                <Skeleton width="76%" height={14} />
              </div>
            ) : draft ? (
              <DraftEditor
                key={draft.generatedAt}
                draft={draft}
                kindLabel={activeKind.label}
                baseName={`${activeKind.slug}_${name}`}
                title={kindTitle}
                logLabel={{ name, kind: activeKind.id }}
                onCommit={(text) => dispatch(draftEdited({ leadId: lead.id, kind: activeKind.id, text }))}
                onRegenerate={generate}
                regenerating={loading}
                staleOffering={draft.offering !== offering ? offerings[draft.offering] || draft.offering : ''}
                staleBusiness={
                  businessSnapshot &&
                  (businessSnapshot.our_name !== business.our_name ||
                    businessSnapshot.our_title !== business.our_title ||
                    businessSnapshot.our_email !== business.our_email ||
                    businessSnapshot.our_phone !== business.our_phone)
                }
              />
            ) : (
              <>
                {status?.status === 'error' ? (
                  <ErrorPanel
                    error={status.error}
                    context="outreach"
                    onRetry={generate}
                    onDismiss={() => dispatch(errorDismissed(key))}
                  />
                ) : null}
                <EmptyState
                  icon="mail"
                  title={`No ${activeKind.label.toLowerCase()} draft yet`}
                  action={
                    <Button variant="primary" iconRight="arrow" onClick={generate}>
                      {activeKind.cta}
                    </Button>
                  }
                >
                  {activeKind.empty} It will be written about {offeringLabel}.
                </EmptyState>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
