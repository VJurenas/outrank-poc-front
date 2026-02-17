import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import {
  getFriends, getFriendInvites, sendFriendInvite, respondToInvite, removeFriend, searchPlayers,
  type FriendEntry, type InviteEntry,
} from '../lib/api.ts'
import UserContextMenu from './UserContextMenu.tsx'

type CtxMenu = { playerId: string; alias: string; x: number; y: number }

export default function FriendsTab() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [incoming, setIncoming] = useState<InviteEntry[]>([])
  const [outgoing, setOutgoing] = useState<InviteEntry[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ playerId: string; alias: string; type: string }[]>([])
  const [ctx, setCtx] = useState<CtxMenu | null>(null)
  const [msg, setMsg] = useState('')

  const refresh = useCallback(() => {
    if (!user) return
    getFriends(user.sessionToken).then(r => setFriends(r.friends)).catch(() => {})
    getFriendInvites(user.sessionToken).then(r => { setIncoming(r.incoming); setOutgoing(r.outgoing) }).catch(() => {})
  }, [user])

  useEffect(() => { refresh(); const id = setInterval(refresh, 5000); return () => clearInterval(id) }, [refresh])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      searchPlayers(query).then(r => setResults(r.players)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleInvite(toPlayerId: string) {
    if (!user) return
    try {
      const res = await sendFriendInvite(toPlayerId, user.sessionToken)
      setMsg(res.status === 'accepted' ? 'Now friends!' : 'Invite sent!')
      refresh()
    } catch (e) { setMsg((e as Error).message) }
    setTimeout(() => setMsg(''), 2000)
  }

  async function handleRespond(inviteId: string, action: 'accept' | 'reject') {
    if (!user) return
    try { await respondToInvite(inviteId, action, user.sessionToken); refresh() }
    catch (e) { setMsg((e as Error).message) }
  }

  async function handleRemove(friendId: string) {
    if (!user) return
    try { await removeFriend(friendId, user.sessionToken); refresh() }
    catch (e) { setMsg((e as Error).message) }
  }

  const section = (title: string) => (
    <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {title}
    </div>
  )

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 12px', fontSize: 13,
  }

  const smallBtn = (label: string, onClick: () => void, danger = false): React.ReactNode => (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 3,
        background: 'transparent',
        border: `1px solid ${danger ? 'var(--dead)' : 'var(--border)'}`,
        color: danger ? 'var(--dead)' : 'var(--muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  const header = (
    <div style={{ padding: '7px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', fontWeight: 700, letterSpacing: '0.08em' }}>
      FRIEND LIST
    </div>
  )

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {header}
      <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Sign in to view friends</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {header}
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Search */}
      <div style={{ padding: '10px 10px 6px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search players…"
          style={{ width: '100%', fontSize: 13, padding: '5px 8px' }}
        />
      </div>
      {msg && <div style={{ padding: '0 12px 6px', fontSize: 12, color: 'var(--accent)' }}>{msg}</div>}

      {results.length > 0 && (
        <>
          {section('Search Results')}
          {results.map(r => (
            <div key={r.playerId} style={rowStyle}>
              <button
                onClick={e => setCtx({ playerId: r.playerId, alias: r.alias, x: e.clientX, y: e.clientY })}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--text)', textAlign: 'left' }}
              >
                {r.alias}
                {r.type === 'bot' && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 5 }}>BOT</span>}
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                {smallBtn('Invite', () => handleInvite(r.playerId))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Incoming invites */}
      {incoming.length > 0 && (
        <>
          {section(`Incoming (${incoming.length})`)}
          {incoming.map(inv => (
            <div key={inv.id} style={rowStyle}>
              <span>{inv.from?.alias}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {smallBtn('Accept', () => handleRespond(inv.id, 'accept'))}
                {smallBtn('Reject', () => handleRespond(inv.id, 'reject'), true)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <>
          {section('Pending')}
          {outgoing.map(inv => (
            <div key={inv.id} style={rowStyle}>
              <span style={{ color: 'var(--muted)' }}>{inv.to?.alias}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>pending</span>
            </div>
          ))}
        </>
      )}

      {/* Friends */}
      {section(`Friends (${friends.length})`)}
      {friends.length === 0 && (
        <div style={{ padding: '4px 12px', fontSize: 13, color: 'var(--muted)' }}>No friends yet</div>
      )}
      {friends.map(f => (
        <div key={f.playerId} style={rowStyle}>
          <button
            onClick={e => setCtx({ playerId: f.playerId, alias: f.alias, x: e.clientX, y: e.clientY })}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
          >
            {f.alias}
          </button>
          {smallBtn('Remove', () => handleRemove(f.playerId), true)}
        </div>
      ))}

      {ctx && (
        <UserContextMenu
          playerId={ctx.playerId}
          alias={ctx.alias}
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
    </div>
  )
}
