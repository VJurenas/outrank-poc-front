import type { LeaderboardEntry } from '../lib/api.ts'

export type RankSnapshot = { t: number; rank: number; total: number }

type Props = {
  history: RankSnapshot[]
  myEntry?: LeaderboardEntry
  total: number
}

const SVG_W = 900
const SVG_H = 360
const L = 1, R = 50, T = 12, B = 28
const chartW = SVG_W - L - R
const chartH = SVG_H - T - B

export default function RaceTrack({ history, myEntry, total }: Props) {
  if (history.length === 0 || total === 0) {
    return (
      <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Waiting for rank data…
      </div>
    )
  }

  // Zone boundaries based on current total player count
  const goldEnd   = Math.max(1, Math.floor(total * 0.40))
  const silverEnd = Math.max(goldEnd + 1, Math.floor(total * 0.60))

  // rank→y: rank 1 at top, rank total at bottom
  const rankToY = (rank: number) => {
    if (total <= 1) return T + chartH / 2
    return T + ((rank - 1) / (total - 1)) * chartH
  }

  // t→x
  const tMin  = history[0].t
  const tMax  = history[history.length - 1].t
  const tSpan = Math.max(tMax - tMin, 1)
  const tToX  = (t: number) =>
    history.length < 2 ? L + chartW / 2 : L + ((t - tMin) / tSpan) * chartW

  // Zone band boundaries (midpoint between adjacent ranks)
  const goldBotY   = total > 1 ? rankToY(goldEnd + 0.5)   : T + chartH * 0.40
  const silverBotY = total > 1 ? rankToY(silverEnd + 0.5) : T + chartH * 0.60

  // Line colour follows current zone
  const zone      = myEntry?.zone
  const lineColor = zone === 'gold' ? 'var(--gold)' : zone === 'silver' ? 'var(--silver)' : 'var(--dead)'

  const last   = history[history.length - 1]
  const cx     = tToX(last.t)
  const cy     = rankToY(last.rank)
  const points = history.map(s => `${tToX(s.t).toFixed(1)},${rankToY(s.rank).toFixed(1)}`).join(' ')

  // X-axis: pick a nice interval so we get ~3-5 labels
  const elapsedMs   = tMax - tMin
  const niceIvs     = [15_000, 30_000, 60_000, 2*60_000, 5*60_000, 10*60_000, 15*60_000]
  const ivMs        = niceIvs.find(iv => elapsedMs / iv <= 5) ?? 15*60_000
  const timeLabels: { x: number; label: string }[] = []
  if (history.length >= 2) {
    for (let t = tMin; t <= tMax + 1; t += ivMs) {
      const elapsed = t - tMin
      const m = Math.floor(elapsed / 60_000)
      const s = Math.floor((elapsed % 60_000) / 1000)
      timeLabels.push({ x: tToX(t), label: `${m}:${s.toString().padStart(2, '0')}` })
    }
  }

  // Y-axis: labels at zone-boundary ranks (deduplicated for small player counts)
  const yLabelRanks = Array.from(new Set([1, goldEnd, silverEnd, total]))
  const yLabels = yLabelRanks.map(rank => ({ rank, label: `#${rank}` }))

  return (
    <div style={{ width: '100%', height: '360px', minHeight: '360px', maxHeight: '360px', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: '360px', display: 'block' }} preserveAspectRatio="none">

        {/* ── Zone background bands ─────────────────────────────── */}
        <rect x={L} y={T}          width={chartW} height={goldBotY - T}            style={{ fill: 'var(--zone-gold-bg)' }} />
        <rect x={L} y={goldBotY}   width={chartW} height={silverBotY - goldBotY}   style={{ fill: 'var(--zone-silver-bg)' }} />
        <rect x={L} y={silverBotY} width={chartW} height={T + chartH - silverBotY} style={{ fill: 'var(--zone-dead-bg)' }} />

        {/* ── Zone boundary lines ───────────────────────────────── */}
        <line x1={L} y1={goldBotY}   x2={L + chartW} y2={goldBotY}
          strokeDasharray="3 3" style={{ stroke: 'var(--gold)', opacity: 0.45 }} />
        <line x1={L} y1={silverBotY} x2={L + chartW} y2={silverBotY}
          strokeDasharray="3 3" style={{ stroke: 'var(--silver)', opacity: 0.45 }} />

        {/* ── Zone labels (right-aligned inside band) ───────────── */}
        <text x={L + chartW - 6} y={T + (goldBotY - T) / 2 + 4}
          textAnchor="end" fontSize={12} style={{ fill: 'var(--gold)', opacity: 0.7 }}>GOLD</text>
        <text x={L + chartW - 6} y={goldBotY + (silverBotY - goldBotY) / 2 + 4}
          textAnchor="end" fontSize={12} style={{ fill: 'var(--silver)', opacity: 0.7 }}>SILVER</text>
        <text x={L + chartW - 6} y={silverBotY + (T + chartH - silverBotY) / 2 + 4}
          textAnchor="end" fontSize={12} style={{ fill: 'var(--dead)', opacity: 0.7 }}>DEAD</text>

        {/* ── Rank line ─────────────────────────────────────────── */}
        <polyline
          points={points}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: lineColor }}
        />

        {/* ── Current position dot ──────────────────────────────── */}
        <circle cx={cx} cy={cy} r={4} style={{ fill: lineColor }} />
        <circle cx={cx} cy={cy} r={7} fill="none" strokeWidth={1.5}
          style={{ stroke: lineColor, opacity: 0.4 }} />

        {/* ── Y-axis rank labels ────────────────────────────────── */}
        {yLabels.map(({ rank, label }) => (
          <text key={rank} x={L + chartW + 5} y={rankToY(rank) + 3.5}
            textAnchor="start" fontSize={12} style={{ fill: 'var(--muted)' }}>
            {label}
          </text>
        ))}

        {/* ── X-axis time labels ────────────────────────────────── */}
        {timeLabels.map(({ x, label }) => (
          <text key={label} x={x} y={T + chartH + 16}
            textAnchor="middle" fontSize={12} style={{ fill: 'var(--muted)' }}>
            {label}
          </text>
        ))}

        {/* ── Axes ─────────────────────────────────────────────── */}
        <line x1={L + chartW} y1={T} x2={L + chartW} y2={T + chartH}
          style={{ stroke: 'var(--chart-border)', opacity: 0.4 }} />
        <line x1={L} y1={T + chartH} x2={L + chartW} y2={T + chartH}
          style={{ stroke: 'var(--chart-border)', opacity: 0.4 }} />
      </svg>
    </div>
  )
}
