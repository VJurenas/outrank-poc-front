import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGames, type GameInfo } from '../lib/api.ts'

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  HYPE: '#00d4ff',
}

export default function Home() {
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGames({ status: 'live' })
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      getGames({ status: 'live' }).then(setGames).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Live Games</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px' }}>
        Watch games in progress — join the next round from the Leagues page.
      </p>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {!loading && games.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8,
          color: 'var(--muted)',
        }}>
          No live games right now. Check the Leagues page for upcoming rounds.
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {games.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}

function GameCard({ game }: { game: GameInfo }) {
  const assetColor = ASSET_COLORS[game.asset] ?? 'var(--text)'
  const modeLabel = game.mode === '15min' ? '15 min' : '1 hour'

  return (
    <Link
      to={`/game/${game.slug}/live`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 20,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = assetColor)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: assetColor }}>{game.asset}</span>
          <span style={{
            background: '#1e3a1e', color: '#5f5',
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, border: '1px solid #3a6a3a',
          }}>
            LIVE
          </span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{modeLabel} game</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
          {game.participant_count ?? 0} player{game.participant_count !== 1 ? 's' : ''}
        </div>
        <div style={{
          marginTop: 16, fontSize: 13, color: assetColor, fontWeight: 500,
        }}>
          Watch →
        </div>
      </div>
    </Link>
  )
}
