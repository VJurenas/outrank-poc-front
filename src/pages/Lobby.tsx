import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type GameInfo } from '../lib/api.ts'
import { useAuth } from '../contexts/AuthContext.tsx'

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

export default function Lobby() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, openSignIn } = useAuth()

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
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>
        {game.asset} / USD — {game.mode === '15min' ? '15-Minute Market' : '60-Minute Market'}
      </h1>
      <div style={{ color: 'var(--muted)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Lobby</span>
        {livePrice !== null && (
          <span style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>
            ${livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Countdown */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>Kickoff in</div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2, color: remaining < 30000 ? 'var(--error)' : 'var(--text)' }}>
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
          {intervals.map(label => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 48, color: 'var(--muted)', fontSize: 12 }}>{label}</span>
              <input
                type="number"
                placeholder="Price (USD)"
                value={predictions[label] ?? ''}
                onChange={e => setPredictions(prev => ({ ...prev, [label]: e.target.value }))}
                style={{ flex: 1 }}
              />
            </div>
          ))}
          {error && <div style={{ color: 'var(--error)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <button onClick={submitPredictions} disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
            {submitting ? 'Submitting…' : 'Lock In Predictions'}
          </button>
        </div>
      )}

      {session && submitted && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ color: 'var(--success-text)', marginBottom: 8 }}>Predictions locked in!</div>
          {intervals.map(label => {
            const stored = (JSON.parse(localStorage.getItem(`predictions-${id}`) ?? '[]') as Prediction[])
              .find(p => p.intervalLabel === label)
            return stored ? (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 13, marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ color: 'var(--text)' }}>${stored.predictedPrice.toLocaleString()}</span>
              </div>
            ) : null
          })}
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>Waiting for kickoff…</div>
        </div>
      )}

      {allPredictions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
            Players locked in ({new Set(allPredictions.map(p => p.alias)).size})
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            {Array.from(new Set(allPredictions.map(p => p.alias))).map(a => (
              <div key={a} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{a}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {allPredictions.filter(p => p.alias === a).map(p => `${p.interval_label}: $${p.predicted_price.toLocaleString()}`).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
