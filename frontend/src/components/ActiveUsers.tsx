import { usePresenceStore } from '../stores/usePresenceStore'
import { useAppStore } from '../stores/useAppStore'
import { getCharacterIcon } from '../constants/characterIcons'
import clsx from 'clsx'

export function ActiveUsers() {
  const activeUsers = usePresenceStore((s) => s.activeUsers)
  const currentUser = useAppStore((s) => s.user)

  if (activeUsers.length === 0) return null

  return (
    <div className="px-4 py-3 border-b border-border shrink-0">
      <div className="flex items-center">
        {activeUsers.map((u, i) => {
          const Icon = getCharacterIcon(u.icon)
          const isCurrent = currentUser?.id === u.id
          const label = u.character_name || u.username
          return (
            <div
              key={u.id}
              className={clsx(
                'group relative w-8 h-8 rounded-full flex items-center justify-center border-2 bg-surface cursor-default',
                i > 0 && '-ml-2',
                isCurrent ? 'border-gold' : 'border-border'
              )}
            >
              <Icon className={clsx('w-4 h-4', isCurrent ? 'text-gold' : 'text-parchment-dim')} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface border border-border rounded text-xs text-parchment whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-10">
                {label}
                {u.character_name && u.username !== u.character_name && (
                  <span className="text-parchment-muted ml-1">({u.username})</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
