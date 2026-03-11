import { useEffect, useRef } from 'react'
import { type LucideIcon } from 'lucide-react'
import { ICON_MAP } from '../constants/characterIcons'

interface IconPickerProps {
  characterId: string
  currentIcon: string
  usedIcons: Record<string, string>  // icon name → character ID
  onSelect: (iconName: string) => void
  onClose: () => void
}

export function IconPicker({ characterId, currentIcon, usedIcons, onSelect, onClose }: IconPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const iconEntries = Object.entries(ICON_MAP) as [string, LucideIcon][]

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg p-2 shadow-lg"
    >
      <div className="text-xs text-parchment-muted uppercase tracking-wide mb-2">Choose Icon</div>
      <div className="grid grid-cols-4 gap-1.5">
        {iconEntries.map(([name, Icon]) => {
          const isCurrent = name === currentIcon
          const takenBy = usedIcons[name]
          const isTaken = takenBy && takenBy !== characterId

          return (
            <button
              key={name}
              onClick={() => { if (!isTaken) onSelect(name) }}
              disabled={!!isTaken}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                isCurrent
                  ? 'bg-gold text-base'
                  : isTaken
                    ? 'bg-surface text-parchment-muted opacity-30 cursor-not-allowed'
                    : 'bg-card hover:bg-card-hover text-parchment-dim'
              }`}
              title={isTaken ? `${name} (taken)` : name}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
