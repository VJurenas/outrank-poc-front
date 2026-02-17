import { useState, useMemo } from 'react'
import type { LeaderboardEntry } from '../lib/api.ts'

type Props = {
  players: LeaderboardEntry[]
  myPlayerId?: string
  onToggleTrack?: (playerId: string) => void
  tracked?: Set<string>
}

const ZONE_BG: Record<string, string> = {
  gold:   'var(--zone-gold-bg)',
  silver: 'var(--zone-silver-bg)',
  dead:   'var(--zone-dead-bg)',
}
const ZONE_TEXT: Record<string, string> = {
  gold:   'var(--gold)',
  silver: 'var(--silver)',
  dead:   'var(--dead)',
}

const TOP_N = 10

type Row = LeaderboardEntry | { type: 'sep'; key: string }

function buildRows(players: LeaderboardEntry[], myPlayerId?: string, showAll?: boolean): Row[] {
  if (showAll || players.length <= TOP_N) return players

  const userIdx = myPlayerId ? players.findIndex(p => p.playerId === myPlayerId) : -1

  if (userIdx < TOP_N) return players.slice(0, TOP_N)

  const result: Row[] = [...players.slice(0, TOP_N)]

  const ctxStart = Math.max(TOP_N, userIdx - 1)
  const ctxEnd   = Math.min(userIdx + 1, players.length - 1)

  // Leading separator only if context doesn't start immediately after top 10
  if (ctxStart > TOP_N) result.push({ type: 'sep', key: 'sep-before' })

  for (let i = ctxStart; i <= ctxEnd; i++) result.push(players[i])

  // Trailing separator if there are more rows after the context
  if (ctxEnd < players.length - 1) result.push({ type: 'sep', key: 'sep-after' })

  return result
}

export default function Leaderboard({ players, myPlayerId, onToggleTrack, tracked }: Props) {
  const [showAll, setShowAll] = useState(false)

  const rows = useMemo(
    () => buildRows(players, myPlayerId, showAll),
    [players, myPlayerId, showAll],
  )

  const colGrid = '32px 1fr 100px 60px'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: 4, padding: '4px 8px', color: 'var(--muted)', fontSize: 12 }}>
        <span>#</span><span>Player</span><span style={{ textAlign: 'right' }}>Distance</span><span style={{ textAlign: 'center' }}>Zone</span>
      </div>

      {rows.map((row, i) => {
        if ('type' in row && row.type === 'sep') {
          return (
            <div key={row.key} style={{
              display: 'grid', gridTemplateColumns: colGrid, gap: 4,
              padding: '3px 8px', color: 'var(--muted)', fontSize: 11, opacity: 0.6,
            }}>
              <span />
              <span style={{ letterSpacing: '0.1em' }}>···</span>
            </div>
          )
        }
        const p = row as LeaderboardEntry
        const isMe      = p.playerId === myPlayerId
        const isTracked = tracked?.has(p.playerId)
        return (
          <div
            key={p.playerId}
            onClick={() => onToggleTrack?.(p.playerId)}
            style={{
              display: 'grid',
              gridTemplateColumns: colGrid,
              gap: 4,
              padding: '6px 8px',
              background: ZONE_BG[p.zone],
              borderLeft: isMe ? '3px solid var(--text)' : isTracked ? '3px solid var(--accent-2)' : '3px solid transparent',
              cursor: onToggleTrack ? 'pointer' : 'default',
              marginBottom: 2,
              borderRadius: 3,
            }}
          >
            <span style={{ color: ZONE_TEXT[p.zone], fontWeight: 700 }}>{p.rank}</span>
            <span style={{
              color: isMe ? 'var(--text)' : ZONE_TEXT[p.zone],
              fontWeight: isMe ? 700 : 400,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {p.alias}{isMe ? ' (you)' : ''}
            </span>
            <span style={{ textAlign: 'right', color: ZONE_TEXT[p.zone] }}>
              {p.distance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span style={{ textAlign: 'center', color: ZONE_TEXT[p.zone], textTransform: 'capitalize', fontSize: 11 }}>
              {p.zone}
            </span>
          </div>
        )
      })}

      {players.length === 0 && (
        <div style={{ padding: 16, color: 'var(--muted)', textAlign: 'center' }}>No players yet</div>
      )}

      {players.length > TOP_N && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: 6, width: '100%',
            fontSize: 11, padding: '4px 0',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            borderRadius: 3, cursor: 'pointer',
          }}
        >
          {showAll ? 'SHOW LESS' : `SHOW ALL (${players.length})`}
        </button>
      )}
    </div>
  )
}
