import { useState, useCallback, useMemo, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../../hooks/useClickOutside'
import { hexWithAlpha } from '../../constants'
import type { Item, Label } from '../../types'

interface Props {
  item: Item
  allLabels: Label[]
  onSave: (itemId: number, data: Partial<Item>) => Promise<unknown>
  onClose: () => void
}

export function InlineLabelSelect({
  item,
  allLabels,
  onSave,
  onClose,
}: Props) {
  const currentLabels = item.labels ?? []
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(currentLabels.map((l) => l.id)),
  )
  const initialIds = useMemo(() => new Set(currentLabels.map((l) => l.id)), [currentLabels])
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const placeholderRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = placeholderRef.current?.parentElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
  }, [])

  const saveAndClose = useCallback(async () => {
    const changed =
      selectedIds.size !== initialIds.size ||
      [...selectedIds].some((id) => !initialIds.has(id))
    if (changed) {
      try {
        await onSave(item.id, { ...item, label_ids: [...selectedIds] })
      } catch {
        // updateItem already handles 409 toast + refetch
      }
    }
    onClose()
  }, [item, selectedIds, initialIds, onSave, onClose])

  const ref = useClickOutside<HTMLDivElement>(saveAndClose)

  const toggle = (labelId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(labelId)) next.delete(labelId)
      else next.add(labelId)
      return next
    })
  }

  const sorted = useMemo(() => [...allLabels].sort((a, b) => a.sort_order - b.sort_order), [allLabels])

  const dropdown = (
    <div
      ref={ref}
      className="bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto"
      style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, zIndex: 9999 }}
    >
      {sorted.map((label) => (
        <button
          key={label.id}
          onClick={() => toggle(label.id)}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors"
        >
          <span
            className="w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] shrink-0"
            style={{
              borderColor: selectedIds.has(label.id) ? '#c9a959' : 'rgba(160,160,184,0.3)',
              backgroundColor: selectedIds.has(label.id) ? 'rgba(201,169,89,0.2)' : 'transparent',
              color: '#c9a959',
            }}
          >
            {selectedIds.has(label.id) && '✓'}
          </span>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: hexWithAlpha(label.color, '40'), color: label.text_color || '#ffffff' }}
          >
            {label.name}
          </span>
        </button>
      ))}
      {sorted.length === 0 && (
        <div className="px-3 py-2 text-sm text-parchment-muted">No labels defined</div>
      )}
    </div>
  )

  if (!pos) {
    return <span ref={placeholderRef} className="hidden" />
  }

  return createPortal(dropdown, document.body)
}
