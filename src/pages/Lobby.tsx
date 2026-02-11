import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type GameInfo } from '../lib/api.ts'

type Session = { playerId: string; sessionToken: string; alias: string }
type Prediction = { intervalLabel: string; predictedPrice: number }

function useCountdown(target?: Date) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!target) return
    const tick = () => setRemaining(Math.max(0, target.getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [target])
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

  const [game, setGame] = useState<GameInfo | null>(null)
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(() => {
    try { return JSON.parse(localStorage.getItem(`session-${id}`) ?? 'null') } catch { return null }
  })
  const [alias, setAlias] = useState('')
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [joining, setJoining] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const kickoffDate = game ? new Date(game.kickoff_at) : undefined
  const remaining = useCountdown(kickoffDate)

  useEffect(() => {
    if (!id) return
    api.getGame(id)
      .then(setGame)
      .catch(() => setError('Game not found'))
  }, [id])

  // Redirect to live view when game starts
  useEffect(() => {
    if (game?.status === 'live' || game?.status === 'ended') {
      navigate(`/game/${id}/live`, { state: { session, game } })
    }
  }, [game?.status, id, navigate, session, game])

  // Poll for game status change
  useEffect(() => {
    if (!id || !game || game.status !== 'lobby') return
    const interval = setInterval(() =>
      api.getGame(id).then(setGame).catch(() => {}), 3000
    )
    return () => clearInterval(interval)
  }, [id, game])

  const intervals = game?.mode === '15min' ? ['T+15'] : ['T+15', 'T+30', 'T+45', 'T+60']

  async function join() {
    if (!id || !alias.trim()) return
    setJoining(true)
    try {
      const result = await api.joinGame(id, alias.trim())
      const s = { ...result, alias: alias.trim() }
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
      setSubmitted(true)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !game) return <div style={{ padding: 32, color: '#f66' }}>{error}</div>
  if (!game) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>outrank.xyz</h1>
      <div style={{ color: 'var(--muted)', marginBottom: 24 }}>
        {game.asset} / USD — {game.mode === '15min' ? '15-Minute Market' : '60-Minute Market'}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>Kickoff in</div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2, color: remaining < 30000 ? '#f66' : 'white' }}>
          {formatMs(remaining)}
        </div>
      </div>

      {!session ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            placeholder="Enter alias"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && join()}
            style={{ flex: 1 }}
          />
          <button onClick={join} disabled={joining || !alias.trim()}>
            {joining ? 'Joining…' : 'Join'}
          </button>
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', marginBottom: 16 }}>
          Playing as <strong style={{ color: 'white' }}>{session.alias}</strong>
        </div>
      )}

      {session && !submitted && (
        <div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
            Enter your price prediction(s) for {game.asset}
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
          {error && <div style={{ color: '#f66', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <button onClick={submitPredictions} disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
            {submitting ? 'Submitting…' : 'Lock In Predictions'}
          </button>
        </div>
      )}

      {session && submitted && (
        <div style={{ background: '#0a2a0a', border: '1px solid #2a5a2a', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#4f4', marginBottom: 4 }}>Predictions locked in!</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Waiting for kickoff…</div>
        </div>
      )}
    </div>
  )
}
