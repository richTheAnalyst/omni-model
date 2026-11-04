import { useId, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { INDUSTRIES } from '../config/markets.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import { logEvent, loadTracking, recordOutcome, saveToTracking } from '../store/trackingSlice.js'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'

/** A random id for a company typed in by hand. The "manual:" prefix keeps it apart from Google place ids. */
function manualId() {
  const rand = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `manual:${rand}`
}

/** Pipeline: add a company that did not come from a search, for example an existing customer you want to keep track of. */
export default function AddCompanyPanel() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [sector, setSector] = useState('')
  const [notes, setNotes] = useState('')
  const [customer, setCustomer] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sectorId = useId()
  const notesId = useId()
  const customerId = useId()

  const nameError = !name.trim() ? 'Enter the company name.' : ''

  const fail = (payload) => {
    setError(trackingErrorMessage(payload?.error || payload || null) || 'Could not add this company. Please try again.')
    setBusy(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (nameError || busy) return
    setBusy(true)
    setError('')
    const id = manualId()
    const saved = await dispatch(
      saveToTracking({
        id,
        name: name.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        sector: sector || null,
        types: [],
      }),
    )
    if (!saveToTracking.fulfilled.match(saved)) return fail(saved.payload)
    // The company is saved. If a follow-up step fails, say so, but the company is not lost.
    if (customer) {
      const won = await dispatch(recordOutcome({ placeId: id, result: 'won', imported: true }))
      if (!recordOutcome.fulfilled.match(won)) {
        await dispatch(loadTracking())
        return fail({ detail: 'The company was added, but it could not be marked as a customer. Open it and set the result there.' })
      }
    }
    if (notes.trim()) await dispatch(logEvent({ placeId: id, type: 'note', note: notes.trim() }))
    await dispatch(loadTracking()) // brings the new company into the list and gives it a page
    setBusy(false)
    navigate(`/leads/${encodeURIComponent(id)}`)
  }

  return (
    <details className="panel export-panel" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="export-title">Add a company or customer</span>
        <span className="muted small">Keep track of a company that did not come from a search</span>
      </summary>
      <form className="export-body" onSubmit={submit} noValidate>
        <div className="form-grid">
          <TextField label="Company name" value={name} onChange={setName} required autoComplete="organization" error={touched ? nameError : undefined} />
          <TextField label="City or town" value={city} onChange={setCity} />
          <TextField label="Phone" type="tel" value={phone} onChange={setPhone} inputMode="tel" autoComplete="tel" />
          <TextField label="Website" value={website} onChange={setWebsite} inputMode="url" placeholder="example.com" />
          <div className="field">
            <label htmlFor={sectorId}>Industry (optional)</label>
            <div className="select-wrap">
              <select id={sectorId} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Not sure</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field form-wide">
            <label htmlFor={notesId}>First note (optional)</label>
            <textarea id={notesId} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who you deal with there, what they buy, when the contract ends…" />
          </div>
        </div>
        <label className="export-check" htmlFor={customerId}>
          <input id={customerId} type="checkbox" checked={customer} onChange={(e) => setCustomer(e.target.checked)} />
          <span>They are already my customer (mark as Won)</span>
        </label>
        {error ? (
          <p className="notice notice-warn" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" variant="primary" loading={busy}>
            Add to my pipeline
          </Button>
        </div>
      </form>
    </details>
  )
}