import { BubbleIcon, UsersIcon } from './Icons.tsx'
import { useCommunity, type CommunityTab } from '../contexts/CommunityContext.tsx'
import ChatTab from './ChatTab.tsx'
import FriendsTab from './FriendsTab.tsx'

const PANEL_WIDTH = 280
const COLLAPSED_WIDTH = 40

export default function CommunityPanel() {
  const { open, tab, gameSlug, openTo, close } = useCommunity()

  const width = open ? PANEL_WIDTH : COLLAPSED_WIDTH

  // Tab icon button
  function TabBtn({ id, icon }: { id: CommunityTab; icon: React.ReactNode }) {
    const isActive = open && tab === id
    return (
      <button
        onClick={() => (open && tab === id ? close() : openTo(id))}
        title={id === 'global' ? 'Global chat' : id === 'game' ? 'Game chat' : 'Friends'}
        style={{
          width: COLLAPSED_WIDTH, height: COLLAPSED_WIDTH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? 'var(--nav-active-bg)' : 'transparent',
          border: 'none', cursor: 'pointer',
          borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
          color: isActive ? 'var(--text)' : 'var(--muted)',
          flexShrink: 0,
        }}
      >
        {icon}
      </button>
    )
  }

  // Game icon — simple bolt/lightning shape for "game chat"
  function GameChatIcon() {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M12 7v4M10 9h4" strokeWidth={2.5} />
      </svg>
    )
  }

  return (
    <aside style={{
      width,
      minWidth: width,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Tab strip (always visible) */}
      <div style={{
        width: COLLAPSED_WIDTH, minWidth: COLLAPSED_WIDTH,
        display: 'flex', flexDirection: 'column',
        borderRight: open ? '1px solid var(--border)' : 'none',
        paddingTop: 8,
      }}>
        <TabBtn id="global" icon={<BubbleIcon size={18} />} />
        <TabBtn id="game"   icon={<GameChatIcon />} />
        <TabBtn id="friends" icon={<UsersIcon size={18} />} />
      </div>

      {/* Panel content */}
      {open && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {tab === 'global'  && <ChatTab channel="global" label="global" />}
          {tab === 'game'    && (
            gameSlug
              ? <ChatTab channel={gameSlug} label={gameSlug} />
              : <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  Join a game to chat here
                </div>
          )}
          {tab === 'friends' && <FriendsTab />}
        </div>
      )}
    </aside>
  )
}
