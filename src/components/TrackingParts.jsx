import { useEffect, useId, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { accountsEnabled } from '../api/auth.js'
import {
  describeEvent,
  dateToIso,
  followUpOf,
  formatDay,
  LOG_ACTIONS,
  LOST_REASONS,
  STATUS_LABEL,
  STATUSES,
  todayInputValue,
  trackingErrorMessage,
} from '../config/trackingUi.js'
import { timeAgo } from '../lib/format.js'
import { ExportLeadButton } from './ExportLeads.jsx'
import {
  changeStatus,
  loadDetail,
  logEvent,
  recordOutcome,
  removeTracked,
  saveToTracking,
  setFollowUp,
  setTrackedDnc,
  trackingErrorCleared,
} from '../store/trackingSlice.js'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

/** Small coloured tag showing where a saved lead stands. Renders nothing for a lead that is not saved. */
export function StatusTag({ tracked }) {
  if (!tracked) return null
  const cls = tracked.status === 'won' ? 'tag-good' : tracked.status === 'lost' || tracked.status === 'not_interested' ? 'tag-bad' : 'tag-accent'
  return <span className={`tag ${cls}`}>{STATUS_LABEL[tracked.status] || tracked.status}</span>
}

/** "Save lead" for signed-in users. Also copies a local do-not-contact flag to the server so it is enforced there. */
export function SaveLeadButton({ lead, size = 'md', block = false }) {
  const dispatch = useDispatch()
  const signedIn = useSelector((s) => s.account.status === 'signedIn')
  const tracked = useSelector((s) => s.tracking.byPlaceId[lead.id])
  const busy = useSelector((s) => Boolean(s.tracking.busy[lead.id]))
  const localDnc = useSelector((s) => Boolean(s.dnc.byId[lead.id]))
  if (!signedIn || tracked) return null

  const save = async () => {
    const res = await dispatch(saveToTracking(lead))
    if (saveToTracking.fulfilled.match(res) && localDnc) dispatch(setTrackedDnc({ placeId: lead.id, value: true }))
  }
  return (
    <Button variant="primary" size={size} icon="check" loading={busy} onClick={save} className={block ? 'btn-block' : ''}>
      Save lead
    </Button>
  )
}

function ActionError({ placeId }) {
  const dispatch = useDispatch()
  const failed = useSelector((s) => s.tracking.actionError)
  if (!failed || failed.placeId !== placeId) return null
  return (
    <p className="notice notice-warn" role="alert">
      <Icon name="alert" size={16} />
      <span>
        {trackingErrorMessage(failed.error)}{' '}
        <button type="button" className="link-button" onClick={() => dispatch(trackingErrorCleared())}>
          Dismiss
        </button>
      </span>
    </p>
  )
}

function FollowUp({ lead, tracked, disabled }) {
  const dispatch = useDispatch()
  const id = useId()
  const [date, setDate] = useState('')
  const due = followUpOf(tracked)
  const set = () => {
    const at = dateToIso(date)
    if (at) dispatch(setFollowUp({ placeId: lead.id, at })).then(() => setDate(''))
  }
  return (
    <div className="track-block">
      <p className="eyebrow">Follow-up reminder</p>
      {due ? (
        <p className={due.overdue ? 'track-due is-overdue' : 'track-due'}>
          {due.overdue ? 'Due ' : 'Set for '}
          {formatDay(due.at)}
          {due.overdue ? ' (overdue)' : ''}{' '}
          <button type="button" className="link-button" disabled={disabled} onClick={() => dispatch(setFollowUp({ placeId: lead.id, at: null }))}>
            Clear
          </button>
        </p>
      ) : (
        <p className="muted small">No reminder set.</p>
      )}
      <div className="track-inline">
        <label htmlFor={id} className="sr-only">
          Remind me on
        </label>
        <input id={id} type="date" value={date} min={todayInputValue()} onChange={(e) => setDate(e.target.value)} disabled={disabled} />
        <Button size="sm" onClick={set} disabled={disabled || !date}>
          Set
        </Button>
      </div>
    </div>
  )
}

function OutcomeForm({ lead, tracked, outcome, onDone }) {
  const dispatch = useDispatch()
  const busy = useSelector((s) => Boolean(s.tracking.busy[lead.id]))
  const [result, setResult] = useState(outcome?.result || (tracked.status === 'lost' ? 'lost' : 'won'))
  const [value, setValue] = useState(outcome?.deal_value != null ? String(outcome.deal_value) : '')
  const [currency, setCurrency] = useState(outcome?.currency || 'GHS')
  const [reason, setReason] = useState(outcome?.lost_reason || '')
  const [competitor, setCompetitor] = useState(outcome?.competitor_name || '')
  const [notes, setNotes] = useState(outcome?.notes || '')
  const uid = useId()

  const submit = async (e) => {
    e.preventDefault()
    const body = { placeId: lead.id, result }
    if (notes.trim()) body.notes = notes.trim()
    if (result === 'won') {
      const n = Number(value)
      if (value.trim() && Number.isFinite(n) && n >= 0) {
        body.deal_value = n
        body.currency = currency.trim() || undefined
      }
    } else {
      if (reason) body.lost_reason = reason
      if (competitor.trim()) body.competitor_name = competitor.trim()
    }
    const res = await dispatch(recordOutcome(body))
    if (recordOutcome.fulfilled.match(res)) onDone()
  }

  return (
    <form className="track-block track-form" onSubmit={submit}>
      <div className="filters" role="group" aria-label="Result">
        {['won', 'lost'].map((r) => (
          <button key={r} type="button" className="filter" aria-pressed={result === r} onClick={() => setResult(r)}>
            {r === 'won' ? 'Won' : 'Lost'}
          </button>
        ))}
      </div>
      {result === 'won' ? (
        <div className="track-inline">
          <div className="field">
            <label htmlFor={`${uid}-v`}>Deal value (optional)</label>
            <input id={`${uid}-v`} type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="field track-currency">
            <label htmlFor={`${uid}-c`}>Currency</label>
            <input id={`${uid}-c`} type="text" maxLength={8} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor={`${uid}-r`}>Why was it lost?</label>
            <div className="select-wrap">
              <select id={`${uid}-r`} value={reason} onChange={(e) => setReason(e.target.value)}>
                {LOST_REASONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {reason === 'competitor' ? (
            <div className="field">
              <label htmlFor={`${uid}-k`}>Which competitor?</label>
              <input id={`${uid}-k`} type="text" maxLength={200} value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
            </div>
          ) : null}
        </>
      )}
      <div className="field">
        <label htmlFor={`${uid}-n`}>Feedback (optional)</label>
        <textarea id={`${uid}-n`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="track-inline">
        <Button type="submit" variant="primary" size="sm" loading={busy}>
          Save result
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function History({ events, status }) {
  if (status === 'loading' && events.length === 0) return <p className="muted small">Loading history...</p>
  if (events.length === 0) return <p className="muted small">Nothing logged yet. Log a call or message above.</p>
  return (
    <ol className="track-history">
      {events.map((e) => (
        <li key={e.id}>
          <span className="track-what">{describeEvent(e)}</span>
          {e.detail?.note ? <span className="track-note">{e.detail.note}</span> : null}
          <span className="muted small">
            {timeAgo(Date.parse(e.occurred_at))}
            {e.by ? ` · ${e.by}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** The tracking card on the lead page: save, status, log calls and messages, notes, reminder, result, history. */
export function TrackingPanel({ lead }) {
  const dispatch = useDispatch()
  const accountStatus = useSelector((s) => s.account.status)
  const tracked = useSelector((s) => s.tracking.byPlaceId[lead.id])
  const detail = useSelector((s) => s.tracking.detail[lead.id])
  const busy = useSelector((s) => Boolean(s.tracking.busy[lead.id]))
  const [note, setNote] = useState('')
  const [closing, setClosing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const noteId = useId()
  const statusId = useId()

  // Reload the history whenever the saved lead changes (every change returns a newer updated_at).
  const stamp = tracked ? `${tracked.id}|${tracked.updated_at}|${tracked.status}` : ''
  useEffect(() => {
    if (tracked) dispatch(loadDetail({ placeId: lead.id }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, dispatch, lead.id])

  if (!accountsEnabled) return null

  if (accountStatus !== 'signedIn') {
    return (
      <section className="panel panel-flat" aria-labelledby="trk-title">
        <h2 id="trk-title" className="panel-title">Track this lead</h2>
        <p className="muted">
          {accountStatus === 'checking'
            ? 'Checking your sign-in...'
            : 'Sign in to save this company and keep a record of every call, message and result.'}
        </p>
        {accountStatus === 'guest' ? (
          <Link to="/account" className="btn btn-primary btn-md btn-block">
            <span>Sign in or create an account</span>
          </Link>
        ) : null}
      </section>
    )
  }

  if (!tracked) {
    return (
      <section className="panel panel-flat" aria-labelledby="trk-title">
        <h2 id="trk-title" className="panel-title">Track this lead</h2>
        <p className="muted">Save it to your account to log calls and messages, set reminders and record the result.</p>
        <SaveLeadButton lead={lead} block />
        <ActionError placeId={lead.id} />
      </section>
    )
  }

  const events = detail?.events || []
  const closed = tracked.status === 'won' || tracked.status === 'lost'
  const dnc = tracked.do_not_contact
  const log = (type, extra = {}) => dispatch(logEvent({ placeId: lead.id, type, ...extra }))
  const addNote = async () => {
    if (!note.trim()) return
    const res = await log('note', { note: note.trim() })
    if (logEvent.fulfilled.match(res)) setNote('')
  }
  const remove = async () => {
    await dispatch(removeTracked({ placeId: lead.id }))
    setConfirmRemove(false)
  }

  return (
    <section className="panel panel-flat track" aria-labelledby="trk-title">
      <header className="track-head">
        <h2 id="trk-title" className="panel-title">Tracking</h2>
        <StatusTag tracked={tracked} />
      </header>
      <ActionError placeId={lead.id} />
      <ExportLeadButton tracked={tracked} />

      <div className="field">
        <label htmlFor={statusId}>Status</label>
        <div className="select-wrap">
          <select
            id={statusId}
            value={tracked.status}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value === 'won' || e.target.value === 'lost') setClosing(true)
              else dispatch(changeStatus({ placeId: lead.id, status: e.target.value }))
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <p className="field-hint">
          {tracked.contact_attempts
            ? `${tracked.contact_attempts} contact${tracked.contact_attempts === 1 ? '' : 's'} so far${tracked.last_contacted_at ? `, last ${timeAgo(Date.parse(tracked.last_contacted_at))}` : ''}.`
            : 'Not contacted yet.'}{' '}
          Logging a call or message moves a new lead to Contacted for you.
        </p>
      </div>

      {closing || closed ? (
        closing ? (
          <OutcomeForm lead={lead} tracked={tracked} outcome={detail?.outcome} onDone={() => setClosing(false)} />
        ) : (
          <div className="track-block">
            <p className="eyebrow">Result</p>
            <p>
              {tracked.status === 'won' ? 'Won' : 'Lost'}
              {detail?.outcome?.deal_value != null ? ` · ${detail.outcome.currency || ''} ${detail.outcome.deal_value}` : ''}
              {detail?.outcome?.lost_reason ? ` · ${LOST_REASONS.find((r) => r.value === detail.outcome.lost_reason)?.label || ''}` : ''}
            </p>
            {detail?.outcome?.notes ? <p className="muted small">{detail.outcome.notes}</p> : null}
            <Button size="sm" onClick={() => setClosing(true)}>
              Edit result
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="track-block">
            <p className="eyebrow">Log what you did</p>
            {dnc ? <p className="muted small">This company is marked do not contact, so contact logging is off. Notes still work.</p> : null}
            <div className="filters">
              {LOG_ACTIONS.map((a) => (
                <button key={a.type} type="button" className="filter" disabled={busy || dnc} onClick={() => log(a.type)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <FollowUp lead={lead} tracked={tracked} disabled={busy} />
          <div className="track-block">
            <Button size="sm" variant="primary" onClick={() => setClosing(true)}>
              Close as won or lost
            </Button>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor={noteId}>Add a note</label>
        <textarea id={noteId} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they say? What happens next?" />
        <div>
          <Button size="sm" onClick={addNote} disabled={busy || !note.trim()}>
            Save note
          </Button>
        </div>
      </div>

      <div className="track-block">
        <p className="eyebrow">History</p>
        <History events={events} status={detail?.status} />
      </div>

      <div className="track-block track-remove">
        {confirmRemove ? (
          <>
            <p className="muted small">Remove this lead and its whole history from your account?</p>
            <div className="track-inline">
              <Button size="sm" variant="danger" loading={busy} onClick={remove}>
                Yes, remove it
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                Keep it
              </Button>
            </div>
          </>
        ) : (
          <button type="button" className="link-button" onClick={() => setConfirmRemove(true)}>
            Remove from my saved leads
          </button>
        )}
      </div>
    </section>
  )
}