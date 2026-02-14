import type { ReactNode } from 'react'
import Sidebar from './Sidebar.tsx'
import UserMenu from './UserMenu.tsx'
import WalletSignIn from './WalletSignIn.tsx'
import { SunIcon, MoonIcon } from './Icons.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'

export default function Layout({ children }: { children: ReactNode }) {
  const { signInOpen } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 64, minHeight: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8,
          padding: '0 20px',
          background: 'var(--surface)',
        }}>
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

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>

      {signInOpen && <WalletSignIn />}
    </div>
  )
}
