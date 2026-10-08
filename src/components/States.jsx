import Button from './Button.jsx'
import Icon from './Icon.jsx'
import { describeError } from '../lib/errors.js'

/** Error experience. `error` is the plain { kind, status, detail } object from Redux. */
export function ErrorPanel({ error, context, onRetry, onDismiss, compact = false }) {
  const d = describeError(error, context)
  return (
    <div className={`state state-error ${compact ? 'is-compact' : ''}`} role="alert">
      <div className="state-icon" aria-hidden="true">
        <Icon name="alert" size={20} />
      </div>
      <div className="state-body">
        <h3>{d.title}</h3>
        <p>{d.message}</p>
        {d.hint ? <p className="muted small">{d.hint}</p> : null}
        {d.detail ? (
          <details className="state-details">
            <summary>Technical details</summary>
            <p>{d.detail}</p>
          </details>
        ) : null}
        {(d.retryable && onRetry) || onDismiss ? (
          <div className="state-actions">
            {d.retryable && onRetry ? (
              <Button variant="primary" size="sm" icon="refresh" onClick={onRetry}>
                {d.cta || 'Try Again'}
              </Button>
            ) : null}
            {onDismiss ? (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="state state-empty">
      <div className="state-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </div>
      <div className="state-body">
        <h3>{title}</h3>
        {children ? <p>{children}</p> : null}
        {action ? <div className="state-actions">{action}</div> : null}
      </div>
    </div>
  )
}

export function Skeleton({ width = '100%', height = 14, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height }} aria-hidden="true" />
}

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <Skeleton width="38%" height={28} />
      <div style={{ height: 12 }} />
      <Skeleton width="62%" height={14} />
      <div style={{ height: 28 }} />
      <Skeleton height={160} />
    </div>
  )
}

export function ResultsSkeleton({ rows = 6 }) {
  return (
    <div className="panel results-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="results-skeleton-row" key={i}>
          <div className="stack-xs" style={{ flex: 1 }}>
            <Skeleton width={`${48 + ((i * 11) % 30)}%`} height={14} />
            <Skeleton width="30%" height={11} />
          </div>
          <Skeleton width={72} height={24} />
        </div>
      ))}
    </div>
  )
}
