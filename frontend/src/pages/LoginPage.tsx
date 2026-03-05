import { useState } from 'react'
import { useAppStore } from '../stores/useAppStore'

export function LoginPage() {
  const { login, error, clearError } = useAppStore()
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(username, inviteCode)
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-arcane/[0.03] blur-3xl" />
      </div>

      <div className="max-w-sm w-full relative z-10 animate-[slideIn_0.4s_ease-out]">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gold tracking-wide">
            Treasure Tracker
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
            <p className="text-parchment-muted text-sm font-heading tracking-wider uppercase">Campaign Management</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
          </div>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-2xl shadow-black/20">
          {/* Decorative top edge */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent -mt-px" />

          {error && (
            <div className="bg-wine/15 text-wine border border-wine/20 px-4 py-2.5 rounded-lg text-sm" onClick={clearError}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-themed"
              placeholder="Your name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1.5">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-themed"
              placeholder="Enter invite code"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gold text-base font-heading font-bold text-lg rounded-lg hover:bg-gold-bright disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-gold/10"
          >
            {submitting ? 'Entering...' : 'Enter the Vault'}
          </button>
        </form>
      </div>
    </div>
  )
}
