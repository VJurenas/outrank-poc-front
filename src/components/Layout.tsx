import type { ReactNode } from 'react'
import Sidebar from './Sidebar.tsx'
import UserMenu from './UserMenu.tsx'
import WalletSignIn from './WalletSignIn.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'

export default function Layout({ children }: { children: ReactNode }) {
  const { signInOpen } = useAuth()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 48, minHeight: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
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
