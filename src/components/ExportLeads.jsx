import { useEffect, useId, useRef, useState } from 'react'
import '../styles/account-export.css' 
import { useSelector } from 'react-redux'
import { exportLeadsXlsx } from '../api/leadExport.js'
import { serializeError } from '../api/client.js'
import { STATUS_LABEL, todayInputValue, trackingErrorMessage } from '../config/trackingUi.js'
import { downloadBlob } from '../lib/download.js'
import { sanitizeFilename } from '../lib/format.js'
import { selectActiveProfile, selectBusiness } from '../store/selectors.js'
import Button from './Button.jsx'

/** The part of the business profile that goes on the last sheet. Labels only for industries, to keep the request small. */
function profileForExport(profile, business) {
  const sectors = {}
  for (const [key, value] of Object.entries(profile?.sectors || {})) sectors[key] = { label: value?.label || key }
  // The details typed in Settings win over the profile's own (empty) defaults.
  return { business: { ...(profile?.business || {}), ...(business || {}) }, country: profile?.country || '', offerings: profile?.offerings || {}, sectors }
}

/** One export at a time; saves the file when it arrives. */
function useLeadsExport() {
  const profile = useSelector(selectActiveProfile)
  const business = useSelector(selectBusiness)
  const [state, setState] = useState({ busy: false, error: '', done: '' })
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const run = async (body, filename) => {
    if (state.busy) return
    setState({ busy: true, error: '', done: '' })
    try {
      const blob = await exportLeadsXlsx({ ...body, tz_offset_minutes: new Date().getTimezoneOffset(), profile: profileForExport(profile, business) })
      if (!blob || blob.size === 0) throw new Error('The file came back empty. Please try again.')
      downloadBlob(blob, filename)
      if (alive.current) setState({ busy: false, error: '', done: `Downloaded ${filename}` })
    } catch (err) {
      if (!alive.current) return
      const plain = serializeError(err)
      setState({ busy: false, error: plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain), done: '' })
    }
  }
  return { ...state, run }
}

/** Monday and Sunday of the week that contains a 'YYYY-MM-DD' day, in the person's own calendar. */
function weekOf(value) {
  const [y, m, d] = String(value).split('-').map(Number)
  if (!y || !m || !d) return null
  const day = new Date(y, m - 1, d)
  const monday = new Date(y, m - 1, d - ((day.getDay() + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const fmt = (x) => x.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  return { iso, label: `${fmt(monday)} to ${fmt(sunday)}` }
}

function Feedback({ error, done }) {
  if (error) return <p className="notice notice-warn" role="alert">{error}</p>
  if (done) return <p className="muted small" role="status">{done}</p>
  return null
}

/** Pipeline: download everything, the current status filter, or one week. `status` is the active status filter, if any. */
export function ExportLeadsPanel({ status }) {
  const exporter = useLeadsExport()
  const [week, setWeek] = useState(todayInputValue())
  const [onlyFiltered, setOnlyFiltered] = useState(false)
  const checkId = useId()
  const weekId = useId()
  const picked = weekOf(week)
  const filterable = status && status !== 'all' && status !== 'due'
  const statusBody = filterable && onlyFiltered ? { status } : {}
  const stamp = todayInputValue()

  return (
    <details className="panel export-panel">
      <summary>
        <span className="export-title">Download to Excel</span>
        <span className="muted small">Leads, statuses, history and your business profile</span>
      </summary>
      <div className="export-body">
        <div className="export-row">
          <div>
            <strong>All saved leads</strong>
            <p className="muted small">One row per company with its status, contacts, follow-up and result, plus the full history.</p>
          </div>
          <Button variant="primary" icon="download" loading={exporter.busy} onClick={() => exporter.run({ scope: 'all', ...statusBody }, `leads-${stamp}.xlsx`)}>
            Download all
          </Button>
        </div>
        {filterable ? (
          <label className="export-check" htmlFor={checkId}>
            <input id={checkId} type="checkbox" checked={onlyFiltered} onChange={(e) => setOnlyFiltered(e.target.checked)} />
            <span>Only leads that are “{STATUS_LABEL[status] || status}”</span>
          </label>
        ) : null}
        <div className="export-row">
          <div className="field export-week">
            <label htmlFor={weekId}>A single week</label>
            <input id={weekId} type="date" value={week} max={stamp} onChange={(e) => setWeek(e.target.value)} />
            <p className="field-hint">{picked ? `${picked.label}. Leads you saved or worked on that week.` : 'Pick any day in the week.'}</p>
          </div>
          <Button
            variant="secondary"
            icon="download"
            disabled={!picked}
            loading={exporter.busy}
            onClick={() => exporter.run({ scope: 'week', week_start: picked.iso, ...statusBody }, `leads-week-${picked.iso}.xlsx`)}
          >
            Download week
          </Button>
        </div>
        <Feedback error={exporter.error} done={exporter.done} />
      </div>
    </details>
  )
}

/** Lead page: download this one lead with its full history. `tracked` is the saved lead from the server. */
export function ExportLeadButton({ tracked }) {
  const exporter = useLeadsExport()
  if (!tracked?.id) return null
  const base = sanitizeFilename(tracked.name || 'lead', 'lead')
  return (
    <div className="track-block">
      <Button variant="ghost" size="sm" icon="download" loading={exporter.busy} onClick={() => exporter.run({ scope: 'lead', lead_id: tracked.id }, `${base}.xlsx`)}>
        Download this lead (Excel)
      </Button>
      <Feedback error={exporter.error} done={exporter.done} />
    </div>
  )
}