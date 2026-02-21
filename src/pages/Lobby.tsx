import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type GameInfo } from '../lib/api.ts'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useCommunity } from '../contexts/CommunityContext.tsx'
import PriceChart from '../components/PriceChart.tsx'

type Session = { playerId: string; sessionToken: string; alias: string }
type Prediction = { intervalLabel: string; predictedPrice: number }

function useCountdown(target: Date | undefined) {
  const [remaining, setRemaining] = useState(0)
  const targetMs = target?.getTime()
  useEffect(() => {
    if (!targetMs) return
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()))
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [targetMs])
  return remaining
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

// ─── Prediction Distribution Histogram ──────────────────────────────────────

type HistogramProps = {
  allPredictions: { alias: string; interval_label: string; predicted_price: number }[]
  intervals: string[]
  currentPrice: number | null
}

function PredictionHistogram({ allPredictions, intervals, currentPrice }: HistogramProps) {
  const [activeInterval, setActiveInterval] = useState<string>(() => intervals[0] ?? '')

  // Sync active interval when game mode loads
  useEffect(() => {
    if (intervals.length > 0 && !intervals.includes(activeInterval)) {
      setActiveInterval(intervals[0])
    }
  }, [intervals, activeInterval])

  const prices = useMemo(
    () => allPredictions.filter(p => p.interval_label === activeInterval).map(p => p.predicted_price),
    [allPredictions, activeInterval],
  )

  const playerCount = new Set(allPredictions.map(p => p.alias)).size

  // SVG layout
  const SVG_W = 380, SVG_H = 180
  const L = 68, R = 36, T = 10, B = 10
  const chartW = SVG_W - L - R
  const chartH = SVG_H - T - B

  const hist = useMemo(() => {
    if (prices.length === 0) return null
    const n = prices.length
    const k = Math.max(3, Math.min(10, Math.ceil(1 + Math.log2(n))))
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const spread = maxP - minP
    // Bucket width: based on spread, or ±0.2% of price if all identical
    const bw = spread === 0 ? (minP * 0.002 || 1) : spread / k
    // Bucket start: centre on the single price when spread=0
    const bStart = spread === 0 ? minP - bw * Math.floor(k / 2) : minP
    const buckets = Array.from({ length: k }, (_, i) => {
      const lo = bStart + i * bw
      const hi = lo + bw
      const count = prices.filter(p => p >= lo && (i === k - 1 ? p <= hi : p < hi)).length
      return { lo, hi, count }
    })
    const maxCount = Math.max(...buckets.map(b => b.count), 1)
    // Display range: union of bucket range + current price, with 15% padding
    const allVals = currentPrice !== null ? [...prices, currentPrice] : prices
    const dispMin = Math.min(...allVals, bStart)
    const dispMax = Math.max(...allVals, bStart + k * bw)
    const pad = (dispMax - dispMin) * 0.15 || bw * 0.5
    const rangeMin = dispMin - pad
    const rangeSpan = (dispMax + pad) - rangeMin
    return { buckets, maxCount, rangeMin, rangeSpan }
  }, [prices, currentPrice])

  const priceToY = (p: number) =>
    hist ? T + chartH * (1 - (p - hist.rangeMin) / hist.rangeSpan) : 0
  const countToBarW = (c: number) =>
    hist ? (c / hist.maxCount) * chartW : 0

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          Prediction distribution · {playerCount} player{playerCount !== 1 ? 's' : ''}
        </span>
        {intervals.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {intervals.map(iv => (
              <button
                key={iv}
                onClick={() => setActiveInterval(iv)}
                style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
                  background: iv === activeInterval ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${iv === activeInterval ? 'var(--muted)' : 'var(--border)'}`,
                  color: iv === activeInterval ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {iv}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }}>
          {!hist ? (
            <text x={SVG_W / 2} y={SVG_H / 2 + 4} textAnchor="middle" fontSize={11}
              style={{ fill: 'var(--muted)' }}>
              No predictions yet for {activeInterval}
            </text>
          ) : (
            <>
              {hist.buckets.map((b, i) => {
                const y1 = priceToY(b.hi)     // top of bar (small y = high on screen)
                const y2 = priceToY(b.lo)     // bottom of bar
                const bh = Math.max(1, y2 - y1 - 1)   // 1px gap between bars
                const barWidth = countToBarW(b.count)
                const midY = (y1 + y2) / 2
                return (
                  <g key={i}>
                    {b.count > 0 && (
                      <rect x={L} y={y1} width={barWidth} height={bh}
                        style={{ fill: 'var(--accent)', opacity: 0.35 }} />
                    )}
                    {/* Bucket lower-boundary price label */}
                    <text x={L - 4} y={y2 + 3.5} textAnchor="end" fontSize={9}
                      style={{ fill: 'var(--muted)' }}>
                      {b.lo.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </text>
                    {/* Count label at bar tip */}
                    {b.count > 0 && (
                      <text x={L + barWidth + 4} y={midY + 3.5} textAnchor="start" fontSize={9}
                        style={{ fill: 'var(--muted)' }}>
                        {b.count}
                      </text>
                    )}
                  </g>
                )
              })}
              {/* Upper boundary label for the topmost bucket */}
              <text
                x={L - 4}
                y={priceToY(hist.buckets[hist.buckets.length - 1].hi) + 3.5}
                textAnchor="end" fontSize={9} style={{ fill: 'var(--muted)' }}
              >
                {hist.buckets[hist.buckets.length - 1].hi.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </text>
              {/* Current price dashed line */}
              {currentPrice !== null && (() => {
                const cy = priceToY(currentPrice)
                return (
                  <>
                    <line x1={L} y1={cy} x2={SVG_W - R} y2={cy}
                      strokeWidth={1.5} strokeDasharray="4 3"
                      style={{ stroke: 'var(--accent-2)' }} />
                    <text x={SVG_W - R + 3} y={cy + 3.5} textAnchor="start" fontSize={9}
                      style={{ fill: 'var(--accent-2)' }}>
                      {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </text>
                  </>
                )
              })()}
            </>
          )}
        </svg>
      </div>
    </div>
  )
}

export default function Lobby() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, openSignIn } = useAuth()
  const { setGameSlug } = useCommunity()

  useEffect(() => {
    if (id) setGameSlug(id)
    return () => setGameSlug(null)
  }, [id, setGameSlug])

  const [game, setGame] = useState<GameInfo | null>(null)
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(() => {
    try { return JSON.parse(localStorage.getItem(`session-${id}`) ?? 'null') } catch { return null }
  })
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(() =>
    !!localStorage.getItem(`predictions-${id}`)
  )
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [allPredictions, setAllPredictions] = useState<{ alias: string; interval_label: string; predicted_price: number }[]>([])
  const [joining, setJoining] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)

  const kickoffDate = useMemo(
    () => game ? new Date(game.kickoff_at) : undefined,
    [game?.kickoff_at]  // eslint-disable-line react-hooks/exhaustive-deps
  )
  const remaining = useCountdown(kickoffDate)

  // Fetch game once on mount
  useEffect(() => {
    if (!id) return
    api.getGame(id)
      .then(setGame)
      .catch(() => setError('Game not found'))
  }, [id])

  // Redirect to live view when game starts
  const gameStatus = game?.status
  useEffect(() => {
    if (gameStatus === 'live' || gameStatus === 'ended') {
      navigate(`/game/${id}/live`)
    }
  }, [gameStatus, id, navigate])

  // Poll for status change
  useEffect(() => {
    if (!id || gameStatus !== 'lobby') return
    const interval = setInterval(() =>
      api.getGame(id).then(setGame).catch(() => {}), 3000
    )
    return () => clearInterval(interval)
  }, [id, gameStatus])

  // Poll live price every 3s
  useEffect(() => {
    if (!game) return
    const fetchPrice = () =>
      api.getPrices().then(p => setLivePrice(p[game.asset] ?? null)).catch(() => {})
    fetchPrice()
    const interval = setInterval(fetchPrice, 3000)
    return () => clearInterval(interval)
  }, [game?.asset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll predictions table every 5s
  useEffect(() => {
    if (!id || gameStatus !== 'lobby') return
    const fetch = () => api.getPredictions(id).then(setAllPredictions).catch(() => {})
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [id, gameStatus])

  // Auto-join when user signs in and we have a game
  useEffect(() => {
    if (user && game && game.status === 'lobby' && !session) {
      handleJoin()
    }
  }, [user?.sessionToken, game?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const intervals = game?.mode === '15min' ? ['T+15'] : ['T+15', 'T+30', 'T+45', 'T+60']

  const closeDate = useMemo(() => {
    if (!kickoffDate || !game) return undefined
    const ms = game.mode === '15min' ? 15 * 60_000 : 60 * 60_000
    return new Date(kickoffDate.getTime() + ms)
  }, [kickoffDate, game?.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Default active label to first interval once we know the game mode
  if (activeLabel === null && intervals.length > 0) setActiveLabel(intervals[0])

  // Stable reference: only recompute when the stored prediction values change
  const chartPredictions = useMemo(() => {
    if (!submitted || !id) return []
    return (JSON.parse(localStorage.getItem(`predictions-${id}`) ?? '[]') as { intervalLabel: string; predictedPrice: number }[])
      .map(p => ({ label: p.intervalLabel, price: p.predictedPrice }))
  }, [submitted, id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJoin() {
    if (!id || !user) return
    setJoining(true)
    try {
      const result = await api.joinGame(id, user.sessionToken)
      const s = { ...result, alias: user.alias }
      setSession(s)
      localStorage.setItem(`session-${id}`, JSON.stringify(s))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setJoining(false)
    }
  }

  const STAKE_PER_PREDICTION = 100
  const isResubmit = submitted  // true when editing a previously submitted set

  // When user clicks the price chart: fill the activeLabel input, then advance
  // to the next empty interval so successive clicks fill them in order.
  function handleChartPriceClick(price: number) {
    if (submitted || !activeLabel) return
    const rounded = Math.round(price * 100) / 100
    setPredictions(prev => {
      const next = { ...prev, [activeLabel]: String(rounded) }
      // Advance activeLabel to the first interval that is still empty after this fill
      const idx = intervals.indexOf(activeLabel)
      for (let i = 1; i <= intervals.length; i++) {
        const candidate = intervals[(idx + i) % intervals.length]
        if (!next[candidate]) { setActiveLabel(candidate); break }
      }
      return next
    })
  }

  // Validate inputs and show the confirm modal instead of submitting directly
  function handleLockInClick() {
    const preds: Prediction[] = intervals.map(label => ({
      intervalLabel: label,
      predictedPrice: parseFloat(predictions[label] ?? '0'),
    }))
    if (preds.some(p => isNaN(p.predictedPrice) || p.predictedPrice <= 0)) {
      setError('All predictions must be valid positive prices')
      return
    }
    setError('')
    setPendingConfirm(true)
  }

  function handleEditPredictions() {
    const stored = JSON.parse(localStorage.getItem(`predictions-${id}`) ?? '[]') as Prediction[]
    const map: Record<string, string> = {}
    for (const p of stored) map[p.intervalLabel] = String(p.predictedPrice)
    setPredictions(map)
    setSubmitted(false)
    setError('')
  }

  async function submitPredictions() {
    if (!id || !session || !game) return
    const preds: Prediction[] = intervals.map(label => ({
      intervalLabel: label,
      predictedPrice: parseFloat(predictions[label] ?? '0'),
    }))
    if (preds.some(p => isNaN(p.predictedPrice) || p.predictedPrice <= 0)) {
      setError('All predictions must be valid positive prices')
      return
    }
    setSubmitting(true)
    try {
      await api.submitPredictions(id, session.playerId, session.sessionToken, preds)
      localStorage.setItem(`predictions-${id}`, JSON.stringify(preds))
      setSubmitted(true)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !game) return <div style={{ padding: 32, color: 'var(--error)' }}>{error}</div>
  if (!game) return <div style={{ padding: 32 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>
        {game.asset} / USD — {game.mode === '15min' ? '15Min League' : '1H League'} - {game.kickoff_at.slice(11,16)}
      </h1>

      {/* Price chart */}
      <div style={{ marginBottom: 20 }}>
        <PriceChart
          asset={game.asset}
          latestPrice={livePrice ?? undefined}
          predictions={chartPredictions}
          height={240}
          onPriceClick={session && !submitted ? handleChartPriceClick : undefined}
          enableYZoom={!!session && !submitted}
          mode={game.mode}
          kickoffAt={game.kickoff_at}
        />
      </div>

      {/* Countdown */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4, textAlign: 'center' }}>Kickoff in</div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2, color: remaining < 30000 ? 'var(--error)' : 'var(--text)', textAlign: 'center' }}>
          {formatMs(remaining)}
        </div>
      </div>

      {/* Auth / Join state */}
      {!user && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 20, marginBottom: 24,
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Sign in with your wallet to join this game.</p>
          <button onClick={openSignIn}>Sign In with Wallet</button>
        </div>
      )}

      {user && !session && (
        <div style={{ color: 'var(--muted)', marginBottom: 16 }}>
          {joining ? 'Joining game…' : (
            <span>
              Joining as <strong style={{ color: 'var(--text)' }}>{user.alias}</strong>…
            </span>
          )}
        </div>
      )}

      {session && !submitted && (
        <div>
          <div style={{ color: 'var(--muted)', marginBottom: 16 }}>
            Playing as <strong style={{ color: 'var(--text)' }}>{session.alias}</strong>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
            Enter your price prediction(s) for {game.asset}
            {livePrice !== null && <span style={{ color: 'var(--accent-2)' }}> · now ${livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6, opacity: 0.7 }}>
            Tip: click the chart above to set a price, scroll to change the zoom on price axis.
          </div>
          {intervals.map(label => {
            const isActive = label === activeLabel
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  onClick={() => setActiveLabel(label)}
                  style={{
                    width: 48, fontSize: 12, cursor: 'pointer',
                    color: isActive ? 'var(--gold)' : 'var(--muted)',
                    fontWeight: isActive ? 700 : 400,
                  }}
                  title="Click to target this interval with chart clicks"
                >
                  {label}
                </span>
                <input
                  type="number"
                  placeholder="Price (USD)"
                  value={predictions[label] ?? ''}
                  onFocus={() => setActiveLabel(label)}
                  onChange={e => setPredictions(prev => ({ ...prev, [label]: e.target.value }))}
                  style={{ flex: 1, borderColor: isActive ? 'var(--gold)' : undefined }}
                />
              </div>
            )
          })}
          {/* Stake summary */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px', marginTop: 12, fontSize: 13,
          }}>
            <span style={{ color: 'var(--muted)' }}>
              {intervals.length > 1 ? `Stake · ${intervals.length} × ${STAKE_PER_PREDICTION} RANK` : 'Stake'}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
              {intervals.length * STAKE_PER_PREDICTION} RANK
            </span>
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button onClick={handleLockInClick} disabled={submitting} style={{ width: '100%', fontWeight: 700, fontSize: 15, color: 'var(--gold)', marginTop: 10, backgroundColor: 'var(--zone-gold-bg)', padding: '12px 0', border: '2px solid var(--zone-gold-border)', borderRadius: 6, cursor: 'pointer' }}>
            {submitting ? 'Submitting…' : isResubmit ? 'UPDATE PREDICTIONS' : 'SUBMIT PREDICTIONS'}
          </button>
        </div>
      )}

      {session && submitted && (
        <div style={{
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: 'var(--success-text)' }}>Predictions locked in!</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            {intervals.map(label => {
              const stored = (JSON.parse(localStorage.getItem(`predictions-${id}`) ?? '[]') as Prediction[])
                .find(p => p.intervalLabel === label)
              return stored ? (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ marginRight: 10 }}>{label}</span>
                  <span style={{ color: 'var(--text)' }}>${stored.predictedPrice.toLocaleString()}</span>
                </div>
              ) : null
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: 12, marginTop: 8 }}>
            <span>Staked <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{intervals.length * STAKE_PER_PREDICTION} RANK</span> · Waiting for kickoff…</span>
            <button
              onClick={handleEditPredictions}
              style={{
                fontSize: 15, padding: '3px 10px',
                background: 'var(--zone-gold-bg)', border: '1px solid var(--zone-gold-border)',
                color: 'var(--gold)', cursor: 'pointer', borderRadius: 4,
              }}
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {pendingConfirm && game && (
        <div
          onClick={() => setPendingConfirm(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 28, maxWidth: 380, width: '90%',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Confirm your prediction</div>

            {intervals.length === 1 ? (
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
                I predict that <strong>{game.asset}</strong> will close near{' '}
                <strong style={{ color: 'var(--gold)' }}>
                  ${parseFloat(predictions[intervals[0]] ?? '0').toLocaleString()}
                </strong>{' '}
                at{' '}
                <strong>
                  {closeDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                </strong>
              </p>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  My predictions for <strong style={{ color: 'var(--text)' }}>{game.asset}</strong>
                  {' '}closing at{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    {closeDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                  </strong>:
                </div>
                {intervals.map(label => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted)' }}>{label}</span>
                    <strong style={{ color: 'var(--gold)' }}>
                      ${parseFloat(predictions[label] ?? '0').toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setPendingConfirm(false)}
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setPendingConfirm(false); submitPredictions() }}
                style={{ flex: 2, fontWeight: 700, color: 'var(--gold)', backgroundColor: 'var(--zone-gold-bg)', border: '2px solid var(--zone-gold-border)', borderRadius: 6 }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {allPredictions.length > 0 && (
        <PredictionHistogram
          allPredictions={allPredictions}
          intervals={intervals}
          currentPrice={livePrice}
        />
      )}
    </div>
  )
}
