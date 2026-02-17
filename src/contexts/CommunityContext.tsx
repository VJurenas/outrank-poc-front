import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type CommunityTab = 'global' | 'game' | 'friends'

type CommunityContextValue = {
  open: boolean
  tab: CommunityTab
  gameSlug: string | null
  openTo: (tab: CommunityTab) => void
  close: () => void
  setGameSlug: (slug: string | null) => void
}

const CommunityContext = createContext<CommunityContextValue | null>(null)

const OPEN_KEY = 'community_open'

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) === 'true')
  const [tab, setTab] = useState<CommunityTab>('global')
  const [gameSlug, setGameSlug] = useState<string | null>(null)

  const openTo = useCallback((t: CommunityTab) => {
    setTab(t)
    setOpen(true)
    localStorage.setItem(OPEN_KEY, 'true')
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    localStorage.setItem(OPEN_KEY, 'false')
  }, [])

  return (
    <CommunityContext.Provider value={{ open, tab, gameSlug, openTo, close, setGameSlug }}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const ctx = useContext(CommunityContext)
  if (!ctx) throw new Error('useCommunity must be within CommunityProvider')
  return ctx
}
