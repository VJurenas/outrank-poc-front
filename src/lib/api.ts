const BASE = '/api'

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
}

export type LeaderboardEntry = {
  rank: number
  player_id: string
  alias: string
  distance: number
  zone: 'gold' | 'silver' | 'dead'
}

export const api = {
  getPrices: () => json<Record<string, number | null>>('/prices'),

  getGame: (id: string) => json<GameInfo>(`/games/${id}`),

  joinGame: (id: string, alias: string) =>
    json<{ playerId: string; sessionToken: string }>(`/games/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ alias }),
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
