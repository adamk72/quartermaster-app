import { useEffect, useState } from 'react'
import type { CritterTemplate } from '../../types'

export function BlueprintDialog({
  template,
  onSave,
  onClose,
}: {
  template?: CritterTemplate | null
  onSave: (data: Partial<CritterTemplate>) => void
  onClose: () => void
}) {
  const isEdit = !!template?.id

  const [name, setName] = useState('')
  const [hpMax, setHpMax] = useState('')
  const [ac, setAc] = useState('10')
  const [speed, setSpeed] = useState('30')
  const [initiative, setInitiative] = useState('0')
  const [saveStr, setSaveStr] = useState('0')
  const [saveDex, setSaveDex] = useState('0')
  const [saveCon, setSaveCon] = useState('0')
  const [saveInt, setSaveInt] = useState('0')
  const [saveWis, setSaveWis] = useState('0')
  const [saveCha, setSaveCha] = useState('0')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (template) {
      setName(template.name)
      setHpMax(String(template.hp_max))
      setAc(String(template.ac))
      setSpeed(String(template.speed))
      setInitiative(String(template.initiative))
      setSaveStr(String(template.save_str))
      setSaveDex(String(template.save_dex))
      setSaveCon(String(template.save_con))
      setSaveInt(String(template.save_int))
      setSaveWis(String(template.save_wis))
      setSaveCha(String(template.save_cha))
      setNotes(template.notes ?? '')
    }
  }, [template])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...(isEdit ? { id: template.id } : {}),
      name,
      hp_max: parseInt(hpMax) || 0,
      ac: parseInt(ac) || 10,
      speed: parseInt(speed) || 30,
      initiative: parseInt(initiative) || 0,
      save_str: parseInt(saveStr) || 0,
      save_dex: parseInt(saveDex) || 0,
      save_con: parseInt(saveCon) || 0,
      save_int: parseInt(saveInt) || 0,
      save_wis: parseInt(saveWis) || 0,
      save_cha: parseInt(saveCha) || 0,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-[slideIn_0.2s_ease-out]"
      >
        <h3 className="font-heading text-lg font-semibold text-parchment">
          {isEdit ? 'Edit Blueprint' : 'New Blueprint'}
        </h3>

        {/* Name */}
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Name</label>
          <input
            className="input-themed"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Stats: HP, AC, Speed, Initiative */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">HP Max</label>
            <input
              type="number"
              className="input-themed"
              value={hpMax}
              onChange={(e) => setHpMax(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">AC</label>
            <input
              type="number"
              className="input-themed"
              value={ac}
              onChange={(e) => setAc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Speed</label>
            <input
              type="number"
              className="input-themed"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Init</label>
            <input
              type="number"
              className="input-themed"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
            />
          </div>
        </div>

        {/* Save Bonuses */}
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Save Bonuses</label>
          <div className="grid grid-cols-6 gap-2">
            {([
              ['STR', saveStr, setSaveStr],
              ['DEX', saveDex, setSaveDex],
              ['CON', saveCon, setSaveCon],
              ['INT', saveInt, setSaveInt],
              ['WIS', saveWis, setSaveWis],
              ['CHA', saveCha, setSaveCha],
            ] as const).map(([label, value, setter]) => (
              <div key={label}>
                <label className="block text-xs text-center text-parchment-muted mb-0.5">{label}</label>
                <input
                  type="number"
                  className="input-themed text-center text-sm"
                  value={value}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Notes</label>
          <textarea
            className="input-themed min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors"
          >
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
