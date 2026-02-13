import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { updateProfile } from '../lib/api.ts'

export default function Profile() {
  const { user, updateAlias, openSignIn } = useAuth()
  const navigate = useNavigate()
  const [alias, setAlias] = useState(user?.alias ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ margin: '0 0 16px', fontSize: 22 }}>Profile</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>You need to sign in to view your profile.</p>
        <button onClick={openSignIn}>Sign In</button>
      </div>
    )
  }

  async function handleSave() {
    if (!alias.trim() || !user) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await updateProfile(user.sessionToken, alias.trim())
      updateAlias(res.alias)
      setAlias(res.alias)
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Profile</h1>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 24, marginBottom: 24,
      }}>
        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
          WALLET ADDRESS
        </label>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', marginBottom: 20 }}>
          {user.walletAddress}
        </div>

        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
          DISPLAY NAME
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={alias}
            onChange={e => { setAlias(e.target.value); setSaved(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            maxLength={32}
            style={{ flex: 1, padding: '8px 12px' }}
          />
          <button onClick={handleSave} disabled={saving || !alias.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {saved && <p style={{ color: '#5f5', fontSize: 12, margin: '8px 0 0' }}>Saved.</p>}
        {error && <p style={{ color: '#f66', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      </div>

      <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>
        ← Back
      </button>
    </div>
  )
}
