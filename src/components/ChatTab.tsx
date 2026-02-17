import { useState, useEffect, useRef } from 'react'
import { getChatMessages, sendChatMessage, type ChatMessage } from '../lib/api.ts'
import { useAuth } from '../contexts/AuthContext.tsx'
import UserContextMenu from './UserContextMenu.tsx'
import { SendIcon } from './Icons.tsx'

type Props = { channel: string; title: string }

type CtxMenu = { playerId: string; alias: string; x: number; y: number }

export default function ChatTab({ channel, title }: Props) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [ctx, setCtx] = useState<CtxMenu | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sinceRef = useRef(0)

  // Load history once, then start polling only after it completes.
  // Using a `cancelled` flag prevents stale async results from updating state
  // after the effect has been cleaned up (tab switch, StrictMode double-invoke).
  useEffect(() => {
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | null = null

    sinceRef.current = 0
    setMessages([])

    getChatMessages(channel)
      .then(({ messages: initial }) => {
        if (cancelled) return
        setMessages(initial)
        if (initial.length > 0) sinceRef.current = initial[initial.length - 1].id

        // Poll for new messages only after initial load settles
        pollId = setInterval(() => {
          getChatMessages(channel, sinceRef.current)
            .then(({ messages: newMsgs }) => {
              if (cancelled || newMsgs.length === 0) return
              sinceRef.current = newMsgs[newMsgs.length - 1].id
              setMessages(prev => [...prev, ...newMsgs].slice(-200))
            })
            .catch(() => {})
        }, 2000)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (pollId !== null) clearInterval(pollId)
    }
  }, [channel])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!user || !input.trim()) return
    setSending(true)
    try {
      const { message } = await sendChatMessage(channel, input.trim(), user.sessionToken)
      setMessages(prev => [...prev, message].slice(-200))
      sinceRef.current = message.id
      setInput('')
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleAliasClick(e: React.MouseEvent, msg: ChatMessage) {
    e.stopPropagation()
    setCtx({ playerId: msg.playerId, alias: msg.alias, x: e.clientX, y: e.clientY })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Channel title */}
      <div style={{ padding: '7px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {title}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.map(m => (
          <div key={m.id} style={{ padding: '3px 12px', lineHeight: 1.5 }}>
            <button
              onClick={e => handleAliasClick(e, m)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                color: m.playerId === user?.playerId ? 'var(--accent)' : 'var(--accent-2)',
                marginRight: 6,
              }}
            >
              {m.alias}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            maxLength={500}
            style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SendIcon size={14} />
          </button>
        </div>
      ) : (
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Sign in to chat
        </div>
      )}

      {ctx && (
        <UserContextMenu
          playerId={ctx.playerId}
          alias={ctx.alias}
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  )
}
