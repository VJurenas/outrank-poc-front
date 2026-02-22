import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import { getLedger, type LedgerEvent } from '../lib/api.ts'

export default function EventsBox() {
  const { user } = useAuth()
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [animatingEvents, setAnimatingEvents] = useState<Set<string>>(new Set())
  const animationQueueRef = useRef<string[]>([])

  // Fetch initial events
  useEffect(() => {
    if (!user) return
    getLedger(user.sessionToken, { limit: 15 })
      .then(data => {
        setEvents(data.events)
      })
      .catch(console.error)
  }, [user])

  // Poll for new events every 2 seconds
  useEffect(() => {
    if (!user) return

    const poll = async () => {
      try {
        // Fetch latest 15 events (full refresh)
        const data = await getLedger(user.sessionToken, { limit: 15 })

        if (data.events.length > 0) {
          // Find truly new events (not in current list)
          const newEventIds = data.events
            .filter(e => !events.some(existing => existing.id === e.id))
            .map(e => e.id)
            .reverse() // Oldest first for animation

          if (newEventIds.length > 0) {
            // Add new event IDs to animation queue
            animationQueueRef.current = [...animationQueueRef.current, ...newEventIds]
          }

          // Update the full list
          setEvents(data.events)
        }
      } catch {
        // ignore
      }
    }

    const interval = setInterval(poll, 2_000)
    return () => clearInterval(interval)
  }, [user, events])

  // Process animation queue - animate one event every 0.5s
  useEffect(() => {
    if (animationQueueRef.current.length === 0) return

    const processQueue = () => {
      const nextEventId = animationQueueRef.current.shift()
      if (nextEventId) {
        // Mark event as animating
        setAnimatingEvents(prev => new Set(prev).add(nextEventId))

        // Remove animation class after 1 second
        setTimeout(() => {
          setAnimatingEvents(prev => {
            const next = new Set(prev)
            next.delete(nextEventId)
            return next
          })
        }, 1000)
      }

      if (animationQueueRef.current.length > 0) {
        setTimeout(processQueue, 500)
      }
    }

    processQueue()
  }, [events.length]) // Trigger when events change

  if (!user) return null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Recent Events
      </div>
      <div style={{
        maxHeight: 300,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}>
        {events.length === 0 && (
          <div style={{
            padding: 16,
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 12,
          }}>
            No events yet
          </div>
        )}
        {events.map(event => {
          const isPositive = event.amount > 0
          const isAnimating = animatingEvents.has(event.id)

          // For stake/winnings/refund, show league and kickoff if available
          const showGameDetails = ['stake', 'winnings', 'refund'].includes(event.reason)
          let gameDetails = ''
          if (showGameDetails && event.asset) {
            gameDetails = event.asset
            if (event.mode) gameDetails += ` · ${event.mode}`
            if (event.kickoffAt) {
              const kickoffDate = new Date(event.kickoffAt)
              const kickoffTime = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              gameDetails += ` · ${kickoffTime}`
            }
          } else if (event.asset) {
            gameDetails = event.asset
            if (event.intervalLabel) gameDetails += ` · ${event.intervalLabel}`
          }

          return (
            <div
              key={event.id}
              style={{
                padding: '6px 12px',
                background: isAnimating ? 'var(--accent-bg)' : 'transparent',
                borderLeft: isAnimating ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.3s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text)',
                  textTransform: 'capitalize',
                }}>
                  {event.reason === 'tip' ? (isPositive ? 'Tip received' : 'Tip sent') : event.reason}
                </div>
                {gameDetails && (
                  <div style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {gameDetails}
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: isPositive ? 'var(--success-text)' : 'var(--error)',
                whiteSpace: 'nowrap',
              }}>
                {isPositive ? '+' : ''}{event.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
