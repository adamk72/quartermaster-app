import { useEffect, useRef, useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import type { Critter, Character } from '../../types'

export function CritterCard({
  critter,
  characters,
  onUpdate,
  onDismiss,
}: {
  critter: Critter
  characters: Character[]
  onUpdate: (id: number, data: Partial<Critter>) => void
  onDismiss: (id: number) => void
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [hpDelta, setHpDelta] = useState('')
  const [showOwnerPicker, setShowOwnerPicker] = useState(false)
  const ownerRef = useRef<HTMLDivElement>(null)

  const ownerName = characters.find((c) => c.id === critter.character_id)?.name ?? critter.character_id
  const displayName = `${critter.name} ${critter.instance_number}`
  const pct = critter.hp_max > 0 ? (critter.hp_current / critter.hp_max) * 100 : 0
  const hasNotes = !!critter.notes

  useEffect(() => {
    if (!showOwnerPicker) return

    const handleClickOutside = (e: MouseEvent) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target as Node)) {
        setShowOwnerPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showOwnerPicker])

  const adjustHP = (delta: number) => {
    const newHP = Math.max(0, Math.min(critter.hp_max, critter.hp_current + delta))
    onUpdate(critter.id, { ...critter, hp_current: newHP })
  }

  const applyDelta = (sign: 1 | -1) => {
    const val = parseInt(hpDelta)
    if (!val || val <= 0) return
    adjustHP(sign * val)
    setHpDelta('')
  }

  const formatSave = (val: number) => (val >= 0 ? `+${val}` : `${val}`)

  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-heading font-bold text-parchment truncate">{displayName}</span>
          <div className="relative" ref={ownerRef}>
            <button
              onClick={() => setShowOwnerPicker(!showOwnerPicker)}
              className="text-xs text-parchment-muted hover:text-parchment transition-colors truncate"
            >
              ({ownerName})
            </button>
            {showOwnerPicker && (
              <div className="absolute left-0 top-full z-40 mt-1 bg-card border border-border rounded-lg shadow-xl shadow-black/30 py-1 min-w-[140px]">
                {characters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onUpdate(critter.id, { ...critter, character_id: ch.id })
                      setShowOwnerPicker(false)
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 text-sm transition-colors',
                      ch.id === critter.character_id
                        ? 'text-gold bg-surface'
                        : 'text-parchment hover:bg-surface'
                    )}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(critter.id)}
          className="p-1 text-parchment-muted hover:text-wine transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* HP bar with +/- buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => adjustHP(-1)}
          className="px-2 py-0.5 bg-wine/15 text-wine rounded text-sm font-bold hover:bg-wine/25 transition-colors"
        >
          -
        </button>
        <div className="flex-1">
          <div className="text-center font-mono text-sm font-bold text-parchment">
            {critter.hp_current} / {critter.hp_max}
          </div>
          <div className="w-full bg-card rounded-full h-2 mt-0.5 border border-border">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                pct > 50 ? 'bg-emerald' : pct > 25 ? 'bg-amber' : 'bg-wine'
              )}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => adjustHP(1)}
          className="px-2 py-0.5 bg-emerald/15 text-emerald rounded text-sm font-bold hover:bg-emerald/25 transition-colors"
        >
          +
        </button>
      </div>

      {/* HP number input with Damage/Heal */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="input-themed text-sm w-16 text-center"
          value={hpDelta}
          onChange={(e) => setHpDelta(e.target.value)}
          placeholder="HP"
          min="0"
        />
        <button
          onClick={() => applyDelta(-1)}
          className="px-2 py-1 text-xs bg-wine/15 text-wine rounded font-semibold hover:bg-wine/25 transition-colors"
        >
          Damage
        </button>
        <button
          onClick={() => applyDelta(1)}
          className="px-2 py-1 text-xs bg-emerald/15 text-emerald rounded font-semibold hover:bg-emerald/25 transition-colors"
        >
          Heal
        </button>
      </div>

      {/* Stat badges */}
      <div className="flex gap-2 text-xs text-parchment-muted">
        <span className="px-1.5 py-0.5 bg-card rounded border border-border font-mono">AC {critter.ac}</span>
        <span className="px-1.5 py-0.5 bg-card rounded border border-border font-mono">Spd {critter.speed}</span>
        <span className="px-1.5 py-0.5 bg-card rounded border border-border font-mono">Init {formatSave(critter.initiative)}</span>
      </div>

      {/* Save bonuses */}
      <div className="grid grid-cols-6 gap-1 text-xs text-center text-parchment-muted">
        {([
          ['S', critter.save_str],
          ['D', critter.save_dex],
          ['C', critter.save_con],
          ['I', critter.save_int],
          ['W', critter.save_wis],
          ['Ch', critter.save_cha],
        ] as const).map(([label, val]) => (
          <div key={label} className="px-1 py-0.5 bg-card rounded border border-border font-mono">
            <div className="text-parchment-muted/60 text-[10px]">{label}</div>
            <div>{formatSave(val)}</div>
          </div>
        ))}
      </div>

      {/* Collapsible notes */}
      {hasNotes && (
        <div>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-parchment-muted hover:text-parchment transition-colors"
          >
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Notes
          </button>
          {showNotes && (
            <p className="mt-1 text-xs text-parchment-dim bg-card rounded border border-border p-2 whitespace-pre-wrap">
              {critter.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
