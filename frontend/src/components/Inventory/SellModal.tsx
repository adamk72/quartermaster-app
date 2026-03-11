import { useState } from 'react'
import type { Item } from '../../types'

export function SellModal({
  item,
  onConfirm,
  onClose,
}: {
  item: Item
  onConfirm: (sellPriceGP: number | null, quantity: number) => void
  onClose: () => void
}) {
  const [quantityStr, setQuantityStr] = useState(String(item.quantity))
  const qty = parseInt(quantityStr) || item.quantity
  const defaultPrice = (item.unit_value_gp ?? 0) * qty
  const [sellPriceStr, setSellPriceStr] = useState(defaultPrice > 0 ? String(defaultPrice) : '')

  const handleQuantityChange = (val: string) => {
    setQuantityStr(val)
    const newQty = parseInt(val) || 1
    const newDefault = (item.unit_value_gp ?? 0) * newQty
    if (newDefault > 0) setSellPriceStr(String(newDefault))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-sm space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">Sell Item</h3>
        <p className="text-sm text-parchment-dim">
          Sell <span className="font-semibold text-parchment">{item.name}</span>?
        </p>

        {item.quantity > 1 && (
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Quantity to sell (of {item.quantity})</label>
            <input
              type="number"
              className="input-themed"
              value={quantityStr}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min={1}
              max={item.quantity}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Sell Price (gp)</label>
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
              const sellQty = Math.min(Math.max(parseInt(quantityStr) || item.quantity, 1), item.quantity)
              onConfirm(price > 0 ? price : null, sellQty)
            }}
            className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors"
          >
            Sell{qty < item.quantity ? ` ${qty}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
