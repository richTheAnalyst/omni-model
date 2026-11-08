import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { serializeError } from '../api/client.js'
import { renderProposal, renderProposals } from '../api/proposalTemplate.js'
import { trackingErrorMessage } from '../config/trackingUi.js'
import useProposalTemplate from '../hooks/useProposalTemplate.js'
import { downloadBlob } from '../lib/download.js'
import { displayName, sanitizeFilename } from '../lib/format.js'
import { selectBusiness } from '../store/selectors.js'
import Button from './Button.jsx'

/** The request body for one company. */
export function proposalBody(lead, offeringLabel, business) {
  return {
    company: displayName(lead),
    city: lead.city || '',
    offering_label: offeringLabel || '',
    business: {
      our_name: business?.our_name || '',
      our_title: business?.our_title || '',
      our_email: business?.our_email || '',
      our_phone: business?.our_phone || '',
    },
  }
}

/**
 * "Download proposal PDF": the business's own uploaded proposal, filled in for these companies.
 * items: [{ lead, offeringLabel }]. One company gives a PDF, several give a zip. Shows nothing without an uploaded template.
 */
export default function ProposalPdfDownload({ items, size = 'sm', variant = 'secondary' }) {
  const { template } = useProposalTemplate()
  const business = useSelector(selectBusiness)
  const [state, setState] = useState({ busy: false, error: '', done: '' })
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  if (!template || !items?.length) return null

  const go = async () => {
    setState({ busy: true, error: '', done: '' })
    try {
      const bodies = items.map((i) => proposalBody(i.lead, i.offeringLabel, business))
      let blob, filename
      if (items.length === 1) {
        blob = await renderProposal(bodies[0])
        filename = `${sanitizeFilename(`Proposal_${bodies[0].company}`)}.pdf`
      } else {
        blob = await renderProposals(bodies)
        filename = 'proposals.zip'
      }
      if (!blob || blob.size === 0) throw new Error('The file came back empty. Please try again.')
      downloadBlob(blob, filename)
      if (alive.current) setState({ busy: false, error: '', done: `Downloaded ${filename}` })
    } catch (err) {
      if (!alive.current) return
      const plain = serializeError(err)
      setState({ busy: false, error: plain.kind === 'unknown' && err?.message ? err.message : trackingErrorMessage(plain), done: '' })
    }
  }

  const many = items.length > 1
  return (
    <div className="pdf-dl">
      <Button size={size} variant={variant} icon="download" loading={state.busy} onClick={go}>
        {many ? `Download ${items.length} proposals (zip)` : 'Download proposal as PDF'}
      </Button>
      <span className="muted small">Your own design ({template.filename}). Edits to the text below do not change this PDF.</span>
      {state.error ? <p className="notice notice-warn" role="alert">{state.error}</p> : null}
      {state.done ? <p className="muted small" role="status">{state.done}</p> : null}
    </div>
  )
}