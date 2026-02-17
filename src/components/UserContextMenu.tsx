import { useRef, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import { sendFriendInvite, getFriendInvites, sendTip } from '../lib/api.ts'

type Props = {
  playerId: string
  alias: string
  x: number
  y: number
  onClose: () => void
}

export default function UserContextMenu({ playerId, alias, x, y, onClose }: Props) {
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const [subview, setSubview] = useState<'menu' | 'tip'>('menu')
  const [tipAmount, setTipAmount] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  // Check if there's an incoming invite from this player
  useEffect(() => {
    if (!user) return
    getFriendInvites(user.sessionToken)
      .then(({ incoming }) => {
        const exists = incoming.find(i => i.from?.playerId === playerId)
        if (exists) setInviteStatus('incoming')
      })
      .catch(() => {})
  }, [user, playerId])

  async function handleInvite() {
    if (!user) return
    try {
      const res = await sendFriendInvite(playerId, user.sessionToken)
      setStatus(res.status === 'accepted' ? 'Friends!' : 'Invite sent!')
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  async function handleTip() {
    if (!user) return
    const amount = parseFloat(tipAmount)
    if (isNaN(amount) || amount <= 0) { setStatus('Enter a valid amount'); return }
    try {
      await sendTip(playerId, amount, user.sessionToken)
      setStatus(`Sent ${amount} RANK!`)
      setTimeout(onClose, 1200)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  // Clamp to viewport
  const left = Math.min(x, window.innerWidth - 180)
  const top  = Math.min(y, window.innerHeight - 160)

  const menuStyle: React.CSSProperties = {
    position: 'fixed', left, top, zIndex: 1000,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    minWidth: 160, overflow: 'hidden',
  }
  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '9px 14px', fontSize: 13, cursor: 'pointer',
    background: 'transparent', border: 'none', color: 'var(--text)',
  }
  const mutedStyle: React.CSSProperties = { ...itemStyle, color: 'var(--muted)', cursor: 'not-allowed' }

  return (
    <div ref={ref} style={menuStyle}>
      <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
        {alias}
      </div>

      {subview === 'menu' && (
        <>
          {user && user.playerId !== playerId && (
            <>
              <button style={itemStyle} onClick={handleInvite}>
                {inviteStatus === 'incoming' ? 'Accept Invite' : 'Invite'}
              </button>
              <button style={itemStyle} onClick={() => setSubview('tip')}>Tip RANK</button>
            </>
          )}
          <button style={mutedStyle} disabled>Challenge (soon)</button>
          {status && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--accent)' }}>{status}</div>}
        </>
      )}

      {subview === 'tip' && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Send RANK to {alias}</div>
          <input
            type="number"
            placeholder="Amount"
            value={tipAmount}
            onChange={e => setTipAmount(e.target.value)}
            style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '5px 8px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleTip} style={{ flex: 1, fontSize: 12, padding: '5px 0' }}>Send</button>
            <button onClick={() => setSubview('menu')} style={{ fontSize: 12, padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, cursor: 'pointer' }}>Back</button>
          </div>
          {status && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>{status}</div>}
        </div>
      )}
    </div>
  )
}
