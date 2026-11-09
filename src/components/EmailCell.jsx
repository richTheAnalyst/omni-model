import { memo, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { leadEmail } from '../lib/leadEmail.js'
import { findLeadEmail } from '../store/emailFinder.js'
import Icon from './Icon.jsx'

/** A company's email, beside its phone: a link when we have one, otherwise a button that looks on its website. */
const EmailCell = memo(function EmailCell({ lead, compact = false }) {
  const dispatch = useDispatch()
  const email = useSelector((s) => leadEmail(lead, s.tracking.byPlaceId[lead.id]))
  const [state, setState] = useState('idle') // idle | looking | none | error
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  if (email) {
    return (
      <a href={`mailto:${email}`} className={compact ? 'chip-link' : 'inline-link'} onClick={(e) => e.stopPropagation()}>
        <Icon name="mail" size={compact ? 13 : 14} /> {compact ? 'Email' : email}
      </a>
    )
  }
  if (!lead.website) return compact ? null : <span className="muted">No email</span>

  const look = async (e) => {
    e.stopPropagation()
    setState('looking')
    const res = await dispatch(findLeadEmail(lead.id))
    if (alive.current) setState(res.status === 'found' ? 'idle' : res.status)
  }
  return (
    <span className="email-find">
      <button type="button" className="link-button" disabled={state === 'looking'} onClick={look}>
        {state === 'looking' ? 'Looking…' : 'Find email'}
      </button>
      {state === 'none' ? <span className="muted small"> None on their site</span> : null}
      {state === 'error' ? <span className="muted small"> Could not check. Try again</span> : null}
    </span>
  )
})

export default EmailCell