import type { AuthUser } from '../contexts/AuthContext.tsx'

const BASE = '/api'

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    ...init,
    headers: { ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json()
}

export type GameInfo = {
  id: string
  slug: string
  asset: string
  mode: '15min' | '60min'
  kickoff_at: string
  status: 'lobby' | 'live' | 'ended'
  participant_count?: number
}

export type LeaderboardEntry = {
  rank: number
  player_id: string
  alias: string
  distance: number
  zone: 'gold' | 'silver' | 'dead'
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function signIn(body: {
  walletAddress: string; alias: string; nonce: string; message: string; signature: string
}): Promise<AuthUser> {
  return json('/auth/signin', { method: 'POST', body: JSON.stringify(body) })
}

export function apiSignOut(token: string): Promise<{ ok: boolean }> {
  return json('/auth/signout', { method: 'POST', headers: { 'x-user-token': token } })
}

export function updateProfile(token: string, alias: string): Promise<{ alias: string }> {
  return json('/auth/profile', {
    method: 'PUT',
    headers: { 'x-user-token': token },
    body: JSON.stringify({ alias }),
  })
}

// ─── Games ───────────────────────────────────────────────────────────────────

export function getGames(params?: { status?: string; mode?: string }): Promise<GameInfo[]> {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  ).toString() : ''
  return json(`/games${qs}`)
}

export const api = {
  getPrices: () => json<Record<string, number | null>>('/prices'),

  getGame: (id: string) => json<GameInfo>(`/games/${id}`),

  joinGame: (id: string, userToken: string) =>
    json<{ playerId: string; sessionToken: string }>(`/games/${id}/join`, {
      method: 'POST',
      headers: { 'x-user-token': userToken },
    }),

  submitPredictions: (
    id: string,
    playerId: string,
    token: string,
    predictions: { intervalLabel: string; predictedPrice: number }[]
  ) =>
    json<{ ok: boolean }>(`/games/${id}/predictions`, {
      method: 'POST',
      headers: { 'x-player-id': playerId, 'x-session-token': token },
      body: JSON.stringify({ predictions }),
    }),

  getPredictions: (id: string) =>
    json<{ alias: string; interval_label: string; predicted_price: number }[]>(`/games/${id}/predictions`),

  getLeaderboard: (id: string) => json<LeaderboardEntry[]>(`/games/${id}/leaderboard`),
}
