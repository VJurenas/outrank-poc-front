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
  const prevZone = useRef<string | undefined>()

  // Fetch game info if not in state
  useEffect(() => {
    if (!game && id) api.getGame(id).then(setGame).catch(() => {})
  }, [id, game])

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
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
          />
        ) : (
          <RaceTrack
            history={rankHistory}
            myEntry={myEntry}
            total={leaderboard.length}
          />
        )}

        {myEntry && (
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
