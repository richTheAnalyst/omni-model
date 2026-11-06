import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import '../styles/bulk.css'
import { exportDraft, EXPORT_MAX_CHARS } from '../api/export.js'
import { serializeError } from '../api/client.js'
import Button, { LinkButton } from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import ProposalPdfDownload from '../components/ProposalPdfDownload.jsx'
import { SelectField } from '../components/Fields.jsx'
import { EmptyState } from '../components/States.jsx'
import { OUTREACH_KINDS, EXPORT_FORMATS } from '../config/product.js'
import { useCopy, useDocumentTitle } from '../hooks/hooks.js'
import { copyText, downloadBlob } from '../lib/download.js'
import { displayName, sanitizeFilename } from '../lib/format.js'
import { cancelBulk, retryOne } from '../store/bulkOutreach.js'
import { draftEdited, errorDismissed } from '../store/outreachSlice.js'
import { batchDiscarded } from '../store/selectionSlice.js'
import { selectActiveProfile, selectBusiness } from '../store/selectors.js'
import { offeringLabels } from '../config/profile.js'
import { pickOffering } from '../lib/offering.js'
import { draftKey } from '../store/selectors.js'

const DIVIDER = '\n\n----------------------------------------\n\n'

/** Splits text pieces into groups that each stay under the export limit. */
export function chunkTexts(pieces, limit = EXPORT_MAX_CHARS - 1000) {
  const groups = []
  let current = []
  let size = 0
  for (const piece of pieces) {
    const add = piece.length + DIVIDER.length
    if (current.length && size + add > limit) {
      groups.push(current)
      current = []
      size = 0
    }
    current.push(piece)
    size += add
  }
  if (current.length) groups.push(current)
  return groups
}

const DraftRow = memo(function DraftRow({ lead, kind, draft, status }) {
  const dispatch = useDispatch()
  const [value, setValue] = useState(draft?.text || '')
  const [copyState, copy] = useCopy()
  const ref = useRef(null)
  const generatedAt = draft?.generatedAt
  useEffect(() => setValue(draft?.text || ''), [generatedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const loading = status?.status === 'loading'
  const failed = status?.status === 'error'

  return (
    <li className="bulk-row">
      <div className="bulk-row-head">
        <Link to={`/leads/${encodeURIComponent(lead.id)}`} className="row-link">
          {displayName(lead)}
        </Link>
        <span className="muted small">{lead.city || ''}</span>
        {loading ? <span className="tag">Writing…</span> : null}
        {draft && !loading ? <span className="tag tag-good">Ready</span> : null}
        {failed ? <span className="tag tag-bad">Failed</span> : null}
      </div>
      {failed ? (
        <p className="notice notice-warn" role="alert">
          {status.error?.detail || 'We could not write this one.'}{' '}
          <button type="button" className="link-button" onClick={() => dispatch(retryOne(lead.id, kind))}>
            Try again
          </button>
        </p>
      ) : null}
      {draft ? (
        <>
          <textarea
            ref={ref}
            rows={9}
            value={value}
            aria-label={`${kind} for ${displayName(lead)}`}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => value !== draft.text && dispatch(draftEdited({ leadId: lead.id, kind, text: value }))}
          />
          <div className="bulk-row-actions">
            <Button size="sm" icon={copyState === 'copied' ? 'check' : 'copy'} onClick={() => copy(value, ref.current)}>
              {copyState === 'copied' ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" icon="refresh" loading={loading} onClick={() => dispatch(retryOne(lead.id, kind))}>
              Rewrite
            </Button>
          </div>
        </>
      ) : loading ? (
        <p className="muted small">Writing this draft…</p>
      ) : null}
    </li>
  )
})

export default function BulkOutreach() {
  useDocumentTitle('Bulk outreach')
  const dispatch = useDispatch()
  const batch = useSelector((s) => s.selection.batch)
  const leads = useSelector((s) => s.leads.entities)
  const drafts = useSelector((s) => s.outreach.drafts)
  const statuses = useSelector((s) => s.outreach.statusByKey)
  const [kind, setKind] = useState(null)
  const [format, setFormat] = useState('docx')
  const [dl, setDl] = useState({ busy: false, msg: '', err: '' })
  const [copyAll, setCopyAll] = useState('')
  const profile = useSelector(selectActiveProfile)
  const business = useSelector(selectBusiness)

  const kinds = useMemo(() => OUTREACH_KINDS.filter((k) => batch?.kinds.includes(k.id)), [batch])
  const active = kinds.find((k) => k.id === kind) || kinds[0]

  if (!batch || !active) {
    return (
      <div className="page">
        <EmptyState
          icon="mail"
          title="No bulk drafts yet"
          action={
            <LinkButton to="/leads" variant="primary">
              Go to Leads
            </LinkButton>
          }
        >
          Tick the companies you want on the Leads page, choose what to write, and they will appear here.
        </EmptyState>
      </div>
    )
  }

  const rows = batch.leadIds.map((id) => leads[id]).filter(Boolean)
  const ready = rows.filter((l) => drafts[draftKey(l.id, active.id)])
  const failedCount = rows.filter((l) => statuses[draftKey(l.id, active.id)]?.status === 'error').length
  const pct = batch.total ? Math.round((batch.done / batch.total) * 100) : 100

  const textFor = (l) => `${displayName(l)}\n\n${drafts[draftKey(l.id, active.id)].text}`

  const doCopyAll = async () => {
    const ok = await copyText(ready.map(textFor).join(DIVIDER))
    setCopyAll(ok ? 'Copied' : 'Could not copy. Use download instead.')
    setTimeout(() => setCopyAll(''), 2500)
  }

  const doDownload = async () => {
    const groups = chunkTexts(ready.map(textFor))
    setDl({ busy: true, msg: '', err: '' })
    try {
      for (let i = 0; i < groups.length; i += 1) {
        const suffix = groups.length > 1 ? `_part${i + 1}` : ''
        const filename = sanitizeFilename(`${active.slug}_bulk${suffix}`)
        const blob = await exportDraft({ text: groups[i].join(DIVIDER), format, title: `${active.label}s`, filename })
        downloadBlob(blob, `${filename}.${format}`)
      }
      setDl({ busy: false, msg: `Downloaded ${groups.length} file${groups.length === 1 ? '' : 's'}.`, err: '' })
    } catch (err) {
      setDl({ busy: false, msg: '', err: serializeError(err).detail || 'The download failed. Try again.' })
    }
  }

  const retryFailed = () =>
    rows.forEach((l) => {
      if (statuses[draftKey(l.id, active.id)]?.status === 'error') dispatch(retryOne(l.id, active.id))
    })

  return (
    <div className="page">
      <Link to="/leads" className="back-link">
        <Icon name="back" size={16} /> Leads
      </Link>
      <header className="page-head">
        <h1>Bulk outreach</h1>
        <p className="lead">
          {rows.length} {rows.length === 1 ? 'company' : 'companies'} · {kinds.map((k) => k.label).join(', ')}
        </p>
      </header>

      {batch.running ? (
        <div className="panel panel-flat bulk-progress" role="status" aria-live="polite">
          <div className="bulk-bar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
          <span>
            Writing {batch.done} of {batch.total}…
          </span>
          <Button size="sm" variant="ghost" onClick={() => dispatch(cancelBulk())}>
            Stop
          </Button>
        </div>
      ) : null}

      <p className="review-note" role="note">
        <Icon name="alert" size={16} />
        <span>
          <strong>Read each one before you send it.</strong> Drafts are written from templates and your business details. Edit anything, then copy or download.
        </span>
      </p>

      <section className="panel workspace">
        <div className="tabs" role="tablist" aria-label="Type of outreach">
          {kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={k.id === active.id}
              className="tab-btn"
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="bulk-tools">
          <span className="muted small">
            {ready.length} of {rows.length} ready{failedCount ? ` · ${failedCount} failed` : ''}
          </span>
          <Button size="sm" icon="copy" disabled={ready.length === 0} onClick={doCopyAll}>
            {copyAll || 'Copy all'}
          </Button>
          <SelectField
            label="Format"
            value={format}
            onChange={setFormat}
            options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label.replace('Export as ', '') }))}
          />
          <Button size="sm" variant="primary" icon="download" loading={dl.busy} disabled={ready.length === 0} onClick={doDownload}>
            Download all
          </Button>
          {failedCount && !batch.running ? (
            <Button size="sm" variant="ghost" onClick={retryFailed}>
              Retry failed
            </Button>
          ) : null}
        </div>
        {active.id === 'proposal' && rows.length ? (
          <ProposalPdfDownload
            items={rows.map((lead) => {
              const labels = offeringLabels(profile, business.service)
              return { lead, offeringLabel: labels[pickOffering(profile, business, lead)] || '' }
            })}
          />
        ) : null}
        {dl.msg ? <p className="small export-done" role="status">{dl.msg}</p> : null}
        {dl.err ? <p className="notice notice-warn" role="alert">{dl.err}</p> : null}

        <ul className="bulk-list">
          {rows.map((lead) => {
            const key = draftKey(lead.id, active.id)
            return <DraftRow key={key} lead={lead} kind={active.id} draft={drafts[key]} status={statuses[key]} />
          })}
        </ul>
      </section>

      <div>
        <Button variant="ghost" onClick={() => dispatch(batchDiscarded())}>
          Close this batch
        </Button>
      </div>
    </div>
  )
}