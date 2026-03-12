import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Swords, Pencil, Trash2, Plus } from 'lucide-react'
import type { CritterTemplate, Character } from '../../types'

export function RosterSidebar({
  templates,
  characters,
  onSummon,
  onEdit,
  onDelete,
  onNew,
}: {
  templates: CritterTemplate[]
  characters: Character[]
  onSummon: (templateId: number, characterId: string) => void
  onEdit: (template: CritterTemplate) => void
  onDelete: (templateId: number) => void
  onNew: () => void
}) {
  const [summonPickerId, setSummonPickerId] = useState<number | null>(null)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (summonPickerId === null) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSummonPickerId(null)
        setPickerPos(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [summonPickerId])

  const openPicker = (templateId: number) => {
    if (summonPickerId === templateId) {
      setSummonPickerId(null)
      setPickerPos(null)
      return
    }
    const btn = buttonRefs.current.get(templateId)
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + 4, left: rect.left })
    }
    setSummonPickerId(templateId)
  }

  return (
    <div className="w-56 flex-shrink-0 border-r border-border">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <h3 className="font-heading font-semibold text-parchment text-sm">Roster</h3>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gold text-base font-heading font-semibold rounded hover:bg-gold-bright transition-colors"
        >
          <Plus className="w-3 h-3" /> New
        </button>
      </div>

      <div>
        {templates.length === 0 && (
          <p className="px-3 py-4 text-sm text-parchment-muted">No blueprints yet</p>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-1 px-3 py-2 border-b border-border hover:bg-surface transition-colors group"
          >
            <span className="flex-1 text-sm text-parchment truncate">{t.name}</span>

            <button
              onClick={() => onEdit(t)}
              className="p-1 text-parchment-muted hover:text-parchment opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit blueprint"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDelete(t.id)}
              className="p-1 text-parchment-muted hover:text-wine opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete blueprint"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              ref={(el) => {
                if (el) buttonRefs.current.set(t.id, el)
              }}
              onClick={() => openPicker(t.id)}
              className="p-1 text-emerald hover:text-emerald/80 transition-colors"
              title="Summon"
            >
              <Swords className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Character picker popover via portal */}
      {summonPickerId !== null && pickerPos && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl shadow-black/30 py-1 min-w-[140px]"
          style={{ top: pickerPos.top, left: pickerPos.left }}
        >
          {characters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                onSummon(summonPickerId, ch.id)
                setSummonPickerId(null)
                setPickerPos(null)
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-parchment hover:bg-surface transition-colors"
            >
              {ch.name}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
