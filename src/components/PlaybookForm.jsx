import { useEffect, useId, useState } from 'react'
import '../styles/account-export.css' // the styles for this screen travel with it, so no other file needs editing
import { useDispatch, useSelector } from 'react-redux'
import {
  buildOfferingsFromServices,
  DEFAULT_OUTREACH,
  MAX_TEMPLATE_CHARS,
  parseSignalWords,
  TEMPLATE_PLACEHOLDERS,
  unknownPlaceholders,
} from '../config/profile.js'
import { PLAYBOOK_FIELDS, playbookSaved, runSuggestFit } from '../store/settingsSlice.js'
import { selectBusiness, selectFitStatus, selectPlaybook } from '../store/selectors.js'
import Button from './Button.jsx'
import { TextField } from './Fields.jsx'
import TemplateUpload from './TemplateUpload.jsx'

const TEMPLATES = [
  { key: 'email', label: 'First email' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'followup', label: 'Follow-up' },
]

function TemplateField({ id, label, value, onChange }) {
  const unknown = unknownPlaceholders(value)
  return (
    <div className="field form-wide">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={9} maxLength={MAX_TEMPLATE_CHARS} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Leave empty to use the standard wording." />
      <TemplateUpload label={label} onUse={onChange} />
      <div className="playbook-tools">
        <button type="button" className="link-button" onClick={() => onChange(DEFAULT_OUTREACH[TEMPLATES.find((t) => t.label === label).key])}>
          Start from the standard wording
        </button>
        {value ? (
          <button type="button" className="link-button" onClick={() => onChange('')}>
            Clear
          </button>
        ) : null}
      </div>
      {unknown.length ? (
        <p className="field-error">
          {unknown.map((u) => `{${u}}`).join(', ')} will not be filled in and will appear as written.
        </p>
      ) : null}
    </div>
  )
}

/** Settings: the words and drafts that make the profile this business's own (instead of one fixed industry's). */
export default function PlaybookForm() {
  const dispatch = useDispatch()
  const current = useSelector(selectPlaybook)
  const business = useSelector(selectBusiness)
  const fitStatus = useSelector(selectFitStatus)
  const fitScores = useSelector((s) => s.settings.fitScores)
  const [values, setValues] = useState(() => ({ ...current }))
  const [saved, setSaved] = useState(false)
  const ids = { words: useId(), kind: useId(), email: useId(), proposal: useId(), followup: useId() }

  useEffect(() => {
    if (!saved) return undefined
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const dirty = PLAYBOOK_FIELDS.some((k) => (values[k] || '') !== (current[k] || ''))
  const set = (key) => (v) => setValues((s) => ({ ...s, [key]: v }))
  const words = parseSignalWords(values.signal_words)

  const offerings = buildOfferingsFromServices(business.service)
  const hasService = Object.keys(offerings).length > 0
  const rated = Object.values(fitScores || {}).some((r) => r && Object.keys(r).some((k) => k in offerings))

  const save = (e) => {
    e.preventDefault()
    const clean = {}
    for (const k of PLAYBOOK_FIELDS) clean[k] = (values[k] || '').trim()
    dispatch(playbookSaved(clean))
    setValues(clean)
    setSaved(true)
  }

  return (
    <form className="panel form-panel" onSubmit={save} noValidate>
      <header className="panel-head">
        <h2>How you sell</h2>
        <p className="muted">
          Omni Model starts neutral. These settings teach it what a good customer looks like for your business and how you write to them. Anything you leave empty uses standard wording.
        </p>
      </header>

      {hasService && !rated ? (
        <div className="notice notice-info" role="status">
          <span>
            Your services have not been rated against each industry yet, so every service scores the same. Rating takes a few seconds.
          </span>
          <Button size="sm" variant="primary" loading={fitStatus === 'loading'} onClick={() => dispatch(runSuggestFit({ profile: null, sectors: null }))}>
            Rate my services
          </Button>
        </div>
      ) : null}

      <div className="form-grid">
        <div className="form-wide">
          <TextField
            label="Buying-signal words (optional)"
            value={values.signal_words || ''}
            onChange={set('signal_words')}
            maxLength={600}
            placeholder="For example: it support, helpdesk, network"
            hint={`Words in a company's job ads that show it needs what you sell. Separate with commas. ${words.length ? `${words.length} word${words.length === 1 ? '' : 's'} counted.` : 'With none, job ads do not add to the score.'}`}
          />
        </div>
        <div className="form-wide">
          <TextField
            label="Who do you usually replace or compete with? (optional)"
            value={values.competitor_kind || ''}
            onChange={set('competitor_kind')}
            maxLength={120}
            placeholder="For example: a current IT provider"
            hint="When analysing a website we look for a mention of this and show it as the existing provider."
          />
        </div>
        {TEMPLATES.map((t) => (
          <TemplateField key={t.key} id={ids[t.key]} label={t.label} value={values[t.key] || ''} onChange={set(t.key)} />
        ))}
      </div>
      <p className="muted small">
        Placeholders filled in for every company: {TEMPLATE_PLACEHOLDERS.map((p) => `{${p}}`).join(' ')}
      </p>

      <div className="form-foot form-foot-row">
        <Button type="submit" variant="primary" disabled={!dirty}>
          Save how I sell
        </Button>
        <span className="muted small" role="status" aria-live="polite">
          {saved ? 'Saved on this device. It applies to your next search, analysis and draft.' : dirty ? 'You have unsaved changes.' : ''}
        </span>
      </div>
    </form>
  )
}