import { useState } from 'react'
import type { Item, Label } from '../../types'

type LabelAction = 'add' | 'remove' | 'none'

export function BulkLabelsModal({
  items,
  labels,
  onConfirm,
  onClose,
}: {
  items: Item[]
  labels: Label[]
  onConfirm: (addLabelIds: string[], removeLabelIds: string[]) => void
  onClose: () => void
}) {
  const [actions, setActions] = useState<Record<string, LabelAction>>(() => {
    const init: Record<string, LabelAction> = {}
    for (const l of labels) {
      init[l.id] = 'none'
    }
    return init
  })

  // Count how many selected items have each label
  const labelCounts = new Map<string, number>()
  for (const item of items) {
    for (const l of item.labels ?? []) {
      labelCounts.set(l.id, (labelCounts.get(l.id) ?? 0) + 1)
    }
  }

  const cycle = (id: string) => {
    setActions((prev) => {
      const current = prev[id] ?? 'none'
      const next: LabelAction = current === 'none' ? 'add' : current === 'add' ? 'remove' : 'none'
      return { ...prev, [id]: next }
    })
  }

  const hasChanges = Object.values(actions).some((a) => a !== 'none')
  const addIds = Object.entries(actions).filter(([, a]) => a === 'add').map(([id]) => id)
  const removeIds = Object.entries(actions).filter(([, a]) => a === 'remove').map(([id]) => id)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-md space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">Bulk Edit Labels</h3>
        <p className="text-sm text-parchment-dim">
          Editing labels on <span className="font-semibold text-parchment">{items.length} items</span>.
          Click a label to cycle: <span className="text-emerald-400">+ Add</span> / <span className="text-red-400">- Remove</span> / unchanged.
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {labels.map((label) => {
            const action = actions[label.id] ?? 'none'
            const count = labelCounts.get(label.id) ?? 0
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => cycle(label.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors text-left ${
                  action === 'add'
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : action === 'remove'
                      ? 'border-red-500/50 bg-red-500/10'
                      : 'border-border bg-surface hover:bg-card-hover'
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-sm text-parchment">{label.name}</span>
                <span className="text-xs text-parchment-muted">{count}/{items.length}</span>
                <span className={`text-xs font-heading font-semibold w-16 text-right ${
                  action === 'add' ? 'text-emerald-400' : action === 'remove' ? 'text-red-400' : 'text-parchment-muted'
                }`}>
                  {action === 'add' ? '+ Add' : action === 'remove' ? '- Remove' : '--'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button
            disabled={!hasChanges}
            onClick={() => onConfirm(addIds, removeIds)}
            className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
