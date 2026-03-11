import { useCallback } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Check } from 'lucide-react'
import type { Container, Character, Mount } from '../../types'

interface Props {
  itemId: number
  itemVersion: number
  currentContainerId: string | null
  containers: Container[]
  characters: Character[]
  mounts: Mount[]
  getContainerDisplayName: (container: Container) => string
  onSave: (itemId: number, data: { container_id: string | null; version: number }) => Promise<unknown>
  onClose: () => void
}

export function InlineContainerSelect({
  itemId,
  itemVersion,
  currentContainerId,
  containers,
  getContainerDisplayName,
  onSave,
  onClose,
}: Props) {
  const ref = useClickOutside<HTMLDivElement>(onClose)

  const handleSelect = useCallback(
    async (containerId: string | null) => {
      if (containerId === currentContainerId) {
        onClose()
        return
      }
      try {
        await onSave(itemId, { container_id: containerId, version: itemVersion })
      } catch {
        // updateItem already handles 409 toast + refetch
      }
      onClose()
    },
    [itemId, itemVersion, currentContainerId, onSave, onClose],
  )

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto"
    >
      {containers.map((c) => (
        <button
          key={c.id}
          onClick={() => handleSelect(c.id)}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors"
        >
          {c.id === currentContainerId && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
          <span className={c.id === currentContainerId ? 'text-gold font-medium' : 'text-parchment-dim'}>
            {getContainerDisplayName(c)}
          </span>
        </button>
      ))}
      <button
        onClick={() => handleSelect(null)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors text-parchment-muted"
      >
        {currentContainerId === null && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
        <span>— None —</span>
      </button>
    </div>
  )
}
