import { useState } from 'react'
import type { Item } from '../../types'

export function BulkSellModal({
  items,
  onConfirm,
  onClose,
}: {
  items: Item[]
  onConfirm: (sellPriceGP: number | null) => void
  onClose: () => void
}) {
  const totalValue = items.reduce((sum, i) => sum + (i.unit_value_gp ?? 0) * i.quantity, 0)
  const [sellPriceStr, setSellPriceStr] = useState(totalValue > 0 ? String(totalValue) : '')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-md space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">Bulk Sell</h3>
        <p className="text-sm text-parchment-dim">
          Selling <span className="font-semibold text-parchment">{items.length} items</span>:
        </p>

        <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-parchment-dim">
              <span>{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
              <span className="text-gold">{((item.unit_value_gp ?? 0) * item.quantity) > 0 ? `${((item.unit_value_gp ?? 0) * item.quantity).toFixed(2)} gp` : '--'}</span>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Total Sell Price (gp)</label>
          <input
            type="number"
            step="0.01"
            className="input-themed"
            value={sellPriceStr}
            onChange={(e) => setSellPriceStr(e.target.value)}
            min={0}
            autoFocus
            placeholder="0 = no coin entry"
          />
          <p className="text-xs text-parchment-muted mt-1">Proceeds go to party treasure. Leave 0 or empty to sell without coin entry.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              const price = parseFloat(sellPriceStr)
              onConfirm(price > 0 ? price : null)
            }}
            className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors"
          >
            Sell {items.length} Items
          </button>
        </div>
      </div>
    </div>
  )
}
