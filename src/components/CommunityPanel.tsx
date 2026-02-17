import { BubbleIcon, UsersIcon, ChevronIcon } from './Icons.tsx'
import { useCommunity, type CommunityTab } from '../contexts/CommunityContext.tsx'
import ChatTab from './ChatTab.tsx'
import FriendsTab from './FriendsTab.tsx'

const PANEL_WIDTH    = 280
const COLLAPSED_WIDTH = 28

/** Parse "btc_15min_1739100000" → "BTC 15min 14:30 CHAT" */
function slugToTabTitle(slug: string): string {
  const parts = slug.split('_')
  if (parts.length < 3) return slug.toUpperCase() + ' CHAT'
  const asset     = parts[0].toUpperCase()
  const timeframe = parts[1]                        // e.g. "15min"
  const ts        = parseInt(parts.slice(2).join(''), 10)
  const time      = isNaN(ts) ? '' : new Date(ts * 1000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${asset} ${timeframe} ${time} CHAT`
}

function GameChatIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M12 7v4M10 9h4" strokeWidth={2.5} />
    </svg>
  )
}

export default function CommunityPanel() {
  const { open, tab, gameSlug, openTo, close } = useCommunity()

  // Tab button — shown in the horizontal bar
  function TabBtn({ id, icon, label }: { id: CommunityTab; icon: React.ReactNode; label: string }) {
    const isActive = tab === id
    return (
      <button
        onClick={() => openTo(id)}
        title={label}
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          height: '100%', padding: '0 4px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600,
          color: isActive ? 'var(--text)' : 'var(--muted)',
          borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
          borderRadius: 0,
        }}
      >
        {icon}
        {label}
      </button>
    )
  }

  if (!open) {
    // Collapsed: thin strip with expand button
    return (
      <aside style={{
        width: COLLAPSED_WIDTH, minWidth: COLLAPSED_WIDTH,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 6,
      }}>
        <button
          onClick={() => openTo(tab)}
          title="Open community panel"
          style={{
            width: COLLAPSED_WIDTH, height: COLLAPSED_WIDTH,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: 0,
          }}
        >
          {/* Chevron pointing left (into the panel) */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </aside>
    )
  }

  const gameTitle = gameSlug ? slugToTabTitle(gameSlug) : 'GAME CHAT'

  return (
    <aside style={{
      width: PANEL_WIDTH, minWidth: PANEL_WIDTH,
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Horizontal tab bar ── */}
      <div style={{
        height: 40, minHeight: 40,
        display: 'flex', alignItems: 'stretch',
        borderBottom: '1px solid var(--border)',
      }}>
        <TabBtn id="global"  icon={<BubbleIcon size={14} />}   label="Shoutbox" />
        <TabBtn id="game"    icon={<GameChatIcon />}            label="League" />
        <TabBtn id="friends" icon={<UsersIcon size={14} />}     label="Friends" />

        {/* Collapse button */}
        <button
          onClick={close}
          title="Collapse panel"
          style={{
            width: 32, minWidth: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            borderLeft: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--muted)', padding: 0, borderRadius: 0,
          }}
        >
          {/* Chevron pointing right (away from content) */}
          <ChevronIcon size={14} color="var(--muted)" />
        </button>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'global'  && <ChatTab channel="global"          title="GLOBAL SHOUTBOX" />}
        {tab === 'game'    && (
          gameSlug
            ? <ChatTab channel={gameSlug} title={gameTitle} />
            : <div style={{ padding: 20, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                Join a game to chat here
              </div>
        )}
        {tab === 'friends' && <FriendsTab />}
      </div>
    </aside>
  )
}
