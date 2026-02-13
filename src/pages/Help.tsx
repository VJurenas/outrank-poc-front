export default function Help() {
  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Help</h1>

      <Section title="How does Outrank work?">
        Predict where the price of BTC, ETH, or HYPE will be at a future checkpoint. Everyone submits
        their prediction before kickoff. The closest predictions land in the <Gold>Gold</Gold> zone —
        the furthest ones end up in the <Dead>Dead</Dead> zone.
      </Section>

      <Section title="What are zones?">
        After each checkpoint, players are ranked by how close their prediction was to the actual price:
        <ul style={{ color: 'var(--muted)', margin: '8px 0 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
          <li><Gold>Gold</Gold> — top 40% closest predictions</li>
          <li style={{ color: '#aaa' }}>Silver — next 20%</li>
          <li><Dead>Dead</Dead> — bottom 40%</li>
        </ul>
      </Section>

      <Section title="How do I sign in?">
        Click the user icon in the top-right corner and choose "Sign In". Connect your MetaMask
        wallet and pick a display name. You'll sign a short message with your wallet to prove ownership —
        no password required.
      </Section>

      <Section title="What wallets are supported?">
        Currently only MetaMask. More wallets coming soon.
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>{title}</h2>
      <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{children}</div>
    </div>
  )
}

function Gold({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--gold)' }}>{children}</span>
}

function Dead({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--dead)' }}>{children}</span>
}
