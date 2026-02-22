import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { getPerformance, getGames, getLedger, api, type PerformanceGame, type GameInfo, type LedgerEvent } from '../lib/api.ts'
import { AssetIcon } from '../components/Icons.tsx'

const ZONE_COLORS = { gold: 'var(--gold)', silver: 'var(--silver)', dead: 'var(--dead)' }
const ZONE_BORDERS = { gold: 'var(--zone-gold-border)', silver: 'var(--border)', dead: 'var(--border)' }

type ActiveGame = GameInfo & {
  myPredictions?: { intervalLabel: string; predictedPrice: number }[]
  currentPrice?: number
  myRank?: number
  myDistance?: number
  myZone?: 'gold' | 'silver' | 'dead'
}

export default function Performance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'history' | 'events'>('portfolio')
  const [historyGames, setHistoryGames] = useState<PerformanceGame[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([])
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

  // Fetch ledger events
  useEffect(() => {
    if (!user) return
    getLedger(user.sessionToken, { limit: 100 })
      .then(data => setLedgerEvents(data.events))
      .catch(console.error)
  }, [user])

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
          myPredictions: preds,
        }
      })

      // Merge with existing state to preserve leaderboard data (myRank, myDistance, myZone)
      setActiveGames(prev => {
        const prevMap = new Map(prev.map(p => [p.slug, p]))
        return userGames.map(g => {
          const existing = prevMap.get(g.slug)
          return existing ? { ...g, myRank: existing.myRank, myDistance: existing.myDistance, myZone: existing.myZone } : g
        })
      })
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

    // Use a ref to track current games without triggering re-renders
    let currentGames: ActiveGame[] = []
    const updateGamesRef = () => {
      setActiveGames(prev => {
        currentGames = prev
        return prev
      })
    }

    const fetchLeaderboards = async () => {
      updateGamesRef()
      const liveGames = currentGames.filter(g => g.status === 'live')
      if (liveGames.length === 0) return

      // Fetch all leaderboards in parallel
      const results = await Promise.all(
        liveGames.map(async game => {
          try {
            const leaderboard = await api.getLeaderboard(game.slug)
            const me = leaderboard.find(e => e.playerId === user.playerId)
            return { slug: game.slug, data: me }
          } catch {
            return { slug: game.slug, data: null }
          }
        })
      )

      // Update state with all results at once
      setActiveGames(current => current.map(g => {
        const result = results.find(r => r.slug === g.slug)
        if (result?.data) {
          return { ...g, myRank: result.data.rank, myDistance: result.data.distance, myZone: result.data.zone }
        }
        return g
      }))
    }

    fetchLeaderboards()
    const interval = setInterval(fetchLeaderboards, 5_000)
    return () => clearInterval(interval)
  }, [user])

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
        {(['portfolio', 'history', 'events'] as const).map(tab => (
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
                gridTemplateColumns: '70px 70px 140px 70px 90px 140px 70px 80px 100px',
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
                <span style={{ textAlign: 'right' }}>Rank %</span>
                <span style={{ textAlign: 'center' }}>Zone</span>
                <span style={{ textAlign: 'right' }}>Distance</span>
              </div>

              {/* Table Rows */}
              {sortedActiveGames.map(game => {
                const currentPrice = prices[game.asset]
                const kickoffDate = new Date(game.kickoff_at)
                const dateLabel = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                const timeLabel = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                // Calculate distance for lobby games
                let distance: number | undefined = game.myDistance
                if (game.status === 'lobby' && currentPrice && game.myPredictions?.length) {
                  // For lobby, show distance to nearest prediction
                  const dists = game.myPredictions.map(p => p.predictedPrice - currentPrice)
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
                        gridTemplateColumns: '70px 70px 140px 70px 90px 140px 70px 80px 100px',
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
                      {/* Predictions column - show with labels for 60min */}
                      <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text)' }}>
                        {game.myPredictions && game.myPredictions.length > 0 ? (
                          game.mode === '60min' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {game.myPredictions.map(p => (
                                <div key={p.intervalLabel} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                  <span style={{ color: 'var(--muted)', fontSize: 9 }}>{p.intervalLabel}</span>
                                  <span style={{ fontWeight: 600 }}>{p.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: 12 }}>
                              {game.myPredictions[0].predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )
                        ) : '—'}
                      </div>
                      {/* Rank % column */}
                      <span style={{ textAlign: 'right', fontSize: 13 }}>
                        {game.myRank != null && game.participant_count ? (
                          <span style={{ fontWeight: 700, color: game.myZone ? ZONE_COLORS[game.myZone] : 'var(--text)' }}>
                            {Math.round((game.myRank / game.participant_count) * 100)}%
                          </span>
                        ) : '—'}
                      </span>
                      {/* Zone column */}
                      <span style={{ textAlign: 'center', fontSize: 11, color: game.myZone ? ZONE_COLORS[game.myZone] : 'var(--muted)', textTransform: 'capitalize', fontWeight: 600 }}>
                        {game.myZone ?? '—'}
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
                gridTemplateColumns: '70px 70px 140px 70px 90px 140px 70px 80px 100px',
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
                <span style={{ textAlign: 'right' }}>Rank %</span>
                <span style={{ textAlign: 'center' }}>Zone</span>
                <span style={{ textAlign: 'right' }}>Distance</span>
              </div>

              {/* Table Rows */}
              {historyGames.map(game => {
                const zoneColor = ZONE_COLORS[game.zone]
                const zoneBorder = ZONE_BORDERS[game.zone]
                const kickoffDate = new Date(game.kickoff_at)
                const dateLabel = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                const timeLabel = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                // Calculate signed distance for each prediction
                let distance: number | undefined
                if (game.finalPrice != null && game.predictions && game.predictions.length > 0) {
                  // For 15min: single prediction
                  if (game.mode === '15min') {
                    distance = game.predictions[0].predictedPrice - game.finalPrice
                  } else {
                    // For 60min: use average distance (same as backend totalDistance logic)
                    const sum = game.predictions.reduce((acc, p) => acc + (p.predictedPrice - game.finalPrice!), 0)
                    distance = sum / game.predictions.length
                  }
                }

                return (
                  <div
                    key={game.slug}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 70px 140px 70px 90px 140px 70px 80px 100px',
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
                    {/* Final Price column */}
                    <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {game.finalPrice != null
                        ? game.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '—'}
                    </span>
                    {/* Predictions column - show with labels for 60min */}
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text)' }}>
                      {game.predictions && game.predictions.length > 0 ? (
                        game.mode === '60min' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {game.predictions.map(p => (
                              <div key={p.intervalLabel} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ color: 'var(--muted)', fontSize: 9 }}>{p.intervalLabel}</span>
                                <span style={{ fontWeight: 600 }}>{p.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {game.predictions[0].predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )
                      ) : '—'}
                    </div>
                    {/* Rank % column */}
                    <span style={{ textAlign: 'right', fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: zoneColor }}>
                        {Math.round((game.rank / game.totalPlayers) * 100)}%
                      </span>
                    </span>
                    {/* Zone column */}
                    <span style={{ textAlign: 'center', fontSize: 11, color: zoneColor, textTransform: 'capitalize', fontWeight: 600 }}>
                      {game.zone}
                    </span>
                    {/* Distance column with sign */}
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
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <>
          {ledgerEvents.length === 0 && (
            <div style={{
              padding: 32,
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--muted)',
            }}>
              No ledger events yet.
            </div>
          )}

          {ledgerEvents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 100px 70px 70px 140px 70px 100px',
                gap: 8,
                padding: '4px 12px',
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <span>Date</span>
                <span>Type</span>
                <span>Asset</span>
                <span>League</span>
                <span>Kickoff</span>
                <span>Checkpoint</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </div>

              {/* Table Rows */}
              {ledgerEvents.map(event => {
                const date = new Date(event.createdAt)
                const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const isPositive = event.amount > 0

                // Determine event type label
                let typeLabel: string = event.reason
                if (event.reason === 'tip') {
                  typeLabel = isPositive ? 'tip (received)' : 'tip (sent)'
                }

                // Format kickoff if available
                let kickoffLabel = '—'
                if (event.kickoffAt) {
                  const kickoffDate = new Date(event.kickoffAt)
                  const kickoffDateStr = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  const kickoffTimeStr = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  kickoffLabel = `${kickoffDateStr} · ${kickoffTimeStr}`
                }

                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 100px 70px 70px 140px 70px 100px',
                      gap: 8,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {dateLabel} · {timeLabel}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: 'var(--text)',
                      textTransform: 'capitalize',
                      fontWeight: 500,
                    }}>
                      {typeLabel}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                      {event.asset ?? '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {event.mode ?? '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {kickoffLabel}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {event.intervalLabel ?? '—'}
                    </span>
                    <span style={{
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 700,
                      color: isPositive ? 'var(--success-text)' : 'var(--error)',
                    }}>
                      {isPositive ? '+' : ''}{event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
