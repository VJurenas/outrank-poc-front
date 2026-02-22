import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { getPerformance, getGames, api, type PerformanceGame, type GameInfo } from '../lib/api.ts'
import { AssetIcon } from '../components/Icons.tsx'

const ZONE_COLORS = { gold: 'var(--gold)', silver: 'var(--silver)', dead: 'var(--dead)' }
const ZONE_BORDERS = { gold: 'var(--zone-gold-border)', silver: 'var(--border)', dead: 'var(--border)' }

type ActiveGame = GameInfo & {
  myPredictions?: number[]
  currentPrice?: number
  myRank?: number
  myDistance?: number
  myZone?: 'gold' | 'silver' | 'dead'
}

export default function Performance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'history'>('portfolio')
  const [historyGames, setHistoryGames] = useState<PerformanceGame[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch history (completed games)
  useEffect(() => {
    if (!user) { navigate('/'); return }
    getPerformance(user.sessionToken)
      .then(data => setHistoryGames(data.games))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, navigate])

  // Fetch active games (lobby + live) and filter to user's games
  useEffect(() => {
    if (!user) return
    const fetchActive = async () => {
      const [lobby, live] = await Promise.all([
        getGames({ status: 'lobby' }),
        getGames({ status: 'live' }),
      ])
      const all = [...lobby, ...live]

      // Filter to only games where user has predictions
      const userGames = all.filter(g => {
        const preds = localStorage.getItem(`predictions-${g.slug}`)
        return !!preds
      }).map(g => {
        const preds = JSON.parse(localStorage.getItem(`predictions-${g.slug}`) ?? '[]') as { intervalLabel: string; predictedPrice: number }[]
        return {
          ...g,
          myPredictions: preds.map(p => p.predictedPrice),
        }
      })

      setActiveGames(userGames)
    }

    fetchActive().catch(console.error)
    const interval = setInterval(() => fetchActive().catch(() => {}), 15_000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = () => {
      api.getPrices().then(setPrices).catch(() => {})
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 3_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch leaderboard data for live games
  useEffect(() => {
    if (!user) return
    const fetchLeaderboards = async () => {
      for (const game of activeGames.filter(g => g.status === 'live')) {
        try {
          const leaderboard = await api.getLeaderboard(game.slug)
          const me = leaderboard.find(e => e.playerId === user.playerId)
          if (me) {
            setActiveGames(prev => prev.map(g =>
              g.slug === game.slug
                ? { ...g, myRank: me.rank, myDistance: me.distance, myZone: me.zone }
                : g
            ))
          }
        } catch {
          // ignore
        }
      }
    }

    if (activeGames.some(g => g.status === 'live')) {
      fetchLeaderboards()
      const interval = setInterval(fetchLeaderboards, 5_000)
      return () => clearInterval(interval)
    }
  }, [activeGames, user])

  if (!user) return null
  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>
  if (error) return <div style={{ padding: 32, color: 'var(--error)' }}>{error}</div>

  // Sort active games: live at top, lobby at bottom; within each group sort by time + asset
  const sortedActiveGames = [...activeGames].sort((a, b) => {
    // Primary: status (live before lobby)
    if (a.status !== b.status) {
      return a.status === 'live' ? -1 : 1
    }
    // Secondary: kickoff time (ascending)
    const timeA = new Date(a.kickoff_at).getTime()
    const timeB = new Date(b.kickoff_at).getTime()
    if (timeA !== timeB) return timeA - timeB
    // Tertiary: asset (ascending)
    return a.asset.localeCompare(b.asset)
  })

  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Performance</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
        Track your active games and view your history.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['portfolio', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer',
              marginBottom: -1,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <>
          {activeGames.length === 0 && (
            <div style={{
              padding: 32,
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--muted)',
            }}>
              No active games. <Link to="/" style={{ color: 'var(--accent)' }}>Join a league</Link> to get started.
            </div>
          )}

          {activeGames.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '70px 70px 140px 70px 90px 120px 80px 100px',
                gap: 8,
                padding: '4px 12px',
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <span>Asset</span>
                <span>League</span>
                <span>Kickoff</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span style={{ textAlign: 'right' }}>Predictions</span>
                <span style={{ textAlign: 'right' }}>Rank</span>
                <span style={{ textAlign: 'right' }}>Distance</span>
              </div>

              {/* Table Rows */}
              {sortedActiveGames.map(game => {
                const currentPrice = prices[game.asset.toLowerCase() + 'usdt']
                const kickoffDate = new Date(game.kickoff_at)
                const dateLabel = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                const timeLabel = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                // Calculate distance for lobby games
                let distance: number | undefined = game.myDistance
                if (game.status === 'lobby' && currentPrice && game.myPredictions?.length) {
                  // For lobby, show distance to nearest prediction
                  const dists = game.myPredictions.map(p => p - currentPrice)
                  distance = dists.reduce((a, b) => Math.abs(a) < Math.abs(b) ? a : b)
                }

                const zoneBorder = game.myZone ? ZONE_BORDERS[game.myZone] : 'var(--border)'

                return (
                  <Link
                    key={game.slug}
                    to={game.status === 'live' ? `/game/${game.slug}/live` : `/game/${game.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 70px 140px 70px 90px 120px 80px 100px',
                        gap: 8,
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${zoneBorder}`,
                        borderRadius: 4,
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AssetIcon asset={game.asset} size={18} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{game.asset}</span>
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {game.mode === '15min' ? '15min' : '60min'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {dateLabel} · {timeLabel}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: game.status === 'live' ? 'var(--live-text)' : 'var(--muted)',
                        background: game.status === 'live' ? 'var(--live-bg)' : 'transparent',
                        padding: game.status === 'live' ? '2px 6px' : '0',
                        borderRadius: game.status === 'live' ? 3 : 0,
                        border: game.status === 'live' ? '1px solid var(--live-border)' : 'none',
                        textTransform: 'capitalize',
                        fontWeight: game.status === 'live' ? 600 : 400,
                        width: 'fit-content',
                      }}>
                        {game.status}
                      </span>
                      <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                        {currentPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}
                      </span>
                      <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text)' }}>
                        {game.myPredictions?.map(p => p.toLocaleString(undefined, { maximumFractionDigits: 0 })).join(', ') ?? '—'}
                      </span>
                      <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--text)' }}>
                        {game.myRank != null ? (
                          <>
                            <span style={{ fontWeight: 700 }}>#{game.myRank}</span>
                            {game.myZone && (
                              <span style={{ color: ZONE_COLORS[game.myZone], fontSize: 11, marginLeft: 4 }}>
                                {Math.round((game.myRank / (game.participant_count || 1)) * 100)}%
                              </span>
                            )}
                          </>
                        ) : '—'}
                      </span>
                      <span style={{
                        textAlign: 'right',
                        fontSize: 12,
                        color: distance != null && distance > 0 ? 'var(--success-text)' : distance != null && distance < 0 ? 'var(--error)' : 'var(--muted)',
                        fontWeight: 600,
                      }}>
                        {distance != null ? (
                          `${distance > 0 ? '+' : ''}${distance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        ) : '—'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {historyGames.length === 0 && (
            <div style={{
              padding: 32,
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--muted)',
            }}>
              No completed games yet.
            </div>
          )}

          {historyGames.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '70px 70px 140px 70px 90px 120px 80px 100px',
                gap: 8,
                padding: '4px 12px',
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <span>Asset</span>
                <span>League</span>
                <span>Kickoff</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Final Price</span>
                <span style={{ textAlign: 'right' }}>Predictions</span>
                <span style={{ textAlign: 'right' }}>Rank</span>
                <span style={{ textAlign: 'right' }}>Distance</span>
              </div>

              {/* Table Rows */}
              {historyGames.map(game => {
                const zoneColor = ZONE_COLORS[game.zone]
                const zoneBorder = ZONE_BORDERS[game.zone]
                const kickoffDate = new Date(game.kickoff_at)
                const dateLabel = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                const timeLabel = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <div
                    key={game.slug}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 70px 140px 70px 90px 120px 80px 100px',
                      gap: 8,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${zoneBorder}`,
                      borderRadius: 4,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AssetIcon asset={game.asset} size={18} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{game.asset}</span>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {game.mode === '15min' ? '15min' : '60min'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {dateLabel} · {timeLabel}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                      Ended
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                      —
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                      —
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>#{game.rank}</span>
                      <span style={{ color: zoneColor, fontSize: 11, marginLeft: 4 }}>
                        {Math.round((game.rank / game.totalPlayers) * 100)}%
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                      {game.totalDistance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
