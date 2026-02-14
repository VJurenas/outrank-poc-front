import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import { signIn } from '../lib/api.ts'

type Step = 'select' | 'name' | 'signing' | 'error'

export default function WalletSignIn() {
  const { closeSignIn, setUser } = useAuth()
  const [step, setStep] = useState<Step>('select')
  const [alias, setAlias] = useState('')
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')

  async function connectMetaMask() {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from metamask.io.')
      setStep('error')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      setAddress(accounts[0])
      setStep('name')
    } catch {
      setError('Wallet connection rejected.')
      setStep('error')
    }
  }

  async function handleSign() {
    if (!alias.trim()) return
    setStep('signing')
    try {
      const nonce = crypto.randomUUID()
      const message = `Sign in to Outrank\n\nWallet: ${address.toLowerCase()}\nName: ${alias.trim()}\nNonce: ${nonce}`
      const signature = await window.ethereum!.request({
        method: 'personal_sign',
        params: [message, address],
      }) as string

      const user = await signIn({
        walletAddress: address,
        alias: alias.trim(),
        nonce,
        message,
        signature,
      })
      setUser(user)
      closeSignIn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('4001')) {
        setError('Signing rejected by user.')
      } else {
        setError(msg || 'Sign-in failed.')
      }
      setStep('error')
    }
  }

  return (
    <div
      onClick={closeSignIn}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 32,
          width: 360,
          maxWidth: '90vw',
        }}
      >
        {step === 'select' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Connect Wallet</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px' }}>
              Sign in with your crypto wallet to join games.
            </p>
            <button
              onClick={connectMetaMask}
              style={{
                width: '100%', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
                fontSize: 15, fontWeight: 600,
              }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                alt="MetaMask"
                width={28} height={28}
                style={{ flexShrink: 0 }}
              />
              MetaMask
            </button>
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
              More wallets coming soon
            </p>
          </>
        )}

        {step === 'name' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Choose a Name</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 8px' }}>
              Connected: <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px' }}>
              This name will be visible in leaderboards.
            </p>
            <input
              autoFocus
              value={alias}
              onChange={e => setAlias(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSign()}
              placeholder="Your display name"
              maxLength={32}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 16,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSign}
              disabled={!alias.trim()}
              style={{ width: '100%', padding: '10px 0' }}
            >
              Sign &amp; Join
            </button>
          </>
        )}

        {step === 'signing' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--muted)' }}>Check your MetaMask wallet to sign…</p>
          </div>
        )}

        {step === 'error' && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--error)' }}>Sign-in Failed</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{error}</p>
            <button onClick={() => setStep('select')} style={{ width: '100%', padding: '10px 0' }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
