import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import '../styles/design-send.css'
import { serializeError } from '../api/client.js'
import { proposalLines, proposalPage } from '../api/proposalTemplate.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import { selectBusiness } from '../store/selectors.js'
import { leadReset, lineEdited, lineReset } from '../store/designEditsSlice.js'
import { proposalBody } from './ProposalPdfDownload.jsx'
import Button from './Button.jsx'

const NONE = {}

/** Edit the wording of your own designed proposal for one company: click a line on the page, change it, see the page update. */
export default function DesignEditor({ lead, offeringLabel, onClose }) {
  const dispatch = useDispatch()
  const business = useSelector(selectBusiness)
  const overrides = useSelector((s) => s.designEdits.byLead[lead.id] || NONE)
  const base = useMemo(() => proposalBody(lead, offeringLabel, business, {}), [lead, offeringLabel, business])
  const [pages, setPages] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [shot, setShot] = useState({ url: '', loading: false })
  const [line, setLine] = useState(null) // the line being edited: { i, text, original }
  const [draft, setDraft] = useState('')
  const alive = useRef(true)

  const fail = (err) => {
    const plain = serializeError(err)
    if (plain.kind === 'aborted') return
    setError(plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain))
  }

  useEffect(() => () => { alive.current = false }, [])

  // The text of every page, once.
  useEffect(() => {
    const ctl = new AbortController()
    proposalLines(base, { signal: ctl.signal })
      .then((res) => alive.current && setPages(res.pages || []))
      .catch(fail)
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  // The picture of the current page, again after each change (a short pause first, so typing does not hammer the server).
  const overridesKey = JSON.stringify(overrides)
  useEffect(() => {
    if (!pages) return undefined
    const ctl = new AbortController()
    let made = ''
    const t = setTimeout(async () => {
      setShot((s) => ({ ...s, loading: true }))
      try {
        const blob = await proposalPage({ ...base, overrides, page }, { signal: ctl.signal })
        if (!alive.current || ctl.signal.aborted) return
        made = URL.createObjectURL(blob)
        setShot({ url: made, loading: false })
      } catch (err) {
        if (alive.current) {
          setShot((s) => ({ ...s, loading: false }))
          fail(err)
        }
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctl.abort()
      if (made) setTimeout(() => URL.revokeObjectURL(made), 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, page, overridesKey, base])

  const current = pages?.[page]
  const edited = overrides[page] || NONE
  const textOf = (l) => (l.i in edited ? edited[l.i] : l.text)
  const totalEdits = Object.values(overrides).reduce((n, p) => n + Object.keys(p).length, 0)

  const pick = (l) => {
    setLine({ i: l.i, original: l.text })
    setDraft(textOf(l))
  }
  const apply = () => {
    if (!line) return
    if (draft === line.original) dispatch(lineReset({ leadId: lead.id, page, line: line.i }))
    else dispatch(lineEdited({ leadId: lead.id, page, line: line.i, text: draft }))
    setLine(null)
  }
  const resetLine = () => {
    if (!line) return
    dispatch(lineReset({ leadId: lead.id, page, line: line.i }))
    setLine(null)
  }

  if (error && !pages) {
    return (
      <div className="design-editor">
        <p className="notice notice-warn" role="alert">{error}</p>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
    )
  }
  if (!pages) return <div className="design-editor"><p className="muted" role="status">Opening your design…</p></div>
  const withText = pages.map((p, n) => [n, p.lines.length]).filter(([, c]) => c > 0)

  return (
    <div className="design-editor" role="group" aria-label="Edit your designed proposal">
      <div className="design-bar">
        <strong>Edit my design</strong>
        <span className="muted small">{totalEdits ? `${totalEdits} line${totalEdits === 1 ? '' : 's'} changed` : 'No changes yet'}</span>
        <span className="design-bar-actions">
          {totalEdits ? <Button size="sm" variant="ghost" onClick={() => dispatch(leadReset(lead.id))}>Undo all my changes</Button> : null}
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        </span>
      </div>
      <p className="muted small">
        Click any text on the page to change it. Each box is one printed line: short changes such as names, numbers and dates work best, and a much longer line is squeezed to fit. To rewrite whole paragraphs, use the editable text below. Then download the PDF or send it by email.
      </p>

      <div className="design-pager" role="navigation" aria-label="Pages">
        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => { setPage(page - 1); setLine(null) }}>Previous</Button>
        <span>Page {page + 1} of {pages.length}</span>
        <Button size="sm" variant="ghost" disabled={page >= pages.length - 1} onClick={() => { setPage(page + 1); setLine(null) }}>Next</Button>
      </div>

      {line ? (
        <div className="design-edit-line">
          <label htmlFor="design-line">Change this line</label>
          <input
            id="design-line"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply()
              if (e.key === 'Escape') setLine(null)
            }}
          />
          <div className="design-edit-actions">
            <Button size="sm" variant="primary" onClick={apply}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={resetLine}>Put back the original</Button>
            <Button size="sm" variant="ghost" onClick={() => setLine(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      <div className="design-stage" style={current ? { aspectRatio: `${current.width} / ${current.height}` } : undefined}>
        {shot.url ? <img src={shot.url} alt={`Page ${page + 1} of your proposal`} className={shot.loading ? 'is-loading' : ''} /> : <div className="design-wait muted">Loading the page…</div>}
        {current?.lines.map((l) => {
          const [left, bottom, right, top] = l.box
          const changed = l.i in edited
          return (
            <button
              key={l.i}
              type="button"
              className={`design-hot${changed ? ' is-changed' : ''}${line?.i === l.i ? ' is-on' : ''}`}
              style={{
                left: `${(left / current.width) * 100}%`,
                top: `${(1 - top / current.height) * 100}%`,
                width: `${Math.max(((right - left) / current.width) * 100, 1.5)}%`,
                height: `${Math.max(((top - bottom) / current.height) * 100, 1.2)}%`,
              }}
              onClick={() => pick(l)}
              aria-label={`Change: ${textOf(l).slice(0, 80)}`}
              title={textOf(l)}
            />
          )
        })}
      </div>
      {!current?.lines.length ? <p className="muted small">This page is a picture with no text to change.{withText.length ? ` Text is on page${withText.length > 1 ? 's' : ''} ${withText.map(([n]) => n + 1).join(', ')}.` : ''}</p> : null}
      {error ? <p className="notice notice-warn" role="alert">{error}</p> : null}

      {current?.lines.length ? (
        <details className="design-lines">
          <summary>All the text on this page, as a list</summary>
          <ul>
            {current.lines.map((l) => (
              <li key={l.i}>
                <button type="button" className="link-button" onClick={() => pick(l)}>
                  {textOf(l) || '(empty)'}
                </button>
                {l.i in edited ? <span className="tag tag-good">changed</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}