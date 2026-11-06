import { useEffect, useId, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import '../styles/account-export.css'
import { serializeError } from '../api/client.js'
import { MAX_PDF_BYTES, readProposalPdf } from '../api/templates.js'
import { MAX_TEMPLATE_CHARS, unknownPlaceholders } from '../config/profile.js'
import { makeTemplate } from '../lib/templateFromText.js'
import { selectBusiness } from '../store/selectors.js'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'

const NAMES = {
  company: 'the client name',
  city: 'the city',
  offering_label: 'the service',
  our_name: 'your company name',
  our_email: 'your email',
  our_phone: 'your phone',
  our_title: 'your title',
}

/** "Use my own PDF": reads a finished proposal and turns it into a template the person can adjust and keep. */
export default function TemplateUpload({ label, onUse }) {
  const business = useSelector(selectBusiness)
  const inputId = useId()
  const aborter = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState(null) // { text, pages, truncated, name }
  const [clientName, setClientName] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [service, setService] = useState('')
  const [edited, setEdited] = useState(null) // the person's own edits to the preview

  const signedIn = useSelector((s) => s.account.status === 'signedIn')
  useEffect(() => () => aborter.current?.abort(), [])

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return setError('Choose a PDF file.')
    if (file.size > MAX_PDF_BYTES) return setError('That PDF is larger than 5 MB. Export a smaller copy.')
    const ctl = new AbortController()
    aborter.current = ctl
    setBusy(true)
    try {
      const res = await readProposalPdf(file, { signal: ctl.signal })
      setSource({ ...res, name: file.name })
      setEdited(null)
    } catch (err) {
      const e2 = serializeError(err)
      if (e2.kind !== 'aborted') setError(e2.detail || 'We could not read that PDF. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const made = source ? makeTemplate(source.text, { business, clientName, clientCity, service }) : null
  const preview = edited ?? made?.text ?? ''
  const tooLong = preview.length > MAX_TEMPLATE_CHARS
  const unknown = unknownPlaceholders(preview)
  const swapped = made ? Object.entries(made.counts) : []

  const use = () => {
    onUse(preview.slice(0, MAX_TEMPLATE_CHARS))
    setSource(null)
  }

  if (signedIn && /proposal/i.test(label)) {
    return <p className="muted small">To keep your own proposal design, use “Your own proposal design” further down this page.</p>
  }
  return (
    <div className="tpl-upload">
      <input id={inputId} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={pick} />
      {!source ? (
        <>
          <Button size="sm" variant="secondary" icon="download" loading={busy} onClick={() => document.getElementById(inputId)?.click()}>
            {busy ? 'Reading your PDF…' : `Use my own PDF for the ${label.toLowerCase()}`}
          </Button>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="panel panel-flat tpl-panel" role="group" aria-label="Turn your PDF into a template">
          <p>
            <strong>{source.name}</strong> <span className="muted small">· {source.pages} page{source.pages === 1 ? '' : 's'} read</span>
          </p>
          <p className="muted small">
            We keep the wording and the order. Layout, logos, pictures and tables are not kept, so downloads come out as plain pages.
            {source.truncated ? ' Only the first 40 pages were read.' : ''}
          </p>
          <p className="small">Tell us who this one was written for, and we will turn those parts into blanks that fill in for each new company. Your own details are swapped automatically.</p>
          <div className="form-grid">
            <TextField label="Client it was written for" value={clientName} onChange={setClientName} placeholder="Acme Ltd" />
            <TextField label="Client's city" value={clientCity} onChange={setClientCity} placeholder="Accra" />
            <TextField label="Service it offered" value={service} onChange={setService} placeholder="Manned guarding" />
          </div>
          <p className="small" role="status" aria-live="polite">
            {swapped.length
              ? `Swapped for blanks: ${swapped.map(([k, n]) => `${NAMES[k] || k} (${n})`).join(', ')}.`
              : 'Nothing swapped yet. Fill in the boxes above, or add your details in Settings.'}
          </p>
          <div className="field">
            <label htmlFor={`${inputId}-p`}>Your template (edit anything)</label>
            <textarea id={`${inputId}-p`} rows={14} value={preview} onChange={(e) => setEdited(e.target.value)} />
            <p className="field-hint">
              To add a blank by hand, type a name in braces, such as {'{company}'} or {'{city}'}. Changing the boxes above starts the preview again.
            </p>
            {tooLong ? <p className="field-error">This is over {MAX_TEMPLATE_CHARS.toLocaleString()} characters, so the end will be cut off.</p> : null}
            {unknown.length ? (
              <p className="field-error">{unknown.map((u) => `{${u}}`).join(', ')} will not be filled in and will appear as written.</p>
            ) : null}
          </div>
          <div className="form-foot form-foot-row">
            <Button variant="primary" onClick={use} disabled={!preview.trim()}>
              Use this as my {label.toLowerCase()}
            </Button>
            <Button variant="ghost" onClick={() => setSource(null)}>
              Cancel
            </Button>
          </div>
          <p className="muted small">Using it fills the box below. Press “Save how I sell” afterwards to keep it.</p>
        </div>
      )}
    </div>
  )
}