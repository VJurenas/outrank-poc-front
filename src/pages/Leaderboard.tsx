import { useEffect, useState, useMemo } from 'react'
import { getGlobalLeaderboard, type GlobalLeaderboardEntry } from '../lib/api.ts'
import { useAuth } from '../contexts/AuthContext.tsx'

const TOP_N = 10
const PAGE_SIZES = [20, 50, 100]

type SepRow = { type: 'sep'; key: string }
type Row = GlobalLeaderboardEntry | SepRow

function buildTruncated(rows: GlobalLeaderboardEntry[], myPlayerId?: string): Row[] {
  if (rows.length <= TOP_N) return rows

  const userIdx = myPlayerId ? rows.findIndex(r => r.playerId === myPlayerId) : -1

  if (userIdx < TOP_N) return rows.slice(0, TOP_N)

  const result: Row[] = [...rows.slice(0, TOP_N)]

  const ctxStart = Math.max(TOP_N, userIdx - 1)
  const ctxEnd   = Math.min(userIdx + 1, rows.length - 1)

  if (ctxStart > TOP_N) result.push({ type: 'sep', key: 'sep-before' })
  for (let i = ctxStart; i <= ctxEnd; i++) result.push(rows[i])
  if (ctxEnd < rows.length - 1) result.push({ type: 'sep', key: 'sep-after' })

  return result
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<GlobalLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  useEffect(() => {
    getGlobalLeaderboard()
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // When switching to full view reset to page 1
  useEffect(() => { if (showAll) setPage(1) }, [showAll])
  // When page size changes reset to page 1
  useEffect(() => { setPage(1) }, [pageSize])

  const truncated = useMemo(() => buildTruncated(rows, user?.playerId), [rows, user?.playerId])

  const totalPages = Math.ceil(rows.length / pageSize)
  const pagedRows  = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  )

  const displayRows: Row[] = showAll ? pagedRows : truncated

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
        <>
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
                  <Th style={{ textAlign: 'right' }}>Avg Δ%</Th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  if ('type' in row && row.type === 'sep') {
                    return (
                      <tr key={row.key}>
                        <td colSpan={8} style={{ padding: '4px 12px', color: 'var(--muted)', fontSize: 11, opacity: 0.6, letterSpacing: '0.1em' }}>
                          ···
                        </td>
                      </tr>
                    )
                  }
                  const r = row as GlobalLeaderboardEntry
                  const isMe = user?.playerId === r.playerId
                  const rank = showAll ? (page - 1) * pageSize + i + 1 : rows.indexOf(r) + 1
                  const medalColor = rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--silver)' : rank === 3 ? '#cd7f32' : undefined
                  return (
                    <tr
                      key={r.playerId}
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
                          {r.alias}
                        </span>
                        {isMe && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>(you)</span>
                        )}
                        {r.type === 'bot' && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px' }}>BOT</span>
                        )}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 600 }}>{r.score}</Td>
                      <Td style={{ textAlign: 'right', color: 'var(--muted)' }}>{r.gamesPlayed}</Td>
                      <Td style={{ textAlign: 'right', color: 'var(--gold)' }}>{r.goldCount}</Td>
                      <Td style={{ textAlign: 'right', color: 'var(--silver)' }}>{r.silverCount}</Td>
                      <Td style={{ textAlign: 'right', color: 'var(--dead)' }}>{r.deadCount}</Td>
                      <Td style={{ textAlign: 'right', color: 'var(--muted)', fontFamily: 'monospace' }}>
                        {r.avgPctDelta != null ? r.avgPctDelta.toFixed(2) + '%' : '—'}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {rows.length > TOP_N && (
              <button
                onClick={() => setShowAll(v => !v)}
                style={{ fontSize: 12, padding: '4px 12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 3 }}
              >
                {showAll ? 'SHOW LESS' : `SHOW ALL (${rows.length})`}
              </button>
            )}

            {showAll && (
              <>
                {/* Page size picker */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Per page:</span>
                  {PAGE_SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setPageSize(s)}
                      style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 3,
                        background: pageSize === s ? 'var(--surface-2)' : 'transparent',
                        border: `1px solid ${pageSize === s ? 'var(--muted)' : 'var(--border)'}`,
                        color: pageSize === s ? 'var(--text)' : 'var(--muted)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ fontSize: 12, padding: '3px 10px', borderRadius: 3, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      ‹
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 60, textAlign: 'center' }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{ fontSize: 12, padding: '3px 10px', borderRadius: 3, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
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
