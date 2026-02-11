import { useEffect, useRef, useCallback, useState } from 'react'
import type { LeaderboardEntry } from '../lib/api.ts'

export type WsMessage =
  | { type: 'price'; asset: string; price: number }
  | { type: 'leaderboard'; players: LeaderboardEntry[]; checkpoint?: string }
  | { type: 'zone_change'; playerId: string; zone: string }
  | { type: 'game_status'; status: 'live' | 'ended' }

type Handlers = {
  onPrice?: (asset: string, price: number) => void
  onLeaderboard?: (players: LeaderboardEntry[], checkpoint?: string) => void
  onGameStatus?: (status: 'live' | 'ended') => void
}

export function useGameWs(
  gameId: string | undefined,
  playerId: string | undefined,
  token: string | undefined,
  handlers: Handlers
) {
  const ws = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    if (!gameId) return
    const params = new URLSearchParams({ gameId })
    if (playerId) params.set('playerId', playerId)
    if (token) params.set('token', token)

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${proto}//${location.host}/ws?${params}`)
    ws.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => {
      setConnected(false)
      setTimeout(connect, 3000)
    }
    socket.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data)
        const h = handlersRef.current
        if (msg.type === 'price') h.onPrice?.(msg.asset, msg.price)
        if (msg.type === 'leaderboard') h.onLeaderboard?.(msg.players, msg.checkpoint)
        if (msg.type === 'game_status') h.onGameStatus?.(msg.status)
      } catch { /* ignore */ }
    }
  }, [gameId, playerId, token])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return { connected }
}
