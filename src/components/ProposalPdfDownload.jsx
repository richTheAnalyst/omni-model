import { useEffect, useId, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import '../styles/account-export.css'
import { serializeError } from '../api/client.js'
import { MAX_PDF_BYTES } from '../api/templates.js'
import { deleteProposalTemplate, renderProposal, saveProposalTemplate } from '../api/proposalTemplate.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import useProposalTemplate, { setProposalTemplateCache } from '../hooks/useProposalTemplate.js'
import { downloadBlob } from '../lib/download.js'
import { selectBusiness } from '../store/selectors.js'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'

const WHAT = {
  company: 'the client name',
  city: 'the client city',
  offering_label: 'the service',
  our_name: 'your company name',
  our_email: 'your email',
  our_phone: 'your phone',
  our_title: 'your title',
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
}

/** Settings: upload your own proposal PDF once; every proposal after that is that PDF with the new company's details. */
export default function ProposalPdfPanel() {
  const { template, loading, signedIn } = useProposalTemplate()
  const business = useSelector(selectBusiness)
  const fileId = useId()
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const [file, setFile] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [f, setF] = useState({ company: '', city: '', offering_label: '', our_name: '', our_email: '', our_phone: '', our_title: '' })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  // Your own details start as what Settings says; change them if the PDF writes them differently.
  useEffect(() => {
    setF((x) => ({
      ...x,
      our_name: x.our_name || business.our_name || '',
      our_email: x.our_email || business.our_email || '',
      our_phone: x.our_phone || business.our_phone || '',
      our_title: x.our_title || business.our_title || '',
    }))
  }, [business.our_name, business.our_email, business.our_phone, business.our_title])

  const fail = (err) => {
    const plain = serializeError(err)
    setError(plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain))
  }

  const pick = (e) => {
    const chosen = e.target.files?.[0]
    e.target.value = ''
    setError('')
    if (!chosen) return
    if (!/\.pdf$/i.test(chosen.name) && chosen.type !== 'application/pdf') return setError('Choose a PDF file.')
    if (chosen.size > MAX_PDF_BYTES) return setError('That PDF is larger than 5 MB. Export a smaller copy.')
    setFile(chosen)
  }

  const replacements = Object.entries(f)
    .map(([as, find]) => ({ find: find.trim(), as }))
    .filter((r) => r.find.length >= 2)

  const save = async () => {
    if (!file || !replacements.length) return
    setBusy(true)
    setError('')
    try {
      const res = await saveProposalTemplate({ filename: file.name, data: await toBase64(file), replacements })
      if (!alive.current) return
      setProposalTemplateCache({ template: res.template })
      setResult({ missing: res.missing || [] })
      setFile(null)
      setAdding(false)
    } catch (err) {
      if (alive.current) fail(err)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await deleteProposalTemplate()
      setProposalTemplateCache({ template: null })
      setResult(null)
    } catch (err) {
      if (alive.current) fail(err)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const preview = async () => {
    setBusy(true)
    setError('')
    try {
      const blob = await renderProposal({
        company: 'Sample Company Ltd',
        city: 'Sample City',
        offering_label: 'Your service',
        business: { our_name: business.our_name || '', our_email: business.our_email || '', our_phone: business.our_phone || '', our_title: business.our_title || '' },
      })
      downloadBlob(blob, 'proposal_preview.pdf')
    } catch (err) {
      if (alive.current) fail(err)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  if (!signedIn) {
    return (
      <section className="panel stack" aria-labelledby="pdf-title">
        <h2 id="pdf-title">Your own proposal design</h2>
        <p className="muted">
          Upload a finished proposal as a PDF and every proposal you make uses it, with your logo, tables and layout kept. This needs an account so the PDF is kept safely.{' '}
          <Link to="/account" className="inline-link">Sign in or create an account</Link>
        </p>
      </section>
    )
  }

  const showForm = adding || (!template && !loading)
  return (
    <section className="panel stack" aria-labelledby="pdf-title">
      <h2 id="pdf-title">Your own proposal design</h2>
      <p className="muted">
        Upload a finished proposal as a PDF. For each new company we fill in that same PDF, so your logo, pictures, tables and layout stay exactly as you made them. Export it from Word or Google Docs; a scan or photo will not work.
      </p>

      {template && !adding ? (
        <div className="pdf-current">
          <p>
            <strong>{template.filename}</strong> <span className="tag tag-good">In use</span>
          </p>
          <p className="muted small">
            Swapped for each company: {template.replacements.map((r) => `“${r.find}” (${WHAT[r.as] || r.as})`).join(', ')}.
          </p>
          {result?.missing?.length ? (
            <p className="notice notice-warn" role="status">
              Not found in your PDF, so left as they are: {result.missing.map((m) => `“${m}”`).join(', ')}. Check the spelling matches the PDF exactly.
            </p>
          ) : null}
          <div className="form-foot form-foot-row">
            <Button size="sm" variant="secondary" loading={busy} onClick={preview}>Preview with a sample company</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>Replace PDF</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>Remove</Button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="pdf-form stack">
          <input id={fileId} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={pick} />
          <div>
            <Button variant="secondary" onClick={() => document.getElementById(fileId)?.click()}>
              {file ? 'Choose a different PDF' : 'Choose your proposal PDF'}
            </Button>{' '}
            {file ? <strong>{file.name}</strong> : null}
          </div>
          <p className="small">
            Type each detail <strong>exactly as it is written in your PDF</strong>. We find it there and swap in the right one for each company. Leave a box empty if it does not appear.
          </p>
          <div className="form-grid">
            <TextField label="Client it was written for" value={f.company} onChange={set('company')} placeholder="Acme Ltd" />
            <TextField label="Client's city" value={f.city} onChange={set('city')} placeholder="Accra" />
            <TextField label="Service it offered" value={f.offering_label} onChange={set('offering_label')} placeholder="Manned guarding" />
            <TextField label="Your company name" value={f.our_name} onChange={set('our_name')} />
            <TextField label="Your email" value={f.our_email} onChange={set('our_email')} />
            <TextField label="Your phone" value={f.our_phone} onChange={set('our_phone')} />
            <TextField label="Your name or title" value={f.our_title} onChange={set('our_title')} />
          </div>
          <p className="muted small">
            Only text is swapped. A name that is much longer than the original is squeezed a little to fit, and swapped text uses a standard font that matches the look of the original.
          </p>
          <div className="form-foot form-foot-row">
            <Button variant="primary" loading={busy} disabled={!file || replacements.length === 0} onClick={save}>
              Save my proposal design
            </Button>
            {adding ? <Button variant="ghost" onClick={() => { setAdding(false); setFile(null) }}>Cancel</Button> : null}
          </div>
        </div>
      ) : null}
      {error ? <p className="notice notice-warn" role="alert">{error}</p> : null}
    </section>
  )
}