import { useState, useEffect, type ReactNode } from 'react'
import Sidebar from './Sidebar.tsx'
import UserMenu from './UserMenu.tsx'
import WalletSignIn from './WalletSignIn.tsx'
import CommunityPanel from './CommunityPanel.tsx'
import { SunIcon, MoonIcon } from './Icons.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'
import { getBalance } from '../lib/api.ts'

function RankBalance({ token }: { token: string }) {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    const fetch = () => getBalance(token).then(r => setBalance(r.balance)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 2_000)
    return () => clearInterval(id)
  }, [token])

  if (balance === null) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      border: '1px solid var(--border)',
      fontSize: 13, fontWeight: 600, color: 'var(--text)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>RANK</span>
      {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signInOpen } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar — spans full width above both main and community panel */}
        <header style={{
          height: 64, minHeight: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8,
          padding: '0 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}>
          {user && <RankBalance token={user.sessionToken} />}

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid var(--border)',
              cursor: 'pointer', padding: 0,
            }}
          >
            {theme === 'dark'
              ? <SunIcon size={16} color="var(--muted)" />
              : <MoonIcon size={16} color="var(--muted)" />
            }
          </button>

          <UserMenu />
        </header>

        {/* Below-header row: main content + community panel side by side */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {children}
          </main>

          <CommunityPanel />
        </div>
      </div>

      {signInOpen && <WalletSignIn />}
    </div>
  )
}
