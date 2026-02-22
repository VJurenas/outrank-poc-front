import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGames, type GameInfo } from '../lib/api.ts'
import { ASSETS } from '../lib/assets.ts'
import { AssetIcon } from '../components/Icons.tsx'

function endTime(game: GameInfo): string {
  const mins = game.mode === '15min' ? 15 : 60
  return new Date(new Date(game.kickoff_at).getTime() + mins * 60_000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function startTime(game: GameInfo): string {
  return new Date(game.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isCompeting(slug: string): boolean {
  return !!localStorage.getItem(`predictions-${slug}`)
}

export default function Leagues() {
  const { mode } = useParams<{ mode: string }>()
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set(ASSETS))

  const modeKey = mode === '60min' ? '60min' : '15min'
  const modeLabel = modeKey === '15min' ? '15 Minutes' : '1 Hour'

  async function fetchGames() {
    const g = await getGames({ mode: modeKey })
    setGames(g.filter(x => x.status !== 'ended'))
  }

  useEffect(() => {
    setLoading(true)
    fetchGames().catch(console.error).finally(() => setLoading(false))
    const interval = setInterval(() => fetchGames().catch(() => {}), 15_000)
    return () => clearInterval(interval)
  }, [modeKey])

  const toggleAsset = (asset: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
      return next
    })
  }

  const toggleAll = () => {
    const allSelected = selectedAssets.size === ASSETS.length
    if (allSelected) {
      setSelectedAssets(new Set())
    } else {
      setSelectedAssets(new Set(ASSETS))
    }
  }

  const filterGames = (games: GameInfo[]) =>
    games.filter(g => selectedAssets.has(g.asset))

  // Sort by time (ascending), then by asset (ascending)
  const sortGames = (games: GameInfo[]) =>
    games.sort((a, b) => {
      const timeA = new Date(a.kickoff_at).getTime()
      const timeB = new Date(b.kickoff_at).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.asset.localeCompare(b.asset)
    })

  const live = sortGames(filterGames(games.filter(g => g.status === 'live')))
  const lobby = sortGames(filterGames(games.filter(g => g.status === 'lobby')))

  const allSelected = selectedAssets.size === ASSETS.length

  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>{modeLabel} League</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
        Join upcoming leagues or watch live rounds.
      </p>

      {/* Filter Tags */}
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <FilterTag label="All" active={allSelected} onClick={toggleAll} />
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        {ASSETS.map(asset => (
          <FilterTag
            key={asset}
            label={asset}
            active={selectedAssets.has(asset)}
            onClick={() => toggleAsset(asset)}
          />
        ))}
      </div>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {!loading && live.length === 0 && lobby.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8,
          color: 'var(--muted)',
        }}>
          No active leagues in this mode.
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
  const isLive = game.status === 'live'
  const competing = isCompeting(game.slug)

  const timeLabel = isLive
    ? `Ends ${endTime(game)}`
    : `Starts ${startTime(game)}`

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${competing ? 'var(--competing-border)' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <AssetIcon asset={game.asset} size={22} />
      <span style={{ fontWeight: 700, fontSize: 15, minWidth: 48 }}>{game.asset}</span>

      <span style={{ color: 'var(--muted)', fontSize: 13, flex: 1 }}>{timeLabel}</span>

      {competing && (
        <span style={{ color: 'var(--competing-text)', fontSize: 12 }}>competing</span>
      )}

      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
        {game.participant_count ?? 0} player{game.participant_count !== 1 ? 's' : ''}
      </span>

      {isLive ? (
        <Link
          to={`/game/${game.slug}/live`}
          style={{
            color: 'var(--accent-2)', fontSize: 13, textDecoration: 'none',
            padding: '4px 12px', border: '1px solid var(--accent-2)', borderRadius: 4,
            whiteSpace: 'nowrap',
          }}
        >
          Watch
        </Link>
      ) : (
        <Link
          to={`/game/${game.slug}`}
          style={{
            color: competing ? 'var(--muted)' : 'var(--accent)',
            fontSize: 13, textDecoration: 'none',
            padding: '4px 12px',
            border: `1px solid ${competing ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 4, whiteSpace: 'nowrap',
          }}
        >
          {competing ? 'Change' : 'Join'}
        </Link>
      )}
    </div>
  )
}
function FilterTag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--accent)' : 'var(--muted)',
        background: active ? 'var(--accent-bg)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 20,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.borderColor = 'var(--accent)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {label}
    </button>
  )
}
