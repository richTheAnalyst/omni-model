import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import '../styles/design-send.css'
import { serializeError } from '../api/client.js'
import { emailStatus, sendEmail } from '../api/email.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import useProposalTemplate from '../hooks/useProposalTemplate.js'
import { leadEmail } from '../lib/leadEmail.js'
import { coverNote, suggestSubject } from '../lib/subject.js'
import { displayName, sanitizeFilename } from '../lib/format.js'
import { selectBusiness } from '../store/selectors.js'
import { loadTracking } from '../store/trackingSlice.js'
import { proposalBody } from './ProposalPdfDownload.jsx'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'

const NONE = {}
const ADDRESS = /^[^\s@<>",;]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/

/**
 * "Send by email": a suggested subject and message, all editable, and the proposal attached as a PDF.
 * Props: lead, kind ('email' | 'proposal' | 'followup'), draftText (the editable draft for this tab), offeringLabel, trackedId (saved lead id).
 * Give it a key that changes with the lead and tab, so each starts fresh.
 */
export default function SendEmailPanel({ lead, kind, draftText, offeringLabel, trackedId }) {
  const dispatch = useDispatch()
  const business = useSelector(selectBusiness)
  const signedIn = useSelector((s) => s.account.status === 'signedIn')
  const overrides = useSelector((s) => s.designEdits.byLead[lead.id] || NONE)
  const { template } = useProposalTemplate()
  const savedEmail = useSelector((s) => leadEmail(lead, s.tracking.byPlaceId[lead.id]))
  const company = displayName(lead)

  const [status, setStatus] = useState(null) // { enabled, sent_today, daily_limit }
  const [to, setTo] = useState(savedEmail)
  const [toEdited, setToEdited] = useState(false)
  const [subject, setSubject] = useState(() => suggestSubject({ kind, company, offering: offeringLabel, ourName: business.our_name }))
  const [body, setBody] = useState(() => (kind === 'proposal' ? coverNote({ company, offering: offeringLabel, business }) : draftText || ''))
  const [bodyEdited, setBodyEdited] = useState(false)
  const [attach, setAttach] = useState(kind === 'proposal' ? (template ? 'designed' : draftText ? 'text' : 'none') : 'none')
  const [step, setStep] = useState('edit') // edit | confirm | sent
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  // A draft that arrives or is rewritten after this opened fills the message, unless the person already changed it.
  useEffect(() => {
    if (kind !== 'proposal' && !bodyEdited) setBody(draftText || '')
  }, [draftText, kind, bodyEdited])
  useEffect(() => {
    if (kind === 'proposal' && attach === 'none') setAttach(template ? 'designed' : draftText ? 'text' : 'none')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  // The saved address can arrive after this opened; fill it in unless the person has typed their own.
  useEffect(() => {
    if (!toEdited && savedEmail) setTo(savedEmail)
  }, [savedEmail, toEdited])

  useEffect(() => {
    if (!signedIn) return undefined
    const ctl = new AbortController()
    emailStatus({ signal: ctl.signal }).then((s) => alive.current && setStatus(s)).catch(() => {})
    return () => ctl.abort()
  }, [signedIn])

  const addressOk = ADDRESS.test(to.trim())
  const canSend = addressOk && subject.trim() && body.trim() && !busy
  const attachLabel = attach === 'designed' ? 'your designed proposal (PDF)' : attach === 'text' ? 'the proposal text (PDF)' : 'no attachment'
  const filename = sanitizeFilename(`Proposal_${company}`) || 'Proposal'

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const attachment =
        attach === 'designed'
          ? { kind: 'designed', render: proposalBody(lead, offeringLabel, business, overrides), filename }
          : attach === 'text'
            ? { kind: 'text', text: draftText || '', filename }
            : { kind: 'none' }
      const res = await sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        body,
        sender_name: business.our_name || '',
        reply_to: business.our_email || '',
        lead_id: trackedId || null,
        kind,
        attachment,
      })
      if (!alive.current) return
      setResult(res)
      setStep('sent')
      setStatus((s) => (s ? { ...s, sent_today: res.sent_today } : s))
      if (res.logged) dispatch(loadTracking())
    } catch (err) {
      if (!alive.current) return
      const plain = serializeError(err)
      setError(plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain))
      setStep('edit')
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1500))}`

  if (step === 'sent') {
    return (
      <section className="panel send-panel" aria-labelledby={`send-${kind}`}>
        <h3 id={`send-${kind}`}>Sent</h3>
        <p role="status">
          Your email to <strong>{result.to}</strong> is on its way. Replies will go to {business.our_email || 'the address in your Settings'}.
          {result.logged ? ' It has been added to this company’s history.' : trackedId ? '' : ' Save this company to your leads to keep a record of it.'}
        </p>
        <Button size="sm" variant="secondary" onClick={() => { setStep('edit'); setResult(null) }}>Write another</Button>
      </section>
    )
  }

  const serverOff = signedIn && status && !status.enabled
  return (
    <section className="panel send-panel" aria-labelledby={`send-${kind}`}>
      <h3 id={`send-${kind}`}>Send by email</h3>
      {!signedIn ? (
        <p className="muted small">
          <Link to="/account" className="inline-link">Sign in</Link> to send from here with your proposal attached. Without an account you can still open the message in your own email app.
        </p>
      ) : serverOff ? (
        <p className="muted small">Sending from the app is not switched on for this server yet. You can open the message in your own email app instead.</p>
      ) : status ? (
        <p className="muted small">{Math.max(0, status.daily_limit - status.sent_today)} of {status.daily_limit} emails left today. Replies go to {business.our_email || 'your email in Settings'}.</p>
      ) : null}

      <div className="send-grid">
        <TextField label="Send to" type="email" value={to} onChange={(v) => { setTo(v); setToEdited(true) }} placeholder="name@company.com" autoComplete="off" inputMode="email"
          hint={savedEmail && to === savedEmail ? 'Filled in from this company’s details.' : !savedEmail && !to ? 'We do not have an email for this company yet. Type one in; we will remember it.' : undefined}
          error={to && !addressOk ? 'Enter one email address.' : undefined} />
        <div className="send-subject">
          <TextField label="Subject" value={subject} onChange={setSubject} />
          <button type="button" className="link-button" onClick={() => setSubject(suggestSubject({ kind, company, offering: offeringLabel, ourName: business.our_name }))}>
            Suggest another
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`send-body-${kind}`}>Message</label>
        <textarea id={`send-body-${kind}`} rows={kind === "proposal" ? 12 : 12} value={body} onChange={(e) => { setBody(e.target.value); setBodyEdited(true) }} />
        {kind !== 'proposal' && !draftText ? <p className="field-hint">Write the draft above first, or type your message here.</p> : null}
      </div>

      {kind === 'proposal' ? (
        <fieldset className="send-attach">
          <legend>Attach</legend>
          {template ? (
            <label className="export-check">
              <input type="radio" name={`attach-${kind}`} checked={attach === 'designed'} onChange={() => setAttach('designed')} />
              Your designed proposal (PDF){Object.keys(overrides).length ? ', with the changes you made' : ''}
            </label>
          ) : null}
          {draftText ? (
            <label className="export-check">
              <input type="radio" name={`attach-${kind}`} checked={attach === 'text'} onChange={() => setAttach('text')} />
              The proposal text from the editor above (PDF)
            </label>
          ) : null}
          <label className="export-check">
            <input type="radio" name={`attach-${kind}`} checked={attach === 'none'} onChange={() => setAttach('none')} />
            Nothing, just the message
          </label>
        </fieldset>
      ) : null}

      {error ? <p className="notice notice-warn" role="alert">{error}</p> : null}

      {step === 'confirm' ? (
        <div className="send-confirm" role="group" aria-label="Check before sending">
          <p>
            Send to <strong>{to.trim()}</strong> with the subject “{subject.trim()}” and {attachLabel}?
          </p>
          <div className="form-foot form-foot-row">
            <Button variant="primary" loading={busy} onClick={send}>Yes, send it</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStep('edit')}>Back to editing</Button>
          </div>
        </div>
      ) : (
        <div className="form-foot form-foot-row">
          {signedIn && !serverOff ? (
            <Button variant="primary" iconRight="arrow" disabled={!canSend} onClick={() => setStep('confirm')}>
              Review and send
            </Button>
          ) : null}
          <a className={`btn btn-secondary btn-md${addressOk ? '' : ' is-disabled'}`} href={addressOk ? mailto : undefined} aria-disabled={!addressOk}>
            Open in my email app
          </a>
        </div>
      )}
      {step === 'edit' && !signedIn ? null : null}
      <p className="muted small">Email apps cannot take attachments this way, and long messages may be cut. Attach the PDF yourself after downloading it.</p>
    </section>
  )
}