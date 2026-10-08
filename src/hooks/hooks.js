import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useDispatch } from 'react-redux'
import { exportDraft, EXPORT_MAX_CHARS } from '../api/export.js'
import { serializeError } from '../api/client.js'
import { downloadBlob, copyText } from '../lib/download.js'
import { sanitizeFilename } from '../lib/format.js'
import { exportLogged } from '../store/actions.js'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Omni Model` : 'Omni Model'
  }, [title])
}

/** Subscribes to a media query; only the layout that matches is ever rendered. */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Whole seconds since `since`, ticking once a second. Stops when `since` is falsy. */
export function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!since) return undefined
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0
}

/** Copy with a short "Copied" confirmation that cleans up after itself. */
export function useCopy() {
  const [state, setState] = useState('idle') // idle | copied | failed
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = useCallback(async (text, fallbackElement) => {
    const ok = await copyText(text, fallbackElement)
    setState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }, [])
  return [state, copy]
}

/** Export through the API and save the file. One export at a time. */
export function useExport() {
  const dispatch = useDispatch()
  const [state, setState] = useState({ status: 'idle', message: '', error: null })
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])

  const run = useCallback(
    async ({ text, format, title, baseName, logLabel }) => {
      if (controller.current) return
      if (!text.trim()) {
        setState({ status: 'error', message: '', error: { kind: 'validation', detail: 'There is nothing to export yet.' } })
        return
      }
      if (text.length > EXPORT_MAX_CHARS) {
        setState({
          status: 'error',
          message: '',
          error: {
            kind: 'validation',
            detail: `This draft is ${text.length.toLocaleString()} characters. Exports are limited to ${EXPORT_MAX_CHARS.toLocaleString()}.`,
          },
        })
        return
      }
      const filename = sanitizeFilename(baseName)
      const ctl = new AbortController()
      controller.current = ctl
      setState({ status: 'preparing', message: '', error: null })
      try {
        const blob = await exportDraft({ text, format, title, filename }, { signal: ctl.signal })
        downloadBlob(blob, `${filename}.${format}`)
        dispatch(exportLogged({ ...logLabel, format }))
        setState({ status: 'done', message: `Downloaded ${filename}.${format}`, error: null })
      } catch (err) {
        const error = serializeError(err)
        setState(error.kind === 'aborted' ? { status: 'idle', message: '', error: null } : { status: 'error', message: '', error })
      } finally {
        controller.current = null
      }
    },
    [dispatch],
  )

  const reset = useCallback(() => setState({ status: 'idle', message: '', error: null }), [])
  return { ...state, run, reset }
}
