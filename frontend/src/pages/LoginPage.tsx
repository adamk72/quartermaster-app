import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { api } from '../api/client'
import { getCharacterIcon } from '../constants/characterIcons'
import clsx from 'clsx'

interface PublicCharacter {
  id: string
  name: string
  player_name: string
  icon: string
  active: boolean
}

export function LoginPage() {
  const { login, error, clearError } = useAppStore()
  const [characters, setCharacters] = useState<PublicCharacter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingChars, setLoadingChars] = useState(true)

  useEffect(() => {
    api.get<PublicCharacter[]>('/auth/characters')
      .then((chars) => {
        setCharacters(chars)
        setLoadingChars(false)
      })
      .catch(() => setLoadingChars(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const charName = characters.find((c) => c.id === selectedId)?.name
      await login(charName ?? username, inviteCode, selectedId ?? undefined)
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false)
    }
  }

  const showPicker = characters.length > 0

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-arcane/[0.03] blur-3xl" />
      </div>

      <div className={clsx('w-full relative z-10 animate-[slideIn_0.4s_ease-out]', showPicker ? 'max-w-lg' : 'max-w-sm')}>
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gold tracking-wide">
            Quartermaster
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

          {showPicker ? (
            <>
              <div>
                <label className="block text-sm font-heading font-semibold text-parchment-dim mb-3">Choose your character</label>
                {loadingChars ? (
                  <div className="text-center text-parchment-muted py-4">Loading...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {characters.map((c) => {
                      const Icon = getCharacterIcon(c.icon)
                      const selected = selectedId === c.id
                      const taken = c.active
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={taken}
                          onClick={() => setSelectedId(selected ? null : c.id)}
                          className={clsx(
                            'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-150',
                            taken
                              ? 'border-border bg-surface/50 opacity-40 cursor-not-allowed'
                              : selected
                                ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                                : 'border-border bg-surface hover:border-border-light hover:bg-card-hover'
                          )}
                        >
                          <div className={clsx(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            selected ? 'bg-gold/20' : 'bg-card'
                          )}>
                            <Icon className={clsx('w-5 h-5', selected ? 'text-gold' : 'text-parchment-dim')} />
                          </div>
                          <div className="text-center">
                            <div className={clsx('text-sm font-heading font-bold', selected ? 'text-gold' : 'text-parchment')}>
                              {c.name}
                            </div>
                            {c.player_name && (
                              <div className="text-xs text-parchment-muted">{c.player_name}</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-themed"
                placeholder="Your name"
                required={!showPicker}
                autoFocus
              />
            </div>
          )}

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
            disabled={submitting || (showPicker && !selectedId)}
            className="w-full py-2.5 bg-gold text-base font-heading font-bold text-lg rounded-lg hover:bg-gold-bright disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-gold/10"
          >
            {submitting ? 'Entering...' : 'Enter the Vault'}
          </button>
        </form>
      </div>
    </div>
  )
}
