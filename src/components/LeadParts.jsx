import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { COPY, FACTOR_COPY, SIGNAL_COPY } from '../config/product.js'
import { useElapsed } from '../hooks/hooks.js'
import { prettifyKey, timeAgo } from '../lib/format.js'
import { toPercent } from '../lib/score.js'
import { cancelAnalysis, errorDismissed, startAnalysis } from '../store/analysisSlice.js'
import { clearedDoNotContact, markedDoNotContact } from '../store/dncSlice.js'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import { ScoreBadge } from './ScoreBadge.jsx'
import { ErrorPanel } from './States.jsx'

/* ------------------------------------------------------------------ */
/* Why this company? Score breakdown (points, not percentages)         */
/* ------------------------------------------------------------------ */

export const BreakdownPanel = memo(function BreakdownPanel({ entry }) {
  const rows = Object.entries(entry?.breakdown || {})
    .map(([key, value]) => ({ key, points: Number(value) || 0 }))
    .sort((a, b) => b.points - a.points)
  const max = Math.max(1, ...rows.map((r) => r.points))

  return (
    <section className="panel" aria-labelledby="why-title">
      <header className="panel-head">
        <h2 id="why-title">Why this company?</h2>
        <p className="muted">
          These are the factors that make up the score for {entry?.label || 'this offering'}. Each bar shows the points a
          factor contributed. They are points, not percentages.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="muted">No score breakdown was returned for this offering.</p>
      ) : (
        <ul className="factors">
          {rows.map((row) => {
            const copy = FACTOR_COPY[row.key]
            return (
              <li key={row.key} className="factor">
                <div className="factor-head">
                  <span className="factor-label">{copy?.label || prettifyKey(row.key)}</span>
                  <span className="factor-points">{row.points.toFixed(1)} pts</span>
                </div>
                <div className="factor-bar" aria-hidden="true">
                  <span style={{ width: `${(row.points / max) * 100}%` }} />
                </div>
                {copy?.hint ? <p className="factor-hint">{copy.hint}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
})

/* ------------------------------------------------------------------ */
/* Website intelligence: renders whatever signals the profile returns  */
/* ------------------------------------------------------------------ */

function isEmptySignal(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function SignalValue({ value, depth = 0 }) {
  if (Array.isArray(value)) {
    return (
      <ul className="chips">
        {value.map((item, i) => (
          <li key={i} className="chip">
            {typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  if (typeof value === 'object' && value !== null) {
    if (depth >= 2) return <code>{JSON.stringify(value)}</code>
    return (
      <dl className="signals nested">
        {Object.entries(value)
          .filter(([, v]) => !isEmptySignal(v))
          .map(([k, v]) => (
            <div className="signal" key={k}>
              <dt>{SIGNAL_COPY[k] || prettifyKey(k)}</dt>
              <dd>
                <SignalValue value={v} depth={depth + 1} />
              </dd>
            </div>
          ))}
      </dl>
    )
  }
  return <span>{String(value)}</span>
}

export const SignalsPanel = memo(function SignalsPanel({ analysis }) {
  const entries = Object.entries(analysis.signals || {})
  const found = entries.filter(([, v]) => !isEmptySignal(v))
  const missing = entries.filter(([, v]) => isEmptySignal(v))
  // The provider already in place is the one signal worth reading first.
  found.sort(([a], [b]) => (a === 'existing_provider' ? -1 : b === 'existing_provider' ? 1 : 0))

  return (
    <section className="panel" aria-labelledby="intel-title">
      <header className="panel-head">
        <h2 id="intel-title">Website intelligence</h2>
        <p className="muted">What Omni Model found on the company’s own website. It differs by business profile.</p>
      </header>

      {analysis.warning ? (
        <div className="notice notice-warn" role="status">
          <Icon name="alert" size={16} />
          <p>
            <strong>No signals were used.</strong> Omni Model couldn’t extract reliable signals from this site, so the
            score still rests on estimates. <span className="muted">({analysis.warning})</span>
          </p>
        </div>
      ) : null}

      {found.length > 0 ? (
        <dl className="signals">
          {found.map(([key, value]) => (
            <div className={`signal ${key === 'existing_provider' ? 'is-key' : ''}`} key={key}>
              <dt>{SIGNAL_COPY[key] || prettifyKey(key)}</dt>
              <dd>
                <SignalValue value={value} />
                {key === 'existing_provider' ? (
                  <span className="muted small block">Already serving this company. Think about how you would differ.</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : !analysis.warning ? (
        <p className="muted">No signals were found on this website.</p>
      ) : null}

      {missing.length > 0 ? (
        <p className="muted small signals-missing">
          Not found: {missing.map(([k]) => SIGNAL_COPY[k] || prettifyKey(k)).join(', ')}.
        </p>
      ) : null}
    </section>
  )
})

/* ------------------------------------------------------------------ */
/* Before / after analysis                                             */
/* ------------------------------------------------------------------ */

export function ScoreCompare({ lead, offeringKey, offeringLabels }) {
  const before = lead.analysis?.before
  const beforeScore = before?.scores?.[offeringKey]?.score
  const afterScore = lead.scores?.[offeringKey]?.score
  if (beforeScore == null || afterScore == null) return null

  const b = toPercent(beforeScore)
  const a = toPercent(afterScore)
  const delta = a - b
  const noSignals = Boolean(lead.analysis?.warning)
  const bestChanged = before.best_offering && before.best_offering !== lead.best_offering

  return (
    <div className="compare" aria-label="Score before and after website analysis">
      <div className="compare-side">
        <span className="tag">Estimated</span>
        <ScoreBadge score={beforeScore} showLabel={false} />
        <span className="muted small">Industry, nearby companies and review volume</span>
      </div>
      <Icon name="arrow" size={18} className="compare-arrow" />
      <div className="compare-side is-after">
        <span className="tag tag-accent">{noSignals ? 'Analyzed, no signals' : 'Website analyzed'}</span>
        <ScoreBadge score={afterScore} showLabel={false} />
        <span className="muted small">{noSignals ? 'No website signals could be used' : 'Includes what the website revealed'}</span>
      </div>
      <p className="compare-delta">
        {delta === 0 ? 'The score did not change.' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} points after analysis.`}
        {bestChanged
          ? ` Best fit changed from ${offeringLabels[before.best_offering] || before.scores?.[before.best_offering]?.label || before.best_offering} to ${offeringLabels[lead.best_offering] || lead.best_offering}.`
          : ''}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Analysis control                                                    */
/* ------------------------------------------------------------------ */

export function AnalysisPanel({ lead, displayName }) {
  const dispatch = useDispatch()
  const state = useSelector((s) => s.analysis.statusById[lead.id])
  const running = state?.status === 'running'
  const elapsed = useElapsed(running ? state.startedAt : 0)
  const analyzed = Boolean(lead.analysis)

  if (!lead.website) {
    return (
      <section className="panel panel-flat" aria-labelledby="analysis-title">
        <h2 id="analysis-title" className="panel-title">Website analysis</h2>
        <p className="muted">
          This company has no website on record, so there is nothing to analyze. The score stays an estimate.
        </p>
      </section>
    )
  }

  if (running) {
    return (
      <section className="panel panel-flat analysis-running" aria-labelledby="analysis-title" role="status" aria-live="polite">
        <h2 id="analysis-title" className="panel-title">Analyzing {displayName}…</h2>
        <p className="muted">{COPY.loading.analysis} This usually takes 10 to 40 seconds.</p>
        <div className="progress" aria-hidden="true">
          <span className="progress-bar" />
        </div>
        <div className="analysis-foot">
          <span className="muted small">{elapsed}s elapsed</span>
          <Button variant="ghost" size="sm" onClick={() => dispatch(cancelAnalysis(lead.id))}>
            Cancel
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel panel-flat" aria-labelledby="analysis-title">
      <h2 id="analysis-title" className="panel-title">Website analysis</h2>
      {analyzed ? (
        <p className="muted">
          Analyzed {timeAgo(lead.analysis.at)}. The score below includes what the website revealed.
        </p>
      ) : (
        <p className="muted">
          This score is an estimate. Analyzing the website adds hiring, growth and provider signals, and the score can go up
          or down.
        </p>
      )}

      {state?.status === 'error' ? (
        <ErrorPanel
          compact
          error={state.error}
          context="analysis"
          onRetry={() => dispatch(startAnalysis(lead.id))}
          onDismiss={() => dispatch(errorDismissed(lead.id))}
        />
      ) : null}

      <Button
        variant={analyzed ? 'secondary' : 'primary'}
        icon="search"
        onClick={() => dispatch(startAnalysis(lead.id))}
      >
        {analyzed ? 'Analyze Again' : 'Analyze Website'}
      </Button>
      {!analyzed ? <p className="muted small">If a site can’t be read, you can carry on with the estimated score.</p> : null}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Do not contact                                                      */
/* ------------------------------------------------------------------ */

export function DncControl({ lead, displayName }) {
  const dispatch = useDispatch()
  const on = useSelector((s) => Boolean(s.dnc.byId[lead.id]))
  const toggle = () =>
    dispatch(on ? clearedDoNotContact(lead.id) : markedDoNotContact({ id: lead.id, name: displayName }))
  return (
    <section className={`panel panel-flat dnc ${on ? 'is-on' : ''}`} aria-labelledby="dnc-title">
      <div className="dnc-row">
        <div>
          <h2 id="dnc-title" className="panel-title">Do not contact</h2>
          <p className="muted small">
            {on ? 'Outreach is hidden for this company.' : 'Hides outreach for this company.'} {COPY.dncNote}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="dnc-title"
          className={`switch ${on ? 'is-on' : ''}`}
          onClick={toggle}
        >
          <span className="switch-knob" />
          <span className="sr-only">{on ? 'On' : 'Off'}</span>
        </button>
      </div>
    </section>
  )
}

