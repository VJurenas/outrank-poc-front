import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGames, type GameInfo } from '../lib/api.ts'

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  HYPE: '#00d4ff',
}

export default function Leagues() {
  const { mode } = useParams<{ mode: string }>()
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)

  const modeKey = mode === '60min' ? '60min' : '15min'
  const modeLabel = modeKey === '15min' ? '15 Minutes' : '1 Hour'

  useEffect(() => {
    setLoading(true)
    getGames({ mode: modeKey })
      .then(g => setGames(g.filter(x => x.status !== 'ended')))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [modeKey])

  const live = games.filter(g => g.status === 'live')
  const lobby = games.filter(g => g.status === 'lobby')

  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>{modeLabel} League</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px' }}>
        Join upcoming games or watch live rounds.
      </p>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {!loading && live.length === 0 && lobby.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8,
          color: 'var(--muted)',
        }}>
          No active games in this league. Create one via the API.
        </div>
      )}

      {live.length > 0 && (
        <Section title="Live">
          {live.map(g => <GameRow key={g.id} game={g} />)}
        </Section>
      )}

      {lobby.length > 0 && (
        <Section title="Upcoming">
          {lobby.map(g => <GameRow key={g.id} game={g} />)}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

function GameRow({ game }: { game: GameInfo }) {
  const assetColor = ASSET_COLORS[game.asset] ?? 'var(--text)'
  const isLive = game.status === 'live'
  const kickoff = new Date(game.kickoff_at)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <span style={{ color: assetColor, fontWeight: 700, fontSize: 16, width: 48 }}>{game.asset}</span>
      <span style={{ color: 'var(--muted)', fontSize: 13, flex: 1 }}>
        {isLive
          ? 'In progress'
          : `Starts ${kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${kickoff.toLocaleDateString()}`
        }
      </span>
      <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 8 }}>
        {game.participant_count ?? 0} players
      </span>
      {isLive ? (
        <Link
          to={`/game/${game.slug}/live`}
          style={{
            color: '#4af', fontSize: 13, textDecoration: 'none',
            padding: '4px 12px', border: '1px solid #4af', borderRadius: 4,
          }}
        >
          Watch
        </Link>
      ) : (
        <Link
          to={`/game/${game.slug}`}
          style={{
            color: 'var(--gold)', fontSize: 13, textDecoration: 'none',
            padding: '4px 12px', border: '1px solid var(--gold)', borderRadius: 4,
          }}
        >
          Join
        </Link>
      )}
    </div>
  )
}
