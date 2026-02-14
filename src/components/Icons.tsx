type IconProps = { size?: number; color?: string }

export function HomeIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

export function TrophyIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 01-2-2V5h4" />
      <path d="M18 9h2a2 2 0 002-2V5h-4" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
      <path d="M6 5h12v6a6 6 0 01-12 0V5z" />
    </svg>
  )
}

export function MedalIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 8.5L5 3h14l-3.5 5.5" />
    </svg>
  )
}

export function BubbleIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

export function QuestionIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill={color} />
    </svg>
  )
}

export function UserIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

export function ChevronIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function MenuIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

export function SunIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function MoonIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

// ─── Asset pictograms ─────────────────────────────────────────────────────────

export function BtcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      {/* Double stems */}
      <line x1="13.5" y1="6.5" x2="13.5" y2="9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17" y1="6.5" x2="17" y2="9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="23" x2="13.5" y2="25.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17" y1="23" x2="17" y2="25.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      {/* B body */}
      <path
        fill="white"
        d="M11 9h7.2c1.8 0 3 1 3 2.6 0 .9-.4 1.7-1.1 2.1 1.2.5 2 1.5 2 2.8 0 2-1.5 3.2-3.8 3.2H11V9zm2.2 4.2h4.5c.8 0 1.3-.5 1.3-1.2s-.5-1.1-1.3-1.1h-4.5v2.3zm0 5h5c.9 0 1.5-.6 1.5-1.4s-.6-1.4-1.5-1.4h-5v2.8z"
      />
    </svg>
  )
}

export function EthIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      {/* Ethereum diamond prism — 4 faces */}
      <polygon points="16,5 8,16.5 16,20" fill="white" opacity="0.60" />
      <polygon points="16,5 16,20 24,16.5" fill="white" opacity="0.90" />
      <polygon points="16,20 8,16.5 16,27" fill="white" opacity="0.45" />
      <polygon points="16,20 24,16.5 16,27" fill="white" opacity="0.75" />
    </svg>
  )
}

export function HypeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="16" cy="16" r="16" fill="#00AEEF" />
      {/* Bold H */}
      <path
        fill="white"
        d="M9 8h2.8v6.4h8.4V8H23v16h-2.8v-6.8h-8.4V24H9V8z"
      />
    </svg>
  )
}

/** Renders the right coin pictogram for a given asset ticker. */
export function AssetIcon({ asset, size = 20 }: { asset: string; size?: number }) {
  if (asset === 'BTC') return <BtcIcon size={size} />
  if (asset === 'ETH') return <EthIcon size={size} />
  if (asset === 'HYPE') return <HypeIcon size={size} />
  return null
}
