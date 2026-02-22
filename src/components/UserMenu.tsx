import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { UserIcon } from './Icons.tsx'
import { apiSignOut } from '../lib/api.ts'

export default function UserMenu() {
  const { user, signOut, openSignIn } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    if (user?.sessionToken) {
      apiSignOut(user.sessionToken).catch(() => {})
    }
    signOut()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={user ? user.alias : 'Sign in'}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: user ? 'var(--live-bg)' : 'var(--surface)',
          border: user ? '1px solid var(--live-border)' : '1px solid var(--border)',
          cursor: 'pointer', padding: 0,
        }}
      >
        <UserIcon size={18} color={user ? 'var(--live-text)' : 'var(--muted)'} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6, minWidth: 160, zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {user && (
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12, color: 'var(--muted)',
            }}>
              <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{user.alias}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}
              </div>
            </div>
          )}

          {!user && (
            <MenuItem label="Sign In" onClick={() => { setOpen(false); openSignIn() }} />
          )}
          {user && (
            <>
              <MenuItem label="Profile" onClick={() => { setOpen(false); navigate('/profile') }} />
              <MenuItem label="Portfolio" onClick={() => { setOpen(false); navigate('/performance') }} />
              <MenuItem label="Sign Out" onClick={handleSignOut} danger />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '10px 14px', background: hover ? 'var(--surface-2)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: danger ? '#f66' : 'var(--text)',
        fontSize: 14,
      }}
    >
      {label}
    </button>
  )
}
