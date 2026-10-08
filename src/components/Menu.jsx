import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'

/** Small button-with-menu. Closes on Escape, outside click and selection; arrow keys move between items. */
export default function Menu({ label, icon, items, onSelect, disabled, align = 'start' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (open) root.current?.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
      button.current?.focus()
      return
    }
    if (!open || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    const els = [...root.current.querySelectorAll('[role="menuitem"]')]
    const i = els.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
    els[next]?.focus()
  }

  return (
    <div className="menu" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="btn btn-secondary btn-md"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{label}</span>
        <Icon name="chevron" size={14} />
      </button>
      {open ? (
        <ul className={`menu-list menu-${align}`} role="menu" id={id}>
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setOpen(false)
                  button.current?.focus()
                  onSelect(item.id)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
