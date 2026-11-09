import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useStore, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import '../styles/design-send.css'
import { serializeError } from '../api/client.js'
import { emailStatus, sendEmail } from '../api/email.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import useProposalTemplate from '../hooks/useProposalTemplate.js'
import { displayName, sanitizeFilename } from '../lib/format.js'
import { isEmail, leadEmail } from '../lib/leadEmail.js'
import { coverNote, suggestSubject } from '../lib/subject.js'
import { draftKey, selectBusiness } from '../store/selectors.js'
import { loadTracking } from '../store/trackingSlice.js'
import { proposalBody } from './ProposalPdfDownload.jsx'
import Button from './Button.jsx'

const NONE = {}
const PAUSE_MS = 400 // a short gap between sends, so mail services do not treat a batch as a burst

const STATE_LABEL = { sending: 'Sending…', sent: 'Sent', failed: 'Failed', skipped: 'Skipped' }

/**
 * Send the drafts on this page by email, one message per company, each to its own address.
 * Props: rows (leads with a ready draft), kind ('email' | 'proposal' | 'followup'), drafts (draftKey -> {text}),
 *        offeringFor(lead) -> label.
 * The message is the draft shown above (edit it there); the address and subject are edited here.
 */
export default function BulkSendPanel({ rows, kind, drafts, offeringFor }) {
  const dispatch = useDispatch()
  const store = useStore()
  const business = useSelector(selectBusiness)
  const signedIn = useSelector((s) => s.account.status === 'signedIn')
  const tracked = useSelector((s) => s.tracking.byPlaceId)
  const { template } = useProposalTemplate()

  const [addr, setAddr] = useState({})
  const [subj, setSubj] = useState({})
  const [attach, setAttach] = useState('auto')
  const [status, setStatus] = useState(null)
  const [step, setStep] = useState('edit') // edit | confirm | running | done
  const [res, setRes] = useState({})
  const [stopNote, setStopNote] = useState('')
  const stop = useRef(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false; stop.current = true }, [])

  useEffect(() => {
    if (!signedIn) return undefined
    const ctl = new AbortController()
    emailStatus({ signal: ctl.signal }).then((s) => alive.current && setStatus(s)).catch(() => {})
    return () => ctl.abort()
  }, [signedIn])

  const choice = kind !== 'proposal' ? 'none' : attach !== 'auto' ? attach : template ? 'designed' : 'text'
  const addressOf = (lead) => (lead.id in addr ? addr[lead.id] : leadEmail(lead, tracked[lead.id])).trim()
  const subjectOf = (lead) =>
    lead.id in subj ? subj[lead.id] : suggestSubject({ kind, company: displayName(lead), offering: offeringFor(lead), ourName: business.our_name })

  // Who will actually get an email: a valid address, not used by an earlier row, not already sent.
  const plan = useMemo(() => {
    const seen = new Set()
    return rows.map((lead) => {
      const to = (lead.id in addr ? addr[lead.id] : leadEmail(lead, tracked[lead.id])).trim()
      const subject = (lead.id in subj ? subj[lead.id] : suggestSubject({ kind, company: displayName(lead), offering: offeringFor(lead), ourName: business.our_name })).trim()
      let skip = ''
      if (res[lead.id]?.state === 'sent') skip = 'sent'
      else if (!to) skip = 'No address'
      else if (!isEmail(to)) skip = 'Address looks wrong'
      else if (seen.has(to.toLowerCase())) skip = 'Same address as another row'
      else if (!subject) skip = 'No subject'
      if (!skip) seen.add(to.toLowerCase())
      return { lead, to, subject, skip }
    })
  }, [rows, addr, subj, res, tracked, kind, business.our_name, offeringFor])

  const toSend = plan.filter((p) => !p.skip)
  const remaining = status ? Math.max(0, status.daily_limit - status.sent_today) : null
  const overLimit = remaining !== null && toSend.length > remaining
  const serverOff = signedIn && status && !status.enabled
  const sentCount = rows.filter((l) => res[l.id]?.state === 'sent').length
  const failedCount = rows.filter((l) => res[l.id]?.state === 'failed').length
  const noAddress = plan.filter((p) => p.skip && p.skip !== 'sent').length

  const run = async () => {
    stop.current = false
    setStopNote('')
    setStep('running')
    let queue = toSend
    if (remaining !== null && queue.length > remaining) queue = queue.slice(0, remaining)
    let sent = 0
    for (const item of queue) {
      if (stop.current || !alive.current) break
      const { lead, to, subject } = item
      const text = drafts[draftKey(lead.id, kind)]?.text || ''
      if (!text.trim()) {
        setRes((r) => ({ ...r, [lead.id]: { state: 'skipped', msg: 'No message written' } }))
        continue
      }
      setRes((r) => ({ ...r, [lead.id]: { state: 'sending' } }))
      const filename = sanitizeFilename(`Proposal_${displayName(lead)}`) || 'Proposal'
      const overrides = store.getState().designEdits.byLead[lead.id] || NONE
      const attachment =
        choice === 'designed'
          ? { kind: 'designed', render: proposalBody(lead, offeringFor(lead), business, overrides), filename }
          : choice === 'text'
            ? { kind: 'text', text, filename }
            : { kind: 'none' }
      try {
        const body = kind === 'proposal' && choice !== 'none' ? coverNote({ company: displayName(lead), offering: offeringFor(lead), business }) : text
        // A proposal goes out as a short cover note with the proposal attached. Without an attachment, send the written draft itself.
        const out = await sendEmail({
          to,
          subject,
          body: kind === 'proposal' && choice === 'none' ? text : body,
          sender_name: business.our_name || '',
          reply_to: business.our_email || '',
          lead_id: store.getState().tracking.byPlaceId[lead.id]?.id || null,
          kind,
          attachment,
        })
        sent += 1
        if (!alive.current) return
        setRes((r) => ({ ...r, [lead.id]: { state: 'sent', msg: '' } }))
        setStatus((s) => (s ? { ...s, sent_today: out.sent_today } : s))
      } catch (err) {
        if (!alive.current) return
        const plain = serializeError(err)
        const msg = plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain)
        setRes((r) => ({ ...r, [lead.id]: { state: 'failed', msg } }))
        // Nothing will work if the sign-in, the server's mail settings or the daily limit is the problem: stop instead of failing every row.
        if (plain.kind === 'auth' || plain.kind === 'config' || /limit/i.test(msg)) {
          setStopNote(msg)
          break
        }
      }
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
    }
    if (!alive.current) return
    if (sent) dispatch(loadTracking())
    if (remaining !== null && toSend.length > queue.length) setStopNote(`Stopped at today's limit. ${toSend.length - queue.length} not sent; you can send them tomorrow.`)
    setStep('done')
  }

  const setRow = (setter) => (id, value) => setter((m) => ({ ...m, [id]: value }))
  const onAddr = setRow(setAddr)
  const onSubj = setRow(setSubj)

  return (
    <section className="panel send-panel bulk-send" aria-labelledby="bulk-send-h">
      <h3 id="bulk-send-h">Send these by email</h3>
      {!signedIn ? (
        <p className="muted small">
          <Link to="/account" className="inline-link">Sign in</Link> to send from the app. Without an account, copy or download the drafts above and send them from your own email.
        </p>
      ) : serverOff ? (
        <p className="muted small">Sending from the app is not switched on for this server yet. Copy or download the drafts above instead.</p>
      ) : (
        <>
          <p className="muted small">
            Each company gets its own email, to its own address, with your replies going to {business.our_email || 'the email in your Settings'}.
            {status ? ` ${remaining} of ${status.daily_limit} emails left today.` : ''}
          </p>

          {kind === 'proposal' ? (
            <fieldset className="send-attach">
              <legend>Attach to every email</legend>
              {template ? (
                <label className="export-check">
                  <input type="radio" name="bulk-attach" checked={choice === 'designed'} onChange={() => setAttach('designed')} />
                  Your designed proposal (PDF), filled in for each company
                </label>
              ) : null}
              <label className="export-check">
                <input type="radio" name="bulk-attach" checked={choice === 'text'} onChange={() => setAttach('text')} />
                Each proposal text above as a PDF
              </label>
              <label className="export-check">
                <input type="radio" name="bulk-attach" checked={choice === 'none'} onChange={() => setAttach('none')} />
                Nothing. Send the written proposal as the message
              </label>
            </fieldset>
          ) : null}

          <ul className="bulk-send-list">
            {plan.map(({ lead, skip }) => {
              const r = res[lead.id]
              const locked = step === 'running' || r?.state === 'sent'
              const to = addressOf(lead)
              const missing = !to
              return (
                <li key={lead.id} className="bulk-send-row">
                  <div className="bulk-send-name">
                    <strong>{displayName(lead)}</strong>
                    {r ? <span className={`tag ${r.state === 'sent' ? 'tag-good' : r.state === 'failed' ? 'tag-bad' : ''}`}>{STATE_LABEL[r.state]}</span> : skip && skip !== 'sent' ? <span className="tag tag-bad">{skip}</span> : null}
                  </div>
                  <label className="bulk-send-field">
                    <span>To</span>
                    <input type="email" inputMode="email" autoComplete="off" disabled={locked} value={addressOf(lead)} placeholder={missing ? 'Type their email' : ''} aria-label={`Email address for ${displayName(lead)}`} onChange={(e) => onAddr(lead.id, e.target.value)} />
                  </label>
                  <label className="bulk-send-field">
                    <span>Subject</span>
                    <input type="text" disabled={locked} value={subjectOf(lead)} aria-label={`Subject for ${displayName(lead)}`} onChange={(e) => onSubj(lead.id, e.target.value)} />
                  </label>
                  {r?.state === 'failed' && r.msg ? <p className="small bulk-send-err" role="alert">{r.msg}</p> : null}
                </li>
              )
            })}
          </ul>

          {stopNote ? <p className="notice notice-warn" role="alert">{stopNote}</p> : null}
          {step === 'done' ? (
            <p role="status" className="export-done small">
              {sentCount} sent{failedCount ? `, ${failedCount} failed` : ''}. Sent emails are added to each saved company’s history.
              {rows.some((l) => res[l.id]?.state === 'sent' && !tracked[l.id]) ? ' Companies you have not saved to your leads are not recorded.' : ''}
            </p>
          ) : null}

          {step === 'confirm' ? (
            <div className="send-confirm" role="group" aria-label="Check before sending">
              <p>
                Send <strong>{Math.min(toSend.length, remaining ?? toSend.length)}</strong> {toSend.length === 1 ? 'email' : 'emails'}
                {choice === 'designed' ? ' with your designed proposal attached' : choice === 'text' ? ' with the proposal attached' : ''}?
                {noAddress ? ` ${noAddress} will be skipped because they have no usable address.` : ''}
                {overLimit ? ` You only have ${remaining} left today, so the rest will not be sent.` : ''}
                {' '}Each message is the draft above, exactly as it reads now.
              </p>
              <div className="form-foot form-foot-row">
                <Button variant="primary" onClick={run}>Yes, send them</Button>
                <Button variant="ghost" onClick={() => setStep('edit')}>Back to editing</Button>
              </div>
            </div>
          ) : step === 'running' ? (
            <div className="form-foot form-foot-row" role="status" aria-live="polite">
              <span>Sending… {sentCount} sent so far{failedCount ? `, ${failedCount} failed` : ''}</span>
              <Button size="sm" variant="ghost" onClick={() => { stop.current = true }}>Stop</Button>
            </div>
          ) : (
            <div className="form-foot form-foot-row">
              <Button variant="primary" iconRight="arrow" disabled={toSend.length === 0} onClick={() => setStep('confirm')}>
                {step === 'done' && toSend.length ? `Send the ${toSend.length} not yet sent` : `Review and send ${toSend.length}`}
              </Button>
              {noAddress ? <span className="muted small">{noAddress} need an address first.</span> : null}
            </div>
          )}
        </>
      )}
    </section>
  )
}