import { useCallback } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Check } from 'lucide-react'
import type { Item, Container } from '../../types'

interface Props {
  item: Item
  containers: Container[]
  getContainerDisplayName: (container: Container) => string
  onSave: (itemId: number, data: Partial<Item>) => Promise<unknown>
  onClose: () => void
}

export function InlineContainerSelect({
  item,
  containers,
  getContainerDisplayName,
  onSave,
  onClose,
}: Props) {
  const ref = useClickOutside<HTMLDivElement>(onClose)

  const handleSelect = useCallback(
    async (containerId: string | null) => {
      if (containerId === item.container_id) {
        onClose()
        return
      }
      try {
        await onSave(item.id, { ...item, container_id: containerId })
      } catch {
        // updateItem already handles 409 toast + refetch
      }
      onClose()
    },
    [item, onSave, onClose],
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
          {c.id === item.container_id && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
          <span className={c.id === item.container_id ? 'text-gold font-medium' : 'text-parchment-dim'}>
            {getContainerDisplayName(c)}
          </span>
        </button>
      ))}
      <button
        onClick={() => handleSelect(null)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors text-parchment-muted"
      >
        {item.container_id === null && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
        <span>— None —</span>
      </button>
    </div>
  )
}
