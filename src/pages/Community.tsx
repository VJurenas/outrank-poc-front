import { useEffect } from 'react'
import { useCommunity } from '../contexts/CommunityContext.tsx'
import { BubbleIcon, UsersIcon } from '../components/Icons.tsx'

export default function Community() {
  const { openTo } = useCommunity()
  useEffect(() => { openTo('global') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Community</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 15 }}>
        Outrank is built around competition — but the best competition happens between people who know each other.
        Use the community panel on the right to chat, tip, and connect with other players.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Chat */}
        <FeatureCard
          icon={<BubbleIcon size={22} />}
          title="Chat"
          badge="Live"
          badgeColor="var(--accent)"
        >
          <p>Two chat channels are always available in the community panel:</p>
          <ul>
            <li>
              <strong>Global shoutbox</strong> — open to everyone at all times. Talk markets, trash-talk predictions,
              or just say hi. Click the chat bubble icon in the right panel to open it.
            </li>
            <li>
              <strong>League chat</strong> — each game has its own channel, active while the lobby is open
              and throughout the live game. Switch to the game chat tab when you're on a league page.
              The channel closes after the game ends.
            </li>
          </ul>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
            Click any player's name in chat to open their action menu.
          </p>
        </FeatureCard>

        {/* Friends */}
        <FeatureCard
          icon={<UsersIcon size={22} />}
          title="Friends"
          badge="Live"
          badgeColor="var(--accent)"
        >
          <p>Build your circle and keep track of the players you want to watch:</p>
          <ul>
            <li>
              <strong>Search</strong> — find any player by name using the search box in the Friends tab.
            </li>
            <li>
              <strong>Invite</strong> — send a friend request from search results or by clicking a player's name
              in chat. If they've already sent you a request, clicking Invite auto-accepts it.
            </li>
            <li>
              <strong>Manage</strong> — accept or reject incoming invites, cancel pending outgoing requests,
              or remove existing friends — all from the Friends tab in the right panel.
            </li>
          </ul>
        </FeatureCard>

        {/* Tipping */}
        <FeatureCard
          icon={<RankIcon />}
          title="Tipping"
          badge="Live"
          badgeColor="var(--accent)"
        >
          <p>
            Send <strong>RANK tokens</strong> directly to any player as a tip — reward a great call,
            congratulate a winner, or just be generous.
          </p>
          <ul>
            <li>Click a player's name in chat or in the Friends tab.</li>
            <li>Choose <em>Tip RANK</em> from the menu.</li>
            <li>Enter an amount and confirm. The tokens transfer immediately and are recorded on-chain in the ledger.</li>
          </ul>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
            Tipping requires a signed-in wallet with sufficient RANK balance.
          </p>
        </FeatureCard>

        {/* Challenges — future */}
        <FeatureCard
          icon={<SwordsIcon />}
          title="Challenges"
          badge="Coming soon"
          badgeColor="var(--muted)"
        >
          <p style={{ color: 'var(--muted)' }}>
            Challenge any player to a <strong>side-bet</strong> based on performance in a specific league.
            Pick a market, stake an amount of RANK, and let the price decide the winner.
            The player with the closer prediction takes the pot.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
            Challenges will appear as an option in the player action menu once the feature launches.
          </p>
        </FeatureCard>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, badge, badgeColor, children,
}: {
  icon: React.ReactNode
  title: string
  badge: string
  badgeColor: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
        <span style={{
          marginLeft: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '2px 7px', borderRadius: 20,
          border: `1px solid ${badgeColor}`,
          color: badgeColor,
        }}>{badge}</span>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}

function RankIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function SwordsIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="9.5 6.5 6 3 3 6 6.5 9.5" />
      <line x1="5" y1="11" x2="11" y2="5" />
    </svg>
  )
}
