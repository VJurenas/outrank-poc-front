import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGames, type GameInfo } from '../lib/api.ts'
import { ASSETS } from '../lib/assets.ts'

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  HYPE: '#00d4ff',
}

function endTime(game: GameInfo): string {
  const mins = game.mode === '15min' ? 15 : 60
  return new Date(new Date(game.kickoff_at).getTime() + mins * 60_000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function startTime(game: GameInfo): string {
  return new Date(game.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isCompeting(slug: string): boolean {
  return !!localStorage.getItem(`session-${slug}`)
}

/** For each asset, pick the lobby game with the nearest kickoff. */
function nextPerAsset(games: GameInfo[]): GameInfo[] {
  const map = new Map<string, GameInfo>()
  for (const g of games) {
    const existing = map.get(g.asset)
    if (!existing || new Date(g.kickoff_at) < new Date(existing.kickoff_at)) {
      map.set(g.asset, g)
    }
  }
  return ASSETS.map(a => map.get(a)).filter(Boolean) as GameInfo[]
}

export default function Home() {
  const [live, setLive] = useState<GameInfo[]>([])
  const [upcoming, setUpcoming] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const [l, u] = await Promise.all([
      getGames({ status: 'live' }),
      getGames({ status: 'lobby' }),
    ])
    setLive(l)
    setUpcoming(nextPerAsset(u))
  }

  useEffect(() => {
    fetchAll().catch(console.error).finally(() => setLoading(false))
    const interval = setInterval(() => fetchAll().catch(() => {}), 15_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {/* Live Leagues */}
      <h1 style={{ margin: '0 0 16px', fontSize: 22 }}>Live Leagues</h1>

      {!loading && live.length === 0 && (
        <div style={{
          padding: 24, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8,
          color: 'var(--muted)', marginBottom: 32,
        }}>
          No live leagues right now.
        </div>
      )}

      {live.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16, marginBottom: 40,
        }}>
          {live.map(game => <LeagueCard key={game.id} game={game} timeLabel={`Ends at ${endTime(game)}`} isLive />)}
        </div>
      )}

      {/* Upcoming Leagues */}
      {upcoming.length > 0 && (
        <>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Upcoming Leagues</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {upcoming.map(game => <LeagueCard key={game.id} game={game} timeLabel={`Starts at ${startTime(game)}`} isLive={false} />)}
          </div>
        </>
      )}
    </div>
  )
}

function LeagueCard({ game, timeLabel, isLive }: { game: GameInfo; timeLabel: string; isLive: boolean }) {
  const assetColor = ASSET_COLORS[game.asset] ?? 'var(--text)'
  const competing = isCompeting(game.slug)
  const to = isLive ? `/game/${game.slug}/live` : `/game/${game.slug}`

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: `1px solid ${competing ? '#3a6a3a' : 'var(--border)'}`,
          borderRadius: 8, padding: 20, cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = assetColor)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = competing ? '#3a6a3a' : 'var(--border)')}
      >
        {/* Header row: asset name + LIVE badge or mode label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: assetColor }}>{game.asset}</span>
          {isLive ? (
            <span style={{
              background: '#1e3a1e', color: '#5f5',
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, border: '1px solid #3a6a3a',
            }}>LIVE</span>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{game.mode === '15min' ? '15 min' : '1 hour'}</span>
          )}
        </div>

        {/* Time label — highlighted pill */}
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            fontSize: 13, fontWeight: 600,
            color: isLive ? 'rgba(245, 197, 24, 0.5)' : 'rgba(119, 221, 221, 0.5)',
            background: isLive ? 'rgba(245,197,24,0.08)' : 'rgba(119,221,221,0.08)',
            border: `1px solid ${isLive ? 'rgba(245,197,24,0.3)' : 'rgba(119,221,221,0.3)'}`,
            borderRadius: 4, padding: '3px 10px',
          }}>
            {timeLabel}
          </span>
        </div>

        {/* Bottom row: action link left, competing + count right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: assetColor, fontWeight: 500 }}>
            {isLive ? 'Watch →' : (competing ? 'Change prediction →' : 'Join →')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {competing && <span style={{ color: '#5f5', fontSize: 12 }}>competing</span>}
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {game.participant_count ?? 0} player{game.participant_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
