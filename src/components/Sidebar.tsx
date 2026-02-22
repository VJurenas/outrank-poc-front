import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { HomeIcon, PortfolioIcon, TrophyIcon, MedalIcon, BubbleIcon, QuestionIcon, MenuIcon, ChevronIcon } from './Icons.tsx'
import { useCommunity } from '../contexts/CommunityContext.tsx'
import EventsBox from './EventsBox.tsx'

function CommunityNavBtn({ collapsed }: { collapsed: boolean }) {
  const { openTo } = useCommunity()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = location.pathname === '/community'
  return (
    <button
      onClick={() => { openTo('global'); navigate('/community') }}
      title={collapsed ? 'Community' : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 12, padding: collapsed ? '10px 0' : '10px 16px',
        width: '100%', background: isActive ? 'var(--nav-active-bg)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: isActive ? 'var(--text)' : 'var(--muted)',
        borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
        fontSize: 14,
      }}
    >
      <BubbleIcon size={18} />
      {!collapsed && 'Community'}
    </button>
  )
}

const COLLAPSED_KEY = 'sidebar_collapsed'

function loadCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === 'true'
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [leaguesOpen, setLeaguesOpen] = useState(false)
  const location = useLocation()

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  const isLeagueActive = location.pathname.startsWith('/leagues')

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      minWidth: collapsed ? 56 : 220,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Toggle button */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12, padding: collapsed ? '0' : '0 16px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--muted)',
          height: 64, minHeight: 64, width: '100%',
        }}
      >
        <MenuIcon size={21} />
        {!collapsed && <span style={{ fontSize: 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em' }}>OUTRANK</span>}
      </button>

      {/* Nav items */}
      <nav style={{ flex: 1, paddingTop: 8 }}>
        <NavItem to="/" icon={<HomeIcon />} label="Home" collapsed={collapsed} exact />
        <NavItem to="/performance" icon={<PortfolioIcon />} label="Portfolio" collapsed={collapsed} />

        {/* Leagues with sub-items */}
        <div>
          <button
            onClick={() => !collapsed && setLeaguesOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 12, padding: collapsed ? '10px 0' : '10px 16px',
              width: '100%', background: 'transparent', border: 'none',
              cursor: 'pointer',
              color: isLeagueActive ? 'var(--text)' : 'var(--muted)',
              borderLeft: isLeagueActive && collapsed ? '3px solid var(--gold)' : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 12, width: '100%' }}>
              {collapsed ? <TrophyIcon size={18} /> : (
                <>
                  <TrophyIcon size={18} />
                  <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>Leagues</span>
                  <ChevronIcon size={14} color="var(--muted)" />
                </>
              )}
            </div>
          </button>

          {/* Sub-items — only shown when expanded */}
          {!collapsed && leaguesOpen && (
            <div style={{ paddingLeft: 16 }}>
              <SubNavItem to="/leagues/15min" label="15 minutes" />
              <SubNavItem to="/leagues/60min" label="1 hour" />
            </div>
          )}

          {/* When collapsed, show sub-items as their own rows with indent feel */}
          {collapsed && (
            <>
              <SubNavItemCollapsed to="/leagues/15min" label="15m" />
              <SubNavItemCollapsed to="/leagues/60min" label="1h" />
            </>
          )}
        </div>

        <NavItem to="/leaderboard" icon={<MedalIcon />} label="Leaderboard" collapsed={collapsed} />
        <CommunityNavBtn collapsed={collapsed} />
        <NavItem to="/help" icon={<QuestionIcon />} label="Help" collapsed={collapsed} />
      </nav>

      {/* Events Box - only shown when expanded */}
      {!collapsed && (
        <div style={{ padding: '0 12px 12px' }}>
          <EventsBox />
        </div>
      )}
    </aside>
  )
}

function NavItem({
  to, icon, label, collapsed, exact,
}: {
  to: string; icon: React.ReactNode; label: string; collapsed: boolean; exact?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 12, padding: collapsed ? '10px 0' : '10px 16px',
        textDecoration: 'none',
        color: isActive ? 'var(--text)' : 'var(--muted)',
        borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
        background: isActive ? 'var(--nav-active-bg)' : 'transparent',
        fontSize: 14,
      })}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && label}
    </NavLink>
  )
}

function SubNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'block', padding: '8px 16px',
        textDecoration: 'none', fontSize: 13,
        color: isActive ? 'var(--gold)' : 'var(--muted)',
        borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
      })}
    >
      {label}
    </NavLink>
  )
}

function SubNavItemCollapsed({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      title={label}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px 0', fontSize: 10, fontWeight: 700,
        textDecoration: 'none',
        color: isActive ? 'var(--gold)' : 'var(--muted)',
      })}
    >
      {label}
    </NavLink>
  )
}
