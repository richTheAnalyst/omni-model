import { memo, useEffect, useState } from 'react'
import { SCORE_BANDS, SCORE_EXPLAINER } from '../config/product.js'
import { getBand, toPercent } from '../lib/score.js'
import Icon from './Icon.jsx'

// The band is never conveyed by color alone: each has an icon and a word.
const BAND_ICON = { strong: 'check', potential: 'info', low: 'alert' }

/** Compact score for tables and cards: icon, number, word. */
export const ScoreBadge = memo(function ScoreBadge({ score, showLabel = true }) {
  const pct = toPercent(score)
  const band = getBand(pct)
  return (
    <span
      className={`score score-${band.tone}`}
      role="img"
      aria-label={`Score ${pct} out of 100. ${band.label}.`}
    >
      <Icon name={BAND_ICON[band.key]} size={13} />
      <b>{pct}</b>
      {showLabel ? <span className="score-word">{band.short}</span> : null}
    </span>
  )
})

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

/** Large score ring. The arc animates from its previous value when the score changes. */
export function ScoreRing({ score, caption, size = 132 }) {
  const pct = toPercent(score)
  const band = getBand(pct)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div className={`ring ring-${band.tone}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
        <circle className="ring-track" cx="60" cy="60" r={RING_R} />
        <circle
          className="ring-arc"
          cx="60"
          cy="60"
          r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - shown / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-center">
        <span className="ring-number" aria-label={`Score ${pct} out of 100`}>
          {pct}
        </span>
        {caption ? <span className="ring-caption">{caption}</span> : null}
      </div>
    </div>
  )
}

export function BandLabel({ score }) {
  const band = getBand(toPercent(score))
  return (
    <span className={`band band-${band.tone}`}>
      <Icon name={BAND_ICON[band.key]} size={14} />
      {band.label}
    </span>
  )
}

/** Explains what the score is and what each band means. */
export function ScoreLegend({ compact = false }) {
  return (
    <div className="legend">
      {!compact ? <p className="legend-lead">{SCORE_EXPLAINER}</p> : null}
      <ul className="legend-list">
        {SCORE_BANDS.map((b) => (
          <li key={b.key} className={`legend-item legend-${b.tone}`}>
            <span className="legend-range">
              <Icon name={BAND_ICON[b.key]} size={14} />
              {b.range}
            </span>
            <span className="legend-text">
              <strong>{b.label}</strong>
              <span>{b.meaning}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
