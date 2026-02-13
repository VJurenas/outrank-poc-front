export const ASSETS = ['BTC', 'ETH', 'HYPE'] as const
export type Asset = typeof ASSETS[number]
