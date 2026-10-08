import { useCallback, useEffect, useRef, useState } from 'react'
import { EXPORT_FORMATS } from '../config/product.js'
import { EXPORT_MAX_CHARS } from '../api/export.js'
import { COPY } from '../config/product.js'
import { useCopy, useExport } from '../hooks/hooks.js'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Menu from './Menu.jsx'
import { ErrorPanel } from './States.jsx'

const UNSUBSCRIBE = /unsubscribe|opt[\s-]?out/i

/**
 * Editable draft with copy and export. The text lives in local state while typing
 * and is committed to Redux shortly after (and on unmount) so keystrokes don't
 * re-render the whole app.
 */
export default function DraftEditor({
  draft,
  kindLabel,
  baseName,
  title,
  logLabel,
  onCommit,
  onRegenerate,
  regenerating,
  staleOffering,
}) {
  const [value, setValue] = useState(draft.text)
  const valueRef = useRef(draft.text)
  const savedRef = useRef(draft.text)
  const commitRef = useRef(onCommit)
  const textarea = useRef(null)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [copyState, copy] = useCopy()
  const exporter = useExport()
  commitRef.current = onCommit

  const flush = useCallback(() => {
    if (valueRef.current !== savedRef.current) {
      savedRef.current = valueRef.current
      commitRef.current(valueRef.current)
    }
  }, [])

  useEffect(() => {
    valueRef.current = value
    if (value === savedRef.current) return undefined
    const t = setTimeout(flush, 400)
    return () => clearTimeout(t)
  }, [value, flush])

  useEffect(() => flush, [flush])

  const edited = value !== draft.generatedText
  const lostUnsubscribe = UNSUBSCRIBE.test(draft.generatedText) && !UNSUBSCRIBE.test(value)
  const tooLong = value.length > EXPORT_MAX_CHARS

  const runExport = (format) => {
    exporter.reset()
    exporter.run({ text: value, format, title, baseName, logLabel })
  }

  const regenerate = () => {
    if (edited && !confirmRegen) {
      setConfirmRegen(true)
      return
    }
    setConfirmRegen(false)
    onRegenerate()
  }

  return (
    <div className="draft">
      {staleOffering ? (
        <div className="notice notice-info" role="status">
          <Icon name="info" size={16} />
          <p>
            This draft was written for <strong>{staleOffering}</strong>. Regenerate it to match the offering you’ve chosen.
          </p>
        </div>
      ) : null}

      <label className="sr-only" htmlFor="draft-text">
        {kindLabel} draft, editable
      </label>
      <textarea
        id="draft-text"
        ref={textarea}
        className="draft-text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck
        rows={16}
      />

      <div className="draft-meta">
        <span className="muted small">
          {value.length.toLocaleString()} characters{edited ? ' · edited' : ''}
        </span>
        <span className="muted small" role="status" aria-live="polite">
          {copyState === 'copied' ? 'Copied to clipboard' : copyState === 'failed' ? 'Couldn’t copy. Select the text and copy it manually.' : ''}
        </span>
      </div>

      {lostUnsubscribe ? (
        <div className="notice notice-warn" role="status">
          <Icon name="alert" size={16} />
          <p>The unsubscribe line has been removed. Keep it in so recipients can opt out.</p>
        </div>
      ) : null}
      {tooLong ? (
        <div className="notice notice-warn" role="status">
          <Icon name="alert" size={16} />
          <p>This draft is over {EXPORT_MAX_CHARS.toLocaleString()} characters, which is the export limit.</p>
        </div>
      ) : null}

      <div className="draft-actions">
        <Button variant="primary" icon={copyState === 'copied' ? 'check' : 'copy'} onClick={() => copy(value, textarea.current)}>
          {copyState === 'copied' ? 'Copied' : 'Copy Draft'}
        </Button>
        <Menu
          label="Export Draft"
          icon="download"
          items={EXPORT_FORMATS}
          onSelect={runExport}
          disabled={exporter.status === 'preparing' || !value.trim() || tooLong}
        />
        <span className="draft-actions-spacer" />
        {confirmRegen ? (
          <span className="confirm" role="alert">
            <span className="small">Replace your edits?</span>
            <Button size="sm" variant="danger" onClick={regenerate} loading={regenerating}>
              Regenerate anyway
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRegen(false)}>
              Keep my edits
            </Button>
          </span>
        ) : (
          <Button variant="ghost" icon="refresh" onClick={regenerate} loading={regenerating}>
            Regenerate
          </Button>
        )}
      </div>

      <div className="export-status" role="status" aria-live="polite">
        {exporter.status === 'preparing' ? <span className="muted small">{COPY.loading.export}</span> : null}
        {exporter.status === 'done' ? (
          <span className="small export-done">
            <Icon name="check" size={14} /> {exporter.message}
          </span>
        ) : null}
      </div>
      {exporter.status === 'error' ? (
        <ErrorPanel compact error={exporter.error} context="export" onDismiss={exporter.reset} />
      ) : null}
    </div>
  )
}
