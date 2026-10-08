import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { businessSaved } from '../store/settingsSlice.js'
import { selectBusiness } from '../store/selectors.js'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'

const FIELDS = [
  { key: 'our_name', label: 'Business name', type: 'text', autoComplete: 'organization', required: true },
  { key: 'our_email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email', required: true },
  { key: 'our_phone', label: 'Phone', type: 'tel', autoComplete: 'tel', inputMode: 'tel', required: true },
  {
    key: 'service',
    label: 'Service to market',
    type: 'text',
    required: true,
    hint: 'The service you want to offer these companies.',
    placeholder: 'For example: the service or product you sell',
    wide: true,
  },
  {
    key: 'our_title',
    label: 'Your title (optional)',
    type: 'text',
    autoComplete: 'organization-title',
    hint: 'Shown under your name when signing a draft.',
    wide: true,
  },
]

export default function BusinessForm({ heading = 'Business profile', intro, submitLabel = 'Save changes', onSaved }) {
  const dispatch = useDispatch()
  const current = useSelector(selectBusiness)
  const [values, setValues] = useState(() => ({ ...current }))
  const [saved, setSaved] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!saved) return undefined
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const dirty = FIELDS.some((f) => (values[f.key] || '') !== (current[f.key] || ''))
  const errors = {}
  for (const f of FIELDS) {
    if (f.required && !(values[f.key] || '').trim()) errors[f.key] = 'This is needed to sign your outreach.'
  }
  if (values.our_email?.trim() && !/^\S+@\S+\.\S+$/.test(values.our_email.trim())) {
    errors.our_email = 'Enter a valid email address.'
  }
  const hasErrors = Object.keys(errors).length > 0

  const save = (e) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors) return
    const trimmed = {}
    for (const f of FIELDS) trimmed[f.key] = (values[f.key] || '').trim()
    dispatch(businessSaved(trimmed))
    setValues(trimmed)
    setSaved(true)
    onSaved?.()
  }

  return (
    <form className="panel form-panel" onSubmit={save} noValidate>
      <header className="panel-head">
        <h2>{heading}</h2>
        <p className="muted">
          {intro ||
            'Tell Omni Model who is writing. These details sign every outreach draft you create. They are saved on this device and are not filled in for you.'}
        </p>
      </header>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? 'form-wide' : undefined}>
            <TextField
              label={f.label}
              type={f.type}
              value={values[f.key] || ''}
              onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              maxLength={120}
              placeholder={f.placeholder}
              hint={f.hint}
              required={f.required}
              error={touched || f.key === 'our_email' ? errors[f.key] || '' : ''}
            />
          </div>
        ))}
      </div>
      <div className="form-foot form-foot-row">
        <Button type="submit" variant="primary" disabled={!dirty && !onSaved}>
          {submitLabel}
        </Button>
        <span className="muted small" role="status" aria-live="polite">
          {saved ? 'Saved on this device.' : dirty ? 'You have unsaved changes.' : ''}
        </span>
      </div>
    </form>
  )
}

