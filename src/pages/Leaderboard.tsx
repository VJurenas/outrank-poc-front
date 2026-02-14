import { useEffect, useState } from 'react'
import { getGlobalLeaderboard, type GlobalLeaderboardEntry } from '../lib/api.ts'
import { useAuth } from '../contexts/AuthContext.tsx'

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<GlobalLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getGlobalLeaderboard()
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Global Leaderboard</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>
        Ranked by composite score: Gold ×3 · Silver ×2 · Dead ×1
      </p>

      {loading && <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: 'var(--error)', fontSize: 14 }}>{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No ranked players yet.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'left' }}>
                <Th style={{ width: 40 }}>#</Th>
                <Th>Player</Th>
                <Th style={{ textAlign: 'right' }}>Score</Th>
                <Th style={{ textAlign: 'right' }}>Games</Th>
                <Th style={{ textAlign: 'right', color: 'var(--gold)' }}>Gold</Th>
                <Th style={{ textAlign: 'right', color: 'var(--silver)' }}>Silver</Th>
                <Th style={{ textAlign: 'right', color: 'var(--dead)' }}>Dead</Th>
                <Th style={{ textAlign: 'right' }}>Avg Δ</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isMe = user?.playerId === row.playerId
                const rank = i + 1
                const medalColor = rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--silver)' : rank === 3 ? '#cd7f32' : undefined
                return (
                  <tr
                    key={row.playerId}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: isMe ? 'var(--nav-active-bg)' : 'transparent',
                    }}
                  >
                    <Td style={{ color: medalColor ?? 'var(--muted)', fontWeight: medalColor ? 700 : 400 }}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </Td>
                    <Td>
                      <span style={{ fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--accent)' : 'var(--text)' }}>
                        {row.alias}
                      </span>
                      {isMe && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>(you)</span>
                      )}
                      {row.type === 'bot' && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px' }}>BOT</span>
                      )}
                    </Td>
                    <Td style={{ textAlign: 'right', fontWeight: 600 }}>{row.score}</Td>
                    <Td style={{ textAlign: 'right', color: 'var(--muted)' }}>{row.gamesPlayed}</Td>
                    <Td style={{ textAlign: 'right', color: 'var(--gold)' }}>{row.goldCount}</Td>
                    <Td style={{ textAlign: 'right', color: 'var(--silver)' }}>{row.silverCount}</Td>
                    <Td style={{ textAlign: 'right', color: 'var(--dead)' }}>{row.deadCount}</Td>
                    <Td style={{ textAlign: 'right', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {formatDistance(row.avgDistance)}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{ padding: '8px 12px', fontWeight: 600, ...style }}>{children}</th>
  )
}

function Td({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '10px 12px', ...style }}>{children}</td>
  )
}

function formatDistance(d: number): string {
  if (d >= 1_000_000) return (d / 1_000_000).toFixed(2) + 'M'
  if (d >= 1_000) return (d / 1_000).toFixed(2) + 'K'
  return d.toFixed(2)
}
