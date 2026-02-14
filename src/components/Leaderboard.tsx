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

export default function Leaderboard({ players, myPlayerId, onToggleTrack, tracked }: Props) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px 60px', gap: 4, padding: '4px 8px', color: 'var(--muted)', fontSize: 12 }}>
        <span>#</span><span>Player</span><span style={{ textAlign: 'right' }}>Distance</span><span style={{ textAlign: 'center' }}>Zone</span>
      </div>
      {players.map((p) => {
        const isMe = p.playerId === myPlayerId
        const isTracked = tracked?.has(p.playerId)
        return (
          <div
            key={p.playerId}
            onClick={() => onToggleTrack?.(p.playerId)}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 100px 60px',
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
    </div>
  )
}
