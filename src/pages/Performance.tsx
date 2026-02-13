import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { getPerformance, type PerformanceSummary, type PerformanceGame } from '../lib/api.ts'

const ZONE_COLORS = { gold: '#f5c518', silver: '#aaa', dead: '#555' }
const ASSET_COLORS: Record<string, string> = { BTC: '#f7931a', ETH: '#627eea', HYPE: '#00d4ff' }

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '16px 20px', textAlign: 'center',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

export default function Performance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [games, setGames] = useState<PerformanceGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    getPerformance(user.sessionToken)
      .then(data => { setSummary(data.summary); setGames(data.games) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (!user) return null
  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>
  if (error) return <div style={{ padding: 32, color: '#f66' }}>{error}</div>

  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Performance</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>
        Your results across all completed games.
      </p>

      {summary && summary.gamesPlayed === 0 && (
        <div style={{
          padding: 32, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--muted)',
        }}>
          No completed games yet. <Link to="/" style={{ color: 'var(--gold)' }}>Join a league</Link> to get started.
        </div>
      )}

      {summary && summary.gamesPlayed > 0 && (
        <>
          {/* Summary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 12, marginBottom: 32,
          }}>
            <StatCard label="Games Played" value={summary.gamesPlayed} />
            <StatCard label="Gold" value={summary.goldCount} color={ZONE_COLORS.gold} />
            <StatCard label="Silver" value={summary.silverCount} color={ZONE_COLORS.silver} />
            <StatCard label="Dead" value={summary.deadCount} color={ZONE_COLORS.dead} />
            <StatCard label="Best Rank" value={summary.bestRank != null ? `#${summary.bestRank}` : '—'} />
            <StatCard label="Avg Rank" value={summary.avgRank != null ? `#${summary.avgRank.toFixed(1)}` : '—'} />
          </div>

          {/* Game history table */}
          <h2 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Game History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 80px 80px 80px 110px',
              gap: 8, padding: '4px 12px',
              color: 'var(--muted)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <span>Asset</span>
              <span>League</span>
              <span style={{ textAlign: 'right' }}>Date</span>
              <span style={{ textAlign: 'right' }}>Rank</span>
              <span style={{ textAlign: 'center' }}>Zone</span>
              <span style={{ textAlign: 'right' }}>Distance</span>
            </div>

            {games.map(g => {
              const assetColor = ASSET_COLORS[g.asset] ?? 'var(--text)'
              const zoneColor = ZONE_COLORS[g.zone]
              const date = new Date(g.kickoff_at)
              const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
              const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={`${g.slug}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 80px 80px 80px 110px',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${zoneColor}`,
                    borderRadius: 4,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: assetColor, fontWeight: 700 }}>{g.asset}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {g.mode === '15min' ? '15 min' : '1 hour'}
                  </span>
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                    {dateLabel} · {timeLabel}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 700 }}>
                    #{g.rank}
                    <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 400 }}>/{g.totalPlayers}</span>
                  </span>
                  <span style={{ textAlign: 'center', color: zoneColor, textTransform: 'capitalize', fontSize: 12 }}>
                    {g.zone}
                  </span>
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                    {g.totalDistance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
