import { useEffect, useId, useRef, useState } from 'react'

export function SelectField({ label, value, onChange, options, placeholder, disabled, hint, required }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <div className="select-wrap">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          aria-describedby={hint ? `${id}-hint` : undefined}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function ComboBoxField({ label, value, onChange, options, placeholder, hint, error, required, ...rest }) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const boxRef = useRef(null)
  const listRef = useRef(null)

  const query = value.trim().toLowerCase()
  const matches = query
    ? options.filter(
        (o) => o.value.toLowerCase().includes(query) || o.label.toLowerCase().includes(query),
      )
    : options
  const showList = open && matches.length > 0

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    setHighlight(-1)
  }, [value])

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    listRef.current.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  const pick = (option) => {
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showList) {
        setOpen(true)
        return
      }
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setHighlight((h) =>
        h < 0 ? (delta === 1 ? 0 : matches.length - 1) : (h + delta + matches.length) % matches.length,
      )
    } else if (e.key === 'Enter' && showList && highlight >= 0) {
      e.preventDefault()
      pick(matches[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')

  return (
    <div className="field combo" ref={boxRef}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <div className="combo-wrap">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showList && highlight >= 0 ? `${listId}-option-${highlight}` : undefined}
          {...rest}
        />
        <span className="combo-caret" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
        {showList ? (
          <ul className="combo-list" id={listId} role="listbox" ref={listRef} aria-label={label}>
            {matches.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={i === highlight}
                className={`combo-option${i === highlight ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(o)
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {o.label !== o.value ? <span className="combo-label">{o.label}</span> : null}
                <span className={o.label !== o.value ? 'combo-value' : ''}>{o.value}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({ label, value, onChange, hint, error, type = 'text', required, ...rest }) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
