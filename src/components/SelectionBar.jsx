import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/bulk.css'
import Button from './Button.jsx'
import { OUTREACH_KINDS } from '../config/product.js'
import { generateBulk } from '../store/bulkOutreach.js'
import { added, cleared } from '../store/selectionSlice.js'
import { selectBusinessComplete } from '../store/selectors.js'

/** Appears once something is ticked on the Leads page. `allIds` are every company matching the current filters. */
export default function SelectionBar({ allIds, dncById }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const entities = useSelector((s) => s.leads.entities)
  const ids = useSelector((s) => s.selection.ids)
  const complete = useSelector(selectBusinessComplete)
  const [kinds, setKinds] = useState(['email'])
  const usable = ids.filter((id) => entities[id]?.name && !dncById[id])
  if (ids.length === 0) return null

  const pickable = allIds.filter((id) => !dncById[id])
  const missing = pickable.filter((id) => !ids.includes(id)).length
  const toggleKind = (id) => setKinds((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]))
  const total = usable.length * kinds.length

  const go = () => {
    dispatch(generateBulk({ leadIds: usable, kinds: OUTREACH_KINDS.map((k) => k.id).filter((k) => kinds.includes(k)) }))
    navigate('/outreach/bulk')
  }

  return (
    <section className="selection-bar" aria-label="Selected companies">
      <div className="sel-top">
        <strong>{ids.length} selected</strong>
        {missing > 0 ? (
          <button type="button" className="link-button" onClick={() => dispatch(added(pickable))}>
            Select all {pickable.length} matching
          </button>
        ) : null}
        <button type="button" className="link-button" onClick={() => dispatch(cleared())}>
          Clear
        </button>
      </div>
      <fieldset className="sel-kinds">
        <legend className="sr-only">What to write</legend>
        {OUTREACH_KINDS.map((k) => (
          <label key={k.id} className="export-check">
            <input type="checkbox" checked={kinds.includes(k.id)} onChange={() => toggleKind(k.id)} />
            {k.label}
          </label>
        ))}
      </fieldset>
      <div className="sel-go">
        {!complete ? (
          <span className="small muted">
            Add your business details first. <Link to="/settings" className="inline-link">Open Settings</Link>
          </span>
        ) : null}
        <Button variant="primary" iconRight="arrow" disabled={!complete || usable.length === 0 || kinds.length === 0} onClick={go}>
          {total > 0 ? `Write ${total} draft${total === 1 ? '' : 's'}` : 'Write drafts'}
        </Button>
      </div>
    </section>
  )
}