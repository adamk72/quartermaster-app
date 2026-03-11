import { useState } from 'react'
import { MAX_ATTUNEMENT_SLOTS, hexWithAlpha, todayGameDate } from '../../constants'
import clsx from 'clsx'
import type { Item, Container, Label } from '../../types'

export function ItemFormModal({
  item,
  containers,
  allItems,
  labels,
  onSave,
  onClose,
}: {
  item: Partial<Item> | null
  containers: Container[]
  allItems: Item[]
  labels: Label[]
  onSave: (data: Partial<Item>) => void
  onClose: () => void
}) {
  const isNew = !item?.id
  const [form, setForm] = useState<Partial<Item>>(
    item ?? { name: '', quantity: 1, game_date: todayGameDate(), category: 'Item', sold: false, label_ids: [] }
  )
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(item?.labels?.map((l) => l.id) ?? item?.label_ids ?? [])
  )
  const [buying, setBuying] = useState(false)
  const [buyPriceStr, setBuyPriceStr] = useState('')

  const selectedContainer = containers.find((c) => c.id === form.container_id)
  const canAttune = selectedContainer?.type === 'character' && !!selectedContainer.character_id
  const attunedCount = canAttune
    ? allItems.filter((i) => i.attuned_to === selectedContainer.character_id && i.id !== item?.id).length
    : 0
  const attunementFull = attunedCount >= MAX_ATTUNEMENT_SLOTS

  const handleContainerChange = (containerId: string | null) => {
    const next = containers.find((c) => c.id === containerId)
    const shouldClearAttunement = !next || next.type !== 'character' || !next.character_id
    setForm({
      ...form,
      container_id: containerId,
      attuned_to: shouldClearAttunement ? null : form.attuned_to,
    })
  }

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev)
      if (next.has(labelId)) next.delete(labelId)
      else next.add(labelId)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Partial<Item> = { ...form, label_ids: [...selectedLabelIds] }
    if (data.attuned_to && canAttune) {
      data.attuned_to = selectedContainer.character_id
    }
    const buyPrice = parseFloat(buyPriceStr)
    if (isNew && buying && buyPrice > 0) {
      data.buy_price_gp = buyPrice
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">{item?.id ? 'Edit Item' : 'Add Item'}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-heading font-semibold text-parchment-dim">Name</label>
              {canAttune && (
                <label
                  htmlFor="attuned-check"
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-heading font-semibold cursor-pointer',
                    attunementFull && !form.attuned_to ? 'text-parchment-muted' : 'text-arcane'
                  )}
                >
                  <input
                    type="checkbox"
                    id="attuned-check"
                    checked={!!form.attuned_to}
                    disabled={attunementFull && !form.attuned_to}
                    onChange={(e) => setForm({ ...form, attuned_to: e.target.checked ? selectedContainer.character_id : null })}
                  />
                  Attuned {attunementFull && !form.attuned_to ? `(${MAX_ATTUNEMENT_SLOTS}/${MAX_ATTUNEMENT_SLOTS})` : `(${attunedCount + (form.attuned_to ? 1 : 0)}/${MAX_ATTUNEMENT_SLOTS})`}
                </label>
              )}
            </div>
            <input
              className="input-themed"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Quantity</label>
            <input
              type="number"
              className="input-themed"
              value={form.quantity ?? 1}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    selectedLabelIds.has(l.id)
                      ? 'border-transparent text-base'
                      : 'border-border text-parchment-muted hover:text-parchment hover:border-border-light bg-transparent'
                  )}
                  style={selectedLabelIds.has(l.id) ? { backgroundColor: hexWithAlpha(l.color, '40'), color: l.text_color || '#ffffff', borderColor: hexWithAlpha(l.color, '50') } : undefined}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
            <input
              className="input-themed"
              value={form.game_date ?? ''}
              onChange={(e) => setForm({ ...form, game_date: e.target.value })}
              placeholder="M/D or M/D/YY"
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Container</label>
            <select
              className="input-themed"
              value={form.container_id ?? ''}
              onChange={(e) => handleContainerChange(e.target.value || null)}
            >
              <option value="">None</option>
              {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Unit Weight (lbs)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.unit_weight_lbs ?? ''}
              onChange={(e) => setForm({ ...form, unit_weight_lbs: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Unit Value (gp)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.unit_value_gp ?? ''}
              onChange={(e) => setForm({ ...form, unit_value_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Notes</label>
            <input
              className="input-themed"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {isNew && (
            <div className="col-span-2 border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-heading font-semibold text-parchment-dim cursor-pointer">
                <input
                  type="checkbox"
                  checked={buying}
                  onChange={(e) => {
                    setBuying(e.target.checked)
                    if (e.target.checked) {
                      setBuyPriceStr(String((form.unit_value_gp ?? 0) * (form.quantity ?? 1)))
                    }
                  }}
                />
                Buying this
              </label>
              {buying && (
                <div>
                  <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Buy Price (gp)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-themed"
                    value={buyPriceStr}
                    onChange={(e) => setBuyPriceStr(e.target.value)}
                    min={0}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">
            {item?.id ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
