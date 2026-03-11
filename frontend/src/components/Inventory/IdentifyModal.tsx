import { useState } from 'react'
import type { Item } from '../../types'

export function IdentifyModal({
  item,
  onConfirm,
  onClose,
}: {
  item: Item
  onConfirm: (name: string, magic: boolean) => void
  onClose: () => void
}) {
  const [name, setName] = useState(item.name)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-sm space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">Identify Item</h3>
        <p className="text-sm text-parchment-muted">Mark this item as identified. You can optionally rename it.</p>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Item Name</label>
          <input
            className="input-themed"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{ borderColor: 'rgba(139, 108, 193, 0.4)' }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name, false)}
            className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors font-heading font-semibold"
          >
            Not Magic
          </button>
          <button
            onClick={() => onConfirm(name, true)}
            className="px-4 py-2 text-parchment bg-arcane rounded-lg hover:bg-arcane-dim transition-colors font-heading font-semibold"
          >
            Magic
          </button>
        </div>
      </div>
    </div>
  )
}
