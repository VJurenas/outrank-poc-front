import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { api, type GameInfo, type LeaderboardEntry } from '../lib/api.ts'
import { useGameWs } from '../hooks/useGameWs.ts'
import { useCommunity } from '../contexts/CommunityContext.tsx'
import PriceChart from '../components/PriceChart.tsx'
import Leaderboard from '../components/Leaderboard.tsx'
import RaceTrack, { type RankSnapshot } from '../components/RaceTrack.tsx'

type Session = { playerId: string; sessionToken: string; alias: string }

export default function Game() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { setGameSlug } = useCommunity()

  useEffect(() => {
    if (id) setGameSlug(id)
    return () => setGameSlug(null)
  }, [id, setGameSlug])

  const session: Session | null = (location.state as { session?: Session })?.session
    ?? JSON.parse(localStorage.getItem(`session-${id}`) ?? 'null')

  const [game, setGame] = useState<GameInfo | null>(
    (location.state as { game?: GameInfo })?.game ?? null
  )
  const [latestPrice, setLatestPrice] = useState<number | undefined>()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [tracked, setTracked] = useState<Set<string>>(new Set())
  const [lastCheckpoint, setLastCheckpoint] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'chart' | 'race'>('chart')
  const [rankHistory, setRankHistory] = useState<RankSnapshot[]>([])
  const [checkpointResults, setCheckpointResults] = useState<{
    checkpoint: string
    rank: number
    distance: number
    zone: 'gold' | 'silver' | 'dead'
  }[]>([])
  const prevZone = useRef<string | undefined>()

  // Fetch game info if not in state
  useEffect(() => {
    if (!game && id) api.getGame(id).then(setGame).catch(() => {})
  }, [id, game])

  // Fetch checkpoint results on mount (hydrate from DB)
  useEffect(() => {
    if (id && session?.playerId) {
      api.getCheckpointResults(id, session.playerId)
        .then(results => {
          setCheckpointResults(results)
        })
        .catch(() => {})
    }
  }, [id, session?.playerId])

  useGameWs(id, session?.playerId, session?.sessionToken, {
    onPrice: (_, price) => setLatestPrice(price),
    onLeaderboard: (players, checkpoint) => {
      setLeaderboard(players)
      if (checkpoint) setLastCheckpoint(checkpoint)

      if (session) {
        const me = players.find(p => p.playerId === session.playerId)
        // Record rank snapshot for RaceTrack
        if (me) {
          setRankHistory(prev => [...prev, { t: Date.now(), rank: me.rank, total: players.length }])
        }
        // Save checkpoint result when a checkpoint is completed
        if (checkpoint && me) {
          setCheckpointResults(prev => {
            // Only add if not already recorded
            if (prev.some(r => r.checkpoint === checkpoint)) return prev
            return [...prev, {
              checkpoint,
              rank: me.rank,
              distance: me.distance,
              zone: me.zone,
            }].sort((a, b) => a.checkpoint.localeCompare(b.checkpoint))
          })
        }
        // Zone change sound
        if (me && me.zone !== prevZone.current) {
          prevZone.current = me.zone
          playZoneSound(me.zone)
        }
      }
    },
    onGameStatus: (status) => {
      if (status === 'ended' && game) setGame({ ...game, status: 'ended' })
    },
  })

  function toggleTrack(playerId: string) {
    if (playerId === session?.playerId) return
    setTracked(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < 2) {
        next.add(playerId)
      }
      return next
    })
  }

  const myEntry = leaderboard.find(p => p.playerId === session?.playerId)

  // Stable reference — predictions don't change while on the Game page
  const myPredictions = useMemo<{ label: string; price: number }[]>(() => {
    if (!id) return []
    return (JSON.parse(localStorage.getItem(`predictions-${id}`) ?? '[]') as { intervalLabel: string; predictedPrice: number }[])
      .map(p => ({ label: p.intervalLabel, price: p.predictedPrice }))
  }, [id])

  // Merge live zone into each prediction for zone-colored chart lines
  const chartPredictions = useMemo(
    () => myPredictions.map(p => ({ ...p, zone: myEntry?.zone })),
    [myPredictions, myEntry?.zone]
  )

  if (!game) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, height: '100%', padding: 16 }}>
      {/* Left: chart + status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>outrank.xyz</span>
          <span style={{ color: 'var(--muted)' }}>{game.asset} · {game.mode === '15min' ? '15min' : '60min'}</span>
          {game.status === 'ended' && <span style={{ color: '#f5c518' }}>Game Over</span>}
          {lastCheckpoint && (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Last checkpoint: {lastCheckpoint}</span>
          )}
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['chart', 'race'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 18px', fontSize: 13, background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer', marginBottom: -1,
              }}
            >
              {tab === 'chart' ? 'Price Chart' : 'Race Track'}
            </button>
          ))}
        </div>

        {activeTab === 'chart' ? (
          <PriceChart
            asset={game.asset}
            latestPrice={latestPrice}
            predictions={chartPredictions}
            height={360}
            mode={game.mode}
            kickoffAt={game.kickoff_at}
          />
        ) : (
          <RaceTrack
            history={rankHistory}
            myEntry={myEntry}
            total={leaderboard.length}
          />
        )}

        {myEntry && (
          <>
            <div style={{
              background: myEntry.zone === 'gold' ? 'var(--zone-gold-bg)' : myEntry.zone === 'silver' ? 'var(--zone-silver-bg)' : 'var(--zone-dead-bg)',
              border: `1px solid ${myEntry.zone === 'gold' ? 'var(--zone-gold-border)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              gap: 24,
            }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Your rank</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>#{myEntry.rank}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Distance</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {myEntry.distance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Zone</div>
                <div style={{ fontSize: 24, fontWeight: 700, textTransform: 'capitalize',
                  color: myEntry.zone === 'gold' ? 'var(--gold)' : myEntry.zone === 'silver' ? 'var(--silver)' : 'var(--dead)' }}>
                  {myEntry.zone}
                </div>
              </div>
            </div>

            {/* Checkpoint results for 60min games */}
            {game.mode === '60min' && (
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 8 }}>CHECKPOINT RESULTS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {/* Individual checkpoint cards - show all 4 slots */}
                  {['T+15', 'T+30', 'T+45', 'T+60'].map(label => {
                    const result = checkpointResults.find(r => r.checkpoint === label)
                    return (
                      <div key={label} style={{
                        background: result ? 'var(--surface)' : 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: 8,
                        opacity: result ? 1 : 0.5,
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                        {result ? (
                          <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>Rank: <span style={{ fontWeight: 700 }}>#{result.rank}</span></div>
                            <div>Dist: <span style={{ fontWeight: 700 }}>{result.distance.toFixed(2)}</span></div>
                            <div>Zone: <span style={{
                              fontWeight: 700,
                              color: result.zone === 'gold' ? 'var(--gold)' : result.zone === 'silver' ? 'var(--silver)' : 'var(--dead)'
                            }}>{result.zone}</span></div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Pending...</div>
                        )}
                      </div>
                    )
                  })}

                  {/* Aggregate card - shown when at least 1 checkpoint is complete */}
                  {checkpointResults.length >= 1 && (
                    <div style={{
                      background: 'var(--accent-bg)',
                      border: '2px solid var(--accent)',
                      borderRadius: 6,
                      padding: 8,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 4, fontWeight: 700 }}>TOTAL</div>
                      <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>Rank: <span style={{ fontWeight: 700 }}>#{myEntry.rank}</span></div>
                        <div>Dist: <span style={{ fontWeight: 700 }}>
                          {checkpointResults.reduce((sum, r) => sum + r.distance, 0).toFixed(2)}
                        </span></div>
                        <div>Zone: <span style={{
                          fontWeight: 700,
                          color: myEntry.zone === 'gold' ? 'var(--gold)' : myEntry.zone === 'silver' ? 'var(--silver)' : 'var(--dead)'
                        }}>{myEntry.zone}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: leaderboard */}
      <div style={{ overflow: 'auto' }}>
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0 16px' }}>
          LEADERBOARD · {leaderboard.length} players
          {tracked.size > 0 && <span style={{ color: 'var(--accent-2)' }}> · tracking {tracked.size}</span>}
        </div>
        <Leaderboard
          players={leaderboard}
          myPlayerId={session?.playerId}
          onToggleTrack={toggleTrack}
          tracked={tracked}
        />
      </div>
    </div>
  )
}


function playZoneSound(zone: string) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = zone === 'gold' ? 880 : zone === 'silver' ? 660 : 440
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* audio not available */ }
}
