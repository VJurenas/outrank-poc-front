import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

/** For each asset+mode, pick the lobby game with the nearest kickoff. */
function nextPerAssetAndMode(games: GameInfo[]): GameInfo[] {
  const map = new Map<string, GameInfo>()
  for (const g of games) {
    const key = `${g.asset}:${g.mode}`
    const existing = map.get(key)
    if (!existing || new Date(g.kickoff_at) < new Date(existing.kickoff_at)) {
      map.set(key, g)
    }
  }
  const result: GameInfo[] = []
  for (const asset of ASSETS) {
    const game15 = map.get(`${asset}:15min`)
    const game60 = map.get(`${asset}:60min`)
    if (game15) result.push(game15)
    if (game60) result.push(game60)
  }
  return result
}

export default function Home() {
  const [live, setLive] = useState<GameInfo[]>([])
  const [upcoming, setUpcoming] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set(ASSETS))
  const [selectedModes, setSelectedModes] = useState<Set<string>>(new Set(['15min', '60min']))

  async function fetchAll() {
    const [l, u] = await Promise.all([
      getGames({ status: 'live' }),
      getGames({ status: 'lobby' }),
    ])
    setLive(l)
    setUpcoming(nextPerAssetAndMode(u))
  }

  useEffect(() => {
    fetchAll().catch(console.error).finally(() => setLoading(false))
    const interval = setInterval(() => fetchAll().catch(() => {}), 15_000)
    return () => clearInterval(interval)
  }, [])

  const toggleAsset = (asset: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
      return next
    })
  }

  const toggleMode = (mode: string) => {
    setSelectedModes(prev => {
      const next = new Set(prev)
      if (next.has(mode)) next.delete(mode)
      else next.add(mode)
      return next
    })
  }

  const toggleAll = () => {
    const allSelected = selectedAssets.size === ASSETS.length && selectedModes.size === 2
    if (allSelected) {
      setSelectedAssets(new Set())
      setSelectedModes(new Set())
    } else {
      setSelectedAssets(new Set(ASSETS))
      setSelectedModes(new Set(['15min', '60min']))
    }
  }

  const filterGames = (games: GameInfo[]) =>
    games.filter(g => selectedAssets.has(g.asset) && selectedModes.has(g.mode))

  const filteredLive = filterGames(live)
  const filteredUpcoming = filterGames(upcoming)

  const allSelected = selectedAssets.size === ASSETS.length && selectedModes.size === 2

  return (
    <div>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

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
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <FilterTag label="15min" active={selectedModes.has('15min')} onClick={() => toggleMode('15min')} />
        <FilterTag label="60min" active={selectedModes.has('60min')} onClick={() => toggleMode('60min')} />
      </div>

      {/* Live Leagues */}
      <h1 style={{ margin: '0 0 16px', fontSize: 21 }}>Live Leagues</h1>

      {!loading && filteredLive.length === 0 && (
        <div style={{
          padding: 24, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8,
          color: 'var(--muted)', marginBottom: 32,
        }}>
          No live leagues right now.
        </div>
      )}

      {filteredLive.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16, marginBottom: 40,
        }}>
          {filteredLive.map(game => <LeagueCard key={game.id} game={game} timeLabel={`Ends at ${endTime(game)}`} isLive />)}
        </div>
      )}

      {/* Upcoming Leagues */}
      {filteredUpcoming.length > 0 && (
        <>
          <h2 style={{ margin: '0 0 16px', fontSize: 21 }}>Upcoming Leagues</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {filteredUpcoming.map(game => <LeagueCard key={game.id} game={game} timeLabel={`Starts at ${startTime(game)}`} isLive={false} />)}
          </div>
        </>
      )}
    </div>
  )
}

function LeagueCard({ game, timeLabel, isLive }: { game: GameInfo; timeLabel: string; isLive: boolean }) {
  const competing = isCompeting(game.slug)
  const to = isLive ? `/game/${game.slug}/live` : `/game/${game.slug}`

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: `1px solid ${competing ? 'var(--competing-border)' : 'var(--border)'}`,
          borderRadius: 8, padding: 20, cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = competing ? 'var(--competing-border)' : 'var(--border)')}
      >
        {/* Header row: asset icon + name + LIVE badge or mode label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AssetIcon asset={game.asset} size={24} />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{game.asset}</span>
          </div>
          {isLive ? (
            <span style={{
              background: 'var(--live-bg)', color: 'var(--live-text)',
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, border: '1px solid var(--live-border)',
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
            color: isLive ? 'var(--time-live-color)' : 'var(--time-lobby-color)',
            background: isLive ? 'var(--time-live-bg)' : 'var(--time-lobby-bg)',
            border: `1px solid ${isLive ? 'var(--time-live-border)' : 'var(--time-lobby-border)'}`,
            borderRadius: 4, padding: '3px 10px',
          }}>
            {timeLabel}
          </span>
        </div>

        {/* Bottom row: action link left, competing + count right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
            {isLive ? 'Watch →' : (competing ? 'Change →' : 'Join →')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {competing && <span style={{ color: 'var(--competing-text)', fontSize: 12 }}>competing</span>}
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {game.participant_count ?? 0} player{game.participant_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </Link>
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
