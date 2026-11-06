import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getProposalTemplate } from '../api/proposalTemplate.js'

// One shared answer, so the Settings panel, the outreach tab and the bulk page do not each ask the server.
let cache = null
const listeners = new Set()
export function setProposalTemplateCache(value) {
  cache = value
  listeners.forEach((fn) => fn(value))
}

/** { template, loading, signedIn, reload }. template is null when none is uploaded (or for guests). */
export default function useProposalTemplate() {
  const signedIn = useSelector((s) => s.account.status === 'signedIn')
  const [template, setTemplate] = useState(cache?.template ?? null)
  const [loading, setLoading] = useState(signedIn && cache === null)

  const reload = useCallback(async () => {
    if (!signedIn) return
    setLoading(true)
    try {
      const res = await getProposalTemplate()
      setProposalTemplateCache({ template: res?.template || null })
    } catch {
      /* the panel simply shows no template; a failed look-up is not worth an error banner */
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    const on = (v) => setTemplate(v?.template ?? null)
    listeners.add(on)
    return () => listeners.delete(on)
  }, [])

  useEffect(() => {
    if (!signedIn) {
      cache = null
      setTemplate(null)
      return
    }
    if (cache === null) reload()
    else setTemplate(cache.template)
  }, [signedIn, reload])

  return { template, loading, signedIn, reload }
}