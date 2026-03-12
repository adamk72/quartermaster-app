import { useEffect, useRef, useState } from 'react'
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
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (summonPickerId === null) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSummonPickerId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [summonPickerId])

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

      <div className="overflow-y-auto">
        {templates.length === 0 && (
          <p className="px-3 py-4 text-sm text-parchment-muted">No blueprints yet</p>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className="relative flex items-center gap-1 px-3 py-2 border-b border-border hover:bg-surface transition-colors group"
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
              onClick={() => setSummonPickerId(summonPickerId === t.id ? null : t.id)}
              className="p-1 text-emerald hover:text-emerald/80 transition-colors"
              title="Summon"
            >
              <Swords className="w-3.5 h-3.5" />
            </button>

            {/* Character picker popover */}
            {summonPickerId === t.id && (
              <div
                ref={popoverRef}
                className="absolute right-0 top-full z-40 mt-1 bg-card border border-border rounded-lg shadow-xl shadow-black/30 py-1 min-w-[140px]"
              >
                {characters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSummon(t.id, ch.id)
                      setSummonPickerId(null)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-parchment hover:bg-surface transition-colors"
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
